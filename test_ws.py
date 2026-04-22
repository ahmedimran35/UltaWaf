#!/usr/bin/env python3
import asyncio, json, sys
import websockets

async def main():
    uri = "ws://localhost:8000/ws"
    try:
        async with websockets.connect(uri) as websocket:
            # subscribe to alerts and stats
            await websocket.send(json.dumps({"type": "subscribe", "channels": ["stats", "alerts"]}))
            # Listen for a few messages
            for _ in range(5):
                msg = await websocket.recv()
                print("Received:", msg)
    except Exception as e:
        print("WebSocket error:", e, file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
