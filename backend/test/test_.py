import pytest
import pytest_asyncio
import asyncio
from httpx import AsyncClient
import random

BASE_URL = "http://localhost:5000"


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(base_url=BASE_URL) as ac:
        yield ac


@pytest.mark.asyncio
async def test_multiple_logins(client):

    # 🔥 create users first (important)
    users = []
    for i in range(5):
        email = f"user{i}_{random.randint(1000,9999)}@gmail.com"
        users.append(email)

        await client.post("/api/auth/register", json={
            "name": "User",
            "email": email,
            "password": "123456",
            "role": "student"
        })

    # 🔹 login function
    async def login_user(email):
        return await client.post("/api/auth/login", json={
            "email": email,
            "password": "123456",
            "selectedRole": "student"
        })

    # 🔹 run concurrent logins
    tasks = [login_user(email) for email in users]
    responses = await asyncio.gather(*tasks)

    # ✅ all should succeed
    assert all(r.status_code == 200 for r in responses)