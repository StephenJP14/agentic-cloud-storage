from fastapi import FastAPI, UploadFile, File

app = FastAPI()

@app.get("/")
async def ping():
    return 'pong'

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    # You can access metadata here
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size_in_bytes": file.size # Note: .size might not be available in all versions immediately without reading, but generic metadata is.
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)