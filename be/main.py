import os
import shutil
import time
from datetime import timedelta
from typing import Optional

# FastAPI Imports
from fastapi import FastAPI, UploadFile, File, Depends, Response, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

# DB Imports
from db.postgres import engine, get_db
from db.minio_client import minio_client, bucket_name
from db.qdrant_client import qdrant_client
from db.redis_client import redis_client

# AI Imports (From your app folder)
from app.ingest_service import ingest_file
from app.agent import workflow, REDIS_URL
from langgraph.checkpoint.redis import RedisSaver
from langchain_core.messages import HumanMessage

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# DATA MODELS
# ---------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default_thread"

class ChatResponse(BaseModel):
    response: str

# ---------------------------------------------------------
# STARTUP EVENT (Initialize Redis Indices)
# ---------------------------------------------------------
@app.on_event("startup")
def startup_event():
    """Ensures Redis Search Indices are created when API starts."""
    try:
        print("⚙️ Startup: Verifying Redis Indices...")
        with RedisSaver.from_conn_string(REDIS_URL) as checkpointer:
            checkpointer.setup()
        print("✅ Redis Indices Ready.")
    except Exception as e:
        print(f"⚠️ Warning: Redis setup failed (might already exist): {e}")

# ---------------------------------------------------------
# ENDPOINTS
# ---------------------------------------------------------

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Talk to the AI Agent.
    - Uses LangGraph for logic.
    - Uses Redis for persistent memory (thread_id).
    """
    try:
        # 1. Initialize Redis Checkpointer per request
        with RedisSaver.from_conn_string(REDIS_URL) as checkpointer:
            
            # 2. Compile the Graph
            agent_app = workflow.compile(checkpointer=checkpointer)
            
            # 3. Prepare Config (Memory Key)
            config = {"configurable": {"thread_id": request.thread_id}}
            
            # 4. Invoke the Agent
            # We use .invoke() instead of .stream() for HTTP Request/Response
            result = agent_app.invoke(
                {"messages": [HumanMessage(content=request.message)]},
                config=config
            )
            
            # 5. Extract Last AI Message
            last_message = result["messages"][-1].content
            return {"response": last_message}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload/")
async def upload_file(
    background_tasks: BackgroundTasks, # <--- Added for async processing
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Uploads file to MinIO and triggers AI Ingestion in background.
    """
    try:
        # 1. Save to MinIO
        file_content = await file.read()
        file_size = len(file_content)
        
        # Reset cursor before reading again or saving
        await file.seek(0)
        
        minio_client.put_object(
            bucket_name,
            file.filename,
            file.file, # Using file object directly
            length=file_size,
            content_type=file.content_type
        )
        
        # 2. Save to Temp File for Ingestion
        # (ingest_service needs a file path, not bytes)
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, file.filename)
        
        with open(temp_path, "wb") as f:
            f.write(file_content)

        # 3. Trigger Background Task (Ingest Pipeline)
        # This runs AFTER the response is sent to the user
        background_tasks.add_task(process_ingestion, temp_path, file.filename)

        return {
            "status": "success", 
            "message": "File uploaded. AI processing started.",
            "filename": file.filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Helper function for background task
def process_ingestion(file_path: str, filename: str):
    print(f"🔄 Background: Starting ingestion for {filename}...")
    try:
        # Call your existing ingestion logic
        ingest_file(file_path) 
        print(f"✅ Background: Ingestion complete for {filename}")
    except Exception as e:
        print(f"❌ Background: Ingestion failed: {e}")
    finally:
        # Cleanup temp file
        if os.path.exists(file_path):
            os.remove(file_path)

@app.get("/files/")
async def list_files():
    try:
        if not minio_client.bucket_exists(bucket_name):
            return {"files": []}
        objects = minio_client.list_objects(bucket_name, recursive=True)
        return {"files": [{"name": o.object_name, "size": o.size} for o in objects]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "online", "service": "FastAPI Agent"}

if __name__ == "__main__":
    import uvicorn
    # Allow access from all IPs so Mac can connect
    uvicorn.run(app, host="0.0.0.0", port=8000)