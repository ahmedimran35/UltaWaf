import asyncio
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def read_root():
    return {"message": "Hello World"}

@app.get("/test")
async def test_endpoint():
    await asyncio.sleep(1)  # Simulate some async work
    return {"message": "Test endpoint"}

if __name__ == "__main__":
    import uvicorn
    print("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8001)