import time
from db.postgres import engine
from fastapi import FastAPI, UploadFile, File, Depends, Response, APIRouter, HTTPException
from sqlalchemy.orm import Session
import io
from fastapi.middleware.cors import CORSMiddleware
from db.postgres import get_db
from db.minio_client import minio_client, bucket_name
from db.qdrant_client import qdrant_client
from db.redis_client import redis_client

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload/")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # 1. Read file content
    file_content = await file.read()
    file_size = len(file_content)

    # 2. Upload to MinIO (Object Storage)
    minio_client.put_object(
        bucket_name,
        file.filename,
        io.BytesIO(file_content),
        length=file_size,
        content_type=file.content_type
    )

    # 3. Cache the upload event in Redis
    redis_client.setex(f"last_upload:{file.filename}", 3600, "uploaded")

    # 4. Mock Metadata for Postgres/Qdrant
    # In a real app, you'd create a SQLAlchemy model here
    # and use qdrant_client.upsert to store vectors.

    return {
        "status": "success",
        "filename": file.filename,
        "storage": "minio",
        "cached": True,
        "db_verified": True
    }


@app.get("/files/")
async def list_files():
    try:
        # Check if bucket exists first
        if not minio_client.bucket_exists(bucket_name):
            return {"files": []}

        # List objects in the bucket
        objects = minio_client.list_objects(bucket_name, recursive=True)

        file_list = []
        for obj in objects:
            file_list.append({
                "name": obj.object_name,
                "size": obj.size,
                "last_modified": obj.last_modified.isoformat(),
                "is_dir": obj.is_dir,
                "content_type": obj.content_type
            })

        return {"files": file_list}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/files/download/{file_name}")
async def get_file_url(file_name: str):
    """Generates a temporary URL to view/download the file"""
    try:
        # URL expires in 1 hour (3600 seconds)
        url = minio_client.get_presigned_url(
            "GET",
            bucket_name,
            file_name,
            expires=timedelta(seconds=3600),
        )
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=404, detail="File not found")


@app.get("/stats")
async def get_stats():
    # Example using Redis to show it's working
    keys = redis_client.keys("last_upload:*")
    return {"total_recent_uploads": len(keys)}


@app.get("/health")
async def health_check(response: Response):
    health_status = {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {}
    }

    # 1. Check Postgres
    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
        health_status["services"]["postgres"] = "online"
    except Exception as e:
        health_status["services"]["postgres"] = f"offline: {str(e)}"
        health_status["status"] = "unhealthy"

    # 2. Check Redis
    try:
        redis_client.ping()
        health_status["services"]["redis"] = "online"
    except Exception as e:
        health_status["services"]["redis"] = f"offline: {str(e)}"
        health_status["status"] = "unhealthy"

    # 3. Check MinIO
    try:
        minio_client.bucket_exists(bucket_name)
        health_status["services"]["minio"] = "online"
    except Exception as e:
        health_status["services"]["minio"] = f"offline: {str(e)}"
        health_status["status"] = "unhealthy"

    # 4. Check Qdrant
    try:
        # Get basic info about the collection to verify connection
        qdrant_client.get_collections()
        health_status["services"]["qdrant"] = "online"
    except Exception as e:
        health_status["services"]["qdrant"] = f"offline: {str(e)}"
        health_status["status"] = "unhealthy"

    # Set status code to 503 if any service is down
    if health_status["status"] == "unhealthy":
        response.status_code = 503

    return health_status

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
