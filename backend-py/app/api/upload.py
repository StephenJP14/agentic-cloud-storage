# app/api/upload.py
import os
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.postgres import get_db
from app.db.minio_client import minio_client, bucket_name
from app.services.ingest_service import ingest_file

router = APIRouter(tags=["Uploads"])

def process_ingestion(file_path: str, filename: str):
    print(f"🔄 Background: Starting ingestion for {filename}...")
    try:
        # Call your existing ingestion logic
        ingest_file(file_path) 
        print(f"✅ Background: Ingestion complete for {filename}")
    except Exception as e:
        print(f"❌ Background Ingestion failed: {e}")
    finally:
        # Cleanup temp file
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/upload/")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Paste your existing upload logic here
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
            file.file, 
            length=file_size,
            content_type=file.content_type
        )
        
        # 2. Save to Temp File for Ingestion Service
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, file.filename)
        
        with open(temp_path, "wb") as f:
            f.write(file_content)

        # 3. Trigger Background Task
        # The API responds immediately, Python works in background
        background_tasks.add_task(process_ingestion, temp_path, file.filename)

        return {
            "status": "success", 
            "message": "File uploaded. AI processing started.",
            "filename": file.filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))