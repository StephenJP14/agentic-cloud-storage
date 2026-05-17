from minio import Minio
import os
from dotenv import load_dotenv

load_dotenv()

MINIO_HOST = "36.94.111.114"
MINIO_PORT = os.getenv("MINIO_PORT", "9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "admin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "password123")

minio_client = Minio(
    f"{MINIO_HOST}:{MINIO_PORT}",
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False
)

# Ensure bucket exists
bucket_name = "uploads"
if not minio_client.bucket_exists(bucket_name):
    minio_client.make_bucket(bucket_name)