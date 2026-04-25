from fastapi import WebSocket
from typing import List
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # Convert datetime objects or other non-serializable elements to string if any
        json_msg = json.dumps(message, default=str)
        for connection in self.active_connections:
            try:
                await connection.send_text(json_msg)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")
                # We could remove the connection here if needed

manager = ConnectionManager()
