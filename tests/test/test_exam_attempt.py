"""
test_exam_attempt.py - Tests for /api/exam-list routes
Matches ExamList.py blueprint registered at /api/exam-list

Routes tested:
  GET  /api/exam-list               → list all exams for student
  GET  /api/exam-list/<exam_id>     → get exam details + start attempt
  POST /api/exam-list/<exam_id>/submit   → submit answers
  POST /api/exam-list/<exam_id>/warning  → save proctoring warning
  GET  /api/exam-list/<exam_id>/result   → get student result
"""
import pytest
import requests

BASE_URL = "http://127.0.0.1:5000"


class TestExamList:

    def test_student_can_get_exam_list(self, student_headers):
        """GET /api/exam-list returns list of exams."""
        resp = requests.get(f"{BASE_URL}/api/exam-list", headers=student_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "exams" in data
        assert isinstance(data["exams"], list)

    def test_exam_list_without_token(self):
        """Unauthenticated request returns 401."""
        resp = requests.get(f"{BASE_URL}/api/exam-list")
        assert resp.status_code == 401

    def test_exam_list_each_item_has_required_fields(self, student_headers):
        """Each exam in the list has required fields."""
        resp = requests.get(f"{BASE_URL}/api/exam-list", headers=student_headers)
        if resp.status_code == 200:
            exams = resp.json().get("exams", [])
            for exam in exams:
                for field in ["id", "title", "subject", "duration", "status"]:
                    assert field in exam, f"Missing field '{field}' in exam: {exam}"


class TestExamDetails:

    def test_get_exam_details_nonexistent(self, student_headers):
        """Requesting details for a non-existent exam returns 404."""
        resp = requests.get(
            f"{BASE_URL}/api/exam-list/DOESNOTEXIST999",
            headers=student_headers
        )
        assert resp.status_code == 404

    def test_get_exam_details_without_token(self):
        """Getting exam details without token returns 401."""
        resp = requests.get(f"{BASE_URL}/api/exam-list/EX001")
        assert resp.status_code == 401

    def test_get_live_exam_returns_questions(self, student_headers):
        """
        For a live exam, questions are returned without correct_option.
        Skips if no live exam exists in DB.
        """
        list_resp = requests.get(f"{BASE_URL}/api/exam-list", headers=student_headers)
        if list_resp.status_code != 200:
            pytest.skip("Could not fetch exam list")

        exams = list_resp.json().get("exams", [])
        live_exams = [e for e in exams if e.get("status") == "live"]

        if not live_exams:
            pytest.skip("No live exams available to test")

        exam_id = live_exams[0]["id"]
        resp = requests.get(
            f"{BASE_URL}/api/exam-list/{exam_id}",
            headers=student_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "questions" in data
        assert "attempt_id" in data

        # Correct option must NOT be exposed to student
        for q in data["questions"]:
            assert "correct_option" not in q, \
                "correct_option must not be sent to student!"

    def test_non_live_exam_is_blocked(self, student_headers):
        """
        Attempting to access an upcoming/completed exam returns 403.
        Skips if no non-live exam exists.
        """
        list_resp = requests.get(f"{BASE_URL}/api/exam-list", headers=student_headers)
        if list_resp.status_code != 200:
            pytest.skip("Could not fetch exam list")

        exams = list_resp.json().get("exams", [])
        non_live = [e for e in exams if e.get("status") != "live" and not e.get("hasResult")]

        if not non_live:
            pytest.skip("No non-live exams available")

        exam_id = non_live[0]["id"]
        resp = requests.get(
            f"{BASE_URL}/api/exam-list/{exam_id}",
            headers=student_headers
        )
        assert resp.status_code == 403


class TestExamSubmission:

    def test_submit_exam_valid_answers(self, student_headers):
        """
        Submitting answers for a live exam returns result with score.
        Skips if no live exam available.
        """
        list_resp = requests.get(f"{BASE_URL}/api/exam-list", headers=student_headers)
        if list_resp.status_code != 200:
            pytest.skip("Could not fetch exam list")

        exams = list_resp.json().get("exams", [])
        live_exams = [e for e in exams if e.get("status") == "live" and not e.get("hasResult")]

        if not live_exams:
            pytest.skip("No live unsubmitted exam available")

        exam_id = live_exams[0]["id"]
        detail_resp = requests.get(
            f"{BASE_URL}/api/exam-list/{exam_id}",
            headers=student_headers
        )
        if detail_resp.status_code != 200:
            pytest.skip("Could not fetch exam details")

        questions = detail_resp.json().get("questions", [])
        answers = [
            {"question_id": q["question_id"], "selected_option": "A"}
            for q in questions
        ]

        resp = requests.post(
            f"{BASE_URL}/api/exam-list/{exam_id}/submit",
            json={"answers": answers},
            headers=student_headers
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "result" in data
        result = data["result"]
        for field in ["total_score", "percentage", "grade", "exam_id"]:
            assert field in result

    def test_submit_exam_invalid_format(self, student_headers):
        """Submitting answers in wrong format returns 400."""
        resp = requests.post(
            f"{BASE_URL}/api/exam-list/EX001/submit",
            json={"answers": "not_a_list"},
            headers=student_headers
        )
        assert resp.status_code in (400, 404)

    def test_submit_exam_without_token(self):
        """Submitting without token returns 401."""
        resp = requests.post(
            f"{BASE_URL}/api/exam-list/EX001/submit",
            json={"answers": []}
        )
        assert resp.status_code == 401

    def test_double_submission_blocked(self, student_headers):
        """
        Submitting an already-submitted exam returns 409.
        Only runs if a completed exam with result exists.
        """
        list_resp = requests.get(f"{BASE_URL}/api/exam-list", headers=student_headers)
        if list_resp.status_code != 200:
            pytest.skip("Could not fetch exam list")

        exams = list_resp.json().get("exams", [])
        completed = [e for e in exams if e.get("hasResult")]

        if not completed:
            pytest.skip("No completed exams to test double submission")

        exam_id = completed[0]["id"]
        resp = requests.post(
            f"{BASE_URL}/api/exam-list/{exam_id}/submit",
            json={"answers": []},
            headers=student_headers
        )
        assert resp.status_code == 409


class TestExamResult:

    def test_get_result_for_completed_exam(self, student_headers):
        """
        Student can get result for a completed exam.
        Skips if no completed exam.
        """
        list_resp = requests.get(f"{BASE_URL}/api/exam-list", headers=student_headers)
        if list_resp.status_code != 200:
            pytest.skip("Could not fetch exam list")

        exams = list_resp.json().get("exams", [])
        completed = [e for e in exams if e.get("hasResult")]

        if not completed:
            pytest.skip("No completed exams")

        exam_id = completed[0]["id"]
        resp = requests.get(
            f"{BASE_URL}/api/exam-list/{exam_id}/result",
            headers=student_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "result" in data
        result = data["result"]
        for field in ["percentage", "grade", "total_score"]:
            assert field in result

    def test_get_result_nonexistent_exam(self, student_headers):
        """Getting result for non-existent exam returns 404."""
        resp = requests.get(
            f"{BASE_URL}/api/exam-list/DOESNOTEXIST999/result",
            headers=student_headers
        )
        assert resp.status_code == 404

    def test_get_result_without_token(self):
        """Getting result without token returns 401."""
        resp = requests.get(f"{BASE_URL}/api/exam-list/EX001/result")
        assert resp.status_code == 401
