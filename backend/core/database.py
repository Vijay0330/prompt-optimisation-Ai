from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import os

_client: Optional[AsyncIOMotorClient] = None


async def connect_db():
    """Called on FastAPI startup — creates the Motor client."""
    global _client
    uri = os.getenv("MONGODB_URI", "")
    if not uri:
        raise RuntimeError("MONGODB_URI environment variable is not set.")
    _client = AsyncIOMotorClient(uri)
    # Ping to verify connection
    await _client.admin.command("ping")
    print("[MongoDB] Connected successfully.")


async def close_db():
    """Called on FastAPI shutdown — closes the Motor client."""
    global _client
    if _client:
        _client.close()
        print("[MongoDB] Connection closed.")


def get_database():
    """Returns the main database handle. Used as a FastAPI dependency."""
    if _client is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    db_name = os.getenv("MONGODB_DB_NAME", "promptai")
    return _client[db_name]
