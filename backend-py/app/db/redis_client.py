# db/redis_client.py

import os
import redis
from dotenv import load_dotenv

load_dotenv()

# Get IP from .env (Your Windows IP), fallback to localhost if missing
REDIS_HOST = os.getenv("WINDOWS_IP", "localhost")
REDIS_PORT = 6379

# Create the connection pool
redis_client = redis.Redis(
    host=REDIS_HOST, 
    port=REDIS_PORT, 
    db=0, 
    decode_responses=True
)

def get_redis_client():
    return redis_client