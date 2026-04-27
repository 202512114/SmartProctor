from flask import Blueprint, jsonify, request, current_app
from utils import token_required

proctoring_bp = Blueprint("proctoring", __name__)


@proctoring_bp.route("/", methods=["GET"])
@token_required
def get_logs():
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        role = current_user.get("role")
        user_id = current_user.get("user_id")

        logs_data = []

        # if role == "student":
        #     student = db.students.find_one({"user_id": user_id})
        #     if not student:
        #         return jsonify({"logs": []}), 200

        #     student_id = student.get("student_id")

        #     attempts = list(db.exam_attempts.find({"student_id": student_id}))
        #     exam_ids = list({a.get("exam_id") for a in attempts if a.get("exam_id")})

        #     logs_cursor = db.proctoring_logs.find({
        #         "exam_id": {"$in": exam_ids}
        #     }).sort("detected_at", -1)

        if role == "admin" or role == "student":
            logs_cursor = db.proctoring_logs.find().sort("detected_at", -1)

        else:
            return jsonify({"logs": []}), 200

        for log in logs_cursor:
            exam_id = log.get("exam_id", "")
            exam = db.exams.find_one({"exam_id": exam_id})

            exam_title = exam.get("title", f"Exam {exam_id}") if exam else f"Exam {exam_id}"

            student_name = "Student"

            if role == "student":
                student = db.students.find_one({"user_id": user_id})
                if student:
                    user = db.users.find_one({"user_id": student.get("user_id")})
                    if user:
                        student_name = user.get("name", "Student")
            else:
                attempt = db.exam_attempts.find_one({"exam_id": exam_id})
                if attempt:
                    student = db.students.find_one({"student_id": attempt.get("student_id")})
                    if student:
                        user = db.users.find_one({"user_id": student.get("user_id")})
                        if user:
                            student_name = user.get("name", "Student")

            logs_data.append({
                "log_id": log.get("log_id", ""),
                "student_name": student_name,
                "exam_id": exam_id,
                "exam_title": exam_title,
                "event_type": log.get("event_type", ""),
                "severity": str(log.get("severity", "low")).lower(),
                "detected_at": log.get("detected_at", ""),
                "snapshot_url": log.get("snapshot_url", ""),
                "is_reviewed": log.get("is_reviewed", False)
            })

        return jsonify({"logs": logs_data}), 200

    except Exception as e:
        print("PROCTORING ERROR:", e)
        return jsonify({"message": "Server error"}), 500