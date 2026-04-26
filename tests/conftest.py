"""
conftest.py - Shared fixtures for SmartProctor test suite
JWT-based auth (Bearer token), MongoDB backend, Flask on port 5000
"""
import pytest
import requests

BASE_URL = "http://127.0.0.1:5000"

# These users must exist in your MongoDB smartproctor.users collection
ADMIN_EMAIL = "admin@test.com"
ADMIN_PASSWORD = "admin123"

STUDENT_EMAIL = "student@test.com"
STUDENT_PASSWORD = "student123"


def get_token(email, password, role):
    """Login and return JWT token."""
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password, "selectedRole": role}
    )
    if resp.status_code == 200:
        return resp.json().get("token")
    return None


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def admin_token():
    token = get_token(ADMIN_EMAIL, ADMIN_PASSWORD, "admin")
    assert token is not None, (
        f"Admin login failed. Make sure user {ADMIN_EMAIL} exists in MongoDB."
    )
    return token


@pytest.fixture(scope="session")
def student_token():
    token = get_token(STUDENT_EMAIL, STUDENT_PASSWORD, "student")
    assert token is not None, (
        f"Student login failed. Make sure user {STUDENT_EMAIL} exists in MongoDB."
    )
    return token


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def student_headers(student_token):
    return {"Authorization": f"Bearer {student_token}"}


@pytest.fixture
def no_auth_headers():
    return {"Authorization": "Bearer invalidtoken123"}
