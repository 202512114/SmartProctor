"""
test_auth.py - Tests for /api/auth/login and /api/auth/register and /api/auth/me
Matches Login.py blueprint registered at /api/auth
"""
import pytest
import requests

BASE_URL = "http://127.0.0.1:5000"


class TestLogin:

    def test_login_valid_admin(self):
        """Valid admin credentials return a token."""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "admin123",
            "selectedRole": "admin"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"

    def test_login_valid_student(self):
        """Valid student credentials return a token."""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "student@test.com",
            "password": "student123",
            "selectedRole": "student"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["role"] == "student"

    def test_login_wrong_password(self):
        """Wrong password returns 400 with error message."""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "wrongpassword"
        })
        assert resp.status_code == 400
        assert "invalid password" in resp.json().get("message", "").lower()

    def test_login_nonexistent_user(self):
        """Unknown email returns 400."""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "ghost_xyz_123@nowhere.com",
            "password": "pass"
        })
        assert resp.status_code == 400
        assert "not found" in resp.json().get("message", "").lower()

    def test_login_missing_fields(self):
        """Missing email/password returns 400."""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={})
        assert resp.status_code == 400
        assert "required" in resp.json().get("message", "").lower()

    def test_login_wrong_role(self):
        """Student trying to login as admin returns 403."""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "student@test.com",
            "password": "student123",
            "selectedRole": "admin"
        })
        assert resp.status_code == 403
        assert "wrong role" in resp.json().get("message", "").lower()

    def test_login_returns_user_fields(self):
        """Login response includes all required user fields."""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@test.com",
            "password": "admin123",
            "selectedRole": "admin"
        })
        assert resp.status_code == 200
        user = resp.json().get("user", {})
        for field in ["id", "name", "email", "role"]:
            assert field in user, f"Missing field: {field}"


class TestRegister:

    def test_register_new_student(self):
        """New student registration returns 201 with token."""
        import time
        unique_email = f"newstudent_{int(time.time())}@test.com"
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Test Student",
            "email": unique_email,
            "password": "test123",
            "role": "student"
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "token" in data
        assert data["user"]["role"] == "student"

    def test_register_duplicate_email(self):
        """Registering with an existing email returns 400."""
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Duplicate",
            "email": "admin@test.com",
            "password": "test123",
            "role": "admin"
        })
        assert resp.status_code == 400
        assert "exists" in resp.json().get("message", "").lower()

    def test_register_missing_name(self):
        """Registration without name returns 400."""
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "noname@test.com",
            "password": "test123",
            "role": "student"
        })
        assert resp.status_code == 400


class TestMe:

    def test_me_with_valid_token(self, admin_headers):
        """GET /api/auth/me returns current user info."""
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "email" in data
        assert "role" in data

    def test_me_without_token(self):
        """GET /api/auth/me without token returns 401."""
        resp = requests.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 401

    def test_me_with_invalid_token(self, no_auth_headers):
        """GET /api/auth/me with bad token returns 401."""
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=no_auth_headers)
        assert resp.status_code == 401
