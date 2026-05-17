# app/api/chat.py
import json
import time
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.redis import RedisSaver

from app.models.schemas import ChatRequest, ChatResponse
from app.services.agent import workflow, llm, build_rag_prompt
from app.core.config import REDIS_URL

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    Server-Sent Events endpoint. Streams pipeline status updates 
    followed by token-by-token answer generation.
    """
    def generate():
        try:
            with RedisSaver.from_conn_string(REDIS_URL) as checkpointer:
                agent_app = workflow.compile(checkpointer=checkpointer)
                config = {"configurable": {"thread_id": request.thread_id}}
                
                # --- Phase 1: Run pipeline (guardrail → router → expand → search → grade dll) ---
                pipeline_state = {}
                for update in agent_app.stream(
                    {"messages": [HumanMessage(content=request.message)]},
                    config=config,
                    stream_mode="updates"
                ):
                    node_name = list(update.keys())[0]
                    if node_name == "__end__":
                        continue
                    node_data = list(update.values())[0]
                    pipeline_state.update(node_data)
                    yield f"data: {json.dumps({'status': node_name})}\n\n"
                
                # Ambil status guardrail dan context dari eksekusi graf terakhir
                is_topic_allowed = pipeline_state.get("is_topic_allowed", True)
                context = pipeline_state.get("context", "chitchat")
                messages = pipeline_state.get("messages", [])
                
                yield f"data: {json.dumps({'status': 'generating'})}\n\n"
                
                # --- Phase 2: Stream the answer token-by-token ---
                
                # KONDISI 1: Terkena Guardrail (Blokir Luar Topik) atau Node yang menghasilkan teks jadi (summarize / service_capture)
                if not is_topic_allowed or context in ["summarize", "service_capture"]:
                    if messages:
                        final_text = messages[-1].content
                        # Simulasikan streaming token berbasis spasi agar UI tetap interaktif dan smooth
                        for word in final_text.split(" "):
                            yield f"data: {json.dumps({'token': word + ' '})}\n\n"
                            time.sleep(0.01)
                    else:
                        yield f"data: {json.dumps({'token': 'Terjadi kesalahan sistem dalam memproses respons.'})}\n\n"
                    
                    yield f"data: {json.dumps({'done': True, 'citations': []})}\n\n"
                
                # KONDISI 2: Masuk ke Jalur Pencarian RAG Dokumen Manual (Vectorstore)
                elif context == "vectorstore":
                    docs = pipeline_state.get("filtered_docs", [])
                    
                    if not docs:
                        yield f"data: {json.dumps({'token': 'Maaf, tidak ada informasi relevan di dalam dokumen yang diunggah.'})}\n\n"
                        yield f"data: {json.dumps({'done': True, 'citations': []})}\n\n"
                        return
                    
                    prompt = build_rag_prompt(docs, request.message)
                    for chunk in llm.stream([HumanMessage(content=prompt)]):
                        if chunk.content:
                            yield f"data: {json.dumps({'token': chunk.content})}\n\n"
                    
                    citations = []
                    for d in docs:
                        citations.append({
                            "filename": d.metadata.get("filename", ""),
                            "source_type": d.metadata.get("source_type", ""),
                            "file_url": d.metadata.get("file_url", ""),
                        })
                    yield f"data: {json.dumps({'done': True, 'citations': citations})}\n\n"
                
                # KONDISI 3: Chitchat Standar Zyrex — stream langsung dari LLM
                else:
                    for chunk in llm.stream([HumanMessage(content=request.message)]):
                        if chunk.content:
                            yield f"data: {json.dumps({'token': chunk.content})}\n\n"
                    yield f"data: {json.dumps({'done': True, 'citations': []})}\n\n"
                    
        except Exception as e:
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Non-streaming endpoint.
    """
    try:
        with RedisSaver.from_conn_string(REDIS_URL) as checkpointer:
            agent_app = workflow.compile(checkpointer=checkpointer)
            config = {"configurable": {"thread_id": request.thread_id}}
            
            result = agent_app.invoke(
                {"messages": [HumanMessage(content=request.message)]},
                config=config
            )
            
            is_topic_allowed = result.get("is_topic_allowed", True)
            context = result.get("context", "chitchat")
            messages = result.get("messages", [])
            
            # Jika diblokir guardrail atau merupakan node ber-output teks baku
            if not is_topic_allowed or context in ["summarize", "service_capture"]:
                final_text = messages[-1].content if messages else "Gagal mengambil respons."
                return {"response": final_text, "citations": []}
                
            elif context == "vectorstore":
                docs = result.get("filtered_docs", [])
                if not docs:
                    return {"response": "Maaf, tidak ada informasi relevan di dalam dokumen yang diunggah.", "citations": []}
                
                prompt = build_rag_prompt(docs, request.message)
                response = llm.invoke([HumanMessage(content=prompt)])
                
                citations = [
                    {"filename": d.metadata.get("filename", ""), "source_type": d.metadata.get("source_type", "")}
                    for d in docs
                ]
                return {"response": response.content, "citations": citations}
                
            else:
                response = llm.invoke([HumanMessage(content=request.message)])
                return {"response": response.content, "citations": []}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))