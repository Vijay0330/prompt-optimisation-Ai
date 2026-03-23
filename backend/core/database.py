from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
import os

_client: Optional[AsyncIOMotorClient] = None


async def connect_db():
    """Called on FastAPI startup — creates the Motor async client."""
    global _client
    uri = os.getenv("MONGODB_URI", "")
    if not uri:
        raise RuntimeError("MONGODB_URI environment variable is not set.")

    # Motor / PyMongo connection options
    # - tls=True                 : MongoDB Atlas always requires TLS
    # - tlsAllowInvalidCertificates: handles SSL cert issues on some cloud
    #   environments (Render, Railway etc) where the system CA store may
    #   not include MongoDB's intermediate cert
    # - serverSelectionTimeoutMS : fail fast (20s) instead of hanging 30s
    # - connectTimeoutMS         : TCP connect timeout
    # - socketTimeoutMS          : per-operation timeout
    # - retryWrites=true         : Atlas default, ensures write safety
    _client = AsyncIOMotorClient(
        uri,
        tls=True,
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=20000,
        connectTimeoutMS=10000,
        socketTimeoutMS=20000,
        retryWrites=True,
    )

    # Verify connection with ping — wrapped in try/except so a transient
    # Atlas hiccup at startup doesn't crash the entire process
    try:
        await _client.admin.command("ping")
        print("[MongoDB] Connected successfully.")
    except Exception as e:
        print(f"[MongoDB] Warning: ping failed ({e}). Will retry on first request.")


async def close_db():
    global _client
    if _client:
        _client.close()
        print("[MongoDB] Connection closed.")


def get_database():
    if _client is None:
        raise RuntimeError("Database not connected. Call connect_db() first.")
    db_name = os.getenv("MONGODB_DB_NAME", "AI")
    return _client[db_name]
