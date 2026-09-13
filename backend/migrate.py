import asyncio
import os
import sys

# Add backend to path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN password_hash TEXT;"))
            print("Added password_hash to users")
        except Exception as e:
            print(f"Error adding password_hash (might exist): {e}")

        try:
            await conn.execute(text("ALTER TABLE users DROP COLUMN interests;"))
            print("Dropped interests from users")
        except Exception as e:
            print(f"Error dropping interests from users: {e}")

        try:
            await conn.execute(text("ALTER TABLE waiting_queue DROP COLUMN interests;"))
            print("Dropped interests from waiting_queue")
        except Exception as e:
            print(f"Error dropping interests from waiting_queue: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())

