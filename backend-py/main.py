# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langgraph.checkpoint.redis import RedisSaver

from app.api import chat, upload
from app.core.config import REDIS_URL
from app.db.minio_client import minio_client, bucket_name

app = FastAPI(title="Agentic AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(chat.router)
app.include_router(upload.router)

@app.on_event("startup")
def startup_event():
    try:
        print("⚙️ Startup: Verifying Redis Indices...")
        with RedisSaver.from_conn_string(REDIS_URL) as checkpointer:
            checkpointer.setup()
        print("✅ Redis Indices Ready.")
    except Exception as e:
        print(f"⚠️ Redis Setup Note: {e}")

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
    uvicorn.run(app, host="0.0.0.0", port=8000)