from flask import Blueprint, jsonify, request, current_app
from utils import token_required

results_bp = Blueprint("results", __name__)


@results_bp.route("/", methods=["GET"])
@token_required
def get_results():
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        role = current_user.get("role", "")
        user_id = current_user.get("user_id", "")

        results_data = []
        activity_logs = []

        if role == "student":
            student = db.students.find_one({"user_id": user_id})
            if not student:
                return jsonify({"results": [], "activity_logs": []}), 200

            student_id = student.get("student_id", "")

            results_cursor = db.results.find(
                {"student_id": student_id}
            ).sort("generated_at", -1)

        elif role == "admin":
            results_cursor = db.results.find().sort("generated_at", -1)

        else:
            return jsonify({"results": [], "activity_logs": []}), 200

        for result in results_cursor:
            student_id = result.get("student_id", "")
            exam_id = result.get("exam_id", "")
            attempt_id = result.get("attempt_id", "")

            student_doc = db.students.find_one({"student_id": student_id})
            exam_doc = db.exams.find_one({"exam_id": exam_id})
            user_doc = None

            if student_doc:
                user_doc = db.users.find_one({"user_id": student_doc.get("user_id", "")})

            warnings = db.proctoring_logs.count_documents({"attempt_id": attempt_id})

            results_data.append({
                "result_id": result.get("result_id", ""),
                "attempt_id": attempt_id,
                "student_id": student_id,
                "student_name": user_doc.get("name", "Student") if user_doc else "Student",
                "exam_id": exam_id,
                "exam_title": exam_doc.get("title", f"Exam {exam_id}") if exam_doc else f"Exam {exam_id}",
                "total_score": result.get("total_score", 0),
                "percentage": result.get("percentage", 0),
                "grade": result.get("grade", ""),
                "generated_at": result.get("generated_at", ""),
                "warnings": warnings,
                "total_marks": exam_doc.get("total_marks", 100) if exam_doc else 100
            })

        if role == "student":
            student = db.students.find_one({"user_id": user_id})
            student_id = student.get("student_id", "") if student else ""

            attempt_ids = [r.get("attempt_id", "") for r in results_data]
            logs_cursor = db.proctoring_logs.find({"attempt_id": {"$in": attempt_ids}}).sort("detected_at", -1)

        else:
            logs_cursor = db.proctoring_logs.find().sort("detected_at", -1)

        for log in logs_cursor:
            attempt_id = log.get("attempt_id", "")
            attempt_doc = db.exam_attempts.find_one({"attempt_id": attempt_id})

            exam_title = "Exam"
            student_name = "Student"

            if attempt_doc:
                exam_doc = db.exams.find_one({"exam_id": attempt_doc.get("exam_id", "")})
                if exam_doc:
                    exam_title = exam_doc.get("title", "Exam")

                student_doc = db.students.find_one({"student_id": attempt_doc.get("student_id", "")})
                if student_doc:
                    user_doc = db.users.find_one({"user_id": student_doc.get("user_id", "")})
                    if user_doc:
                        student_name = user_doc.get("name", "Student")

            activity_logs.append({
                "log_id": log.get("log_id", ""),
                "student_name": student_name,
                "exam_title": exam_title,
                "type": log.get("event_type", ""),
                "message": log.get("event_type", "").replace("_", " ").title(),
                "severity": str(log.get("severity", "low")).lower(),
                "time": log.get("detected_at", "")
            })

        return jsonify({
            "results": results_data,
            "activity_logs": activity_logs
        }), 200

    except Exception as e:
        print("GET RESULTS ERROR:", e)
        return jsonify({"message": "Server error while loading results"}), 500