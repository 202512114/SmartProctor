from flask import Blueprint, jsonify, request, current_app
from utils import token_required

student_bp = Blueprint("student_bp", __name__)


@student_bp.route("", methods=["GET"])
@token_required
def get_students():
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        if current_user.get("role") != "admin":
            return jsonify({"message": "Only admin can view students"}), 403

        students = list(db.students.find({}, {"_id": 0}))

        student_list = []
        for student in students:
            user = db.users.find_one(
                {"user_id": student.get("user_id")},
                {"_id": 0, "name": 1, "email": 1}
            )

            student_list.append({
                "student_id": student.get("student_id"),
                "user_id": student.get("user_id"),
                "name": user.get("name") if user else "",
                "email": user.get("email") if user else "",
                "enrollment_no": student.get("enrollment_no", ""),
                "department": student.get("department", ""),
                "semester": student.get("semester", ""),
                "profile_photo": student.get("profile_photo", "")
            })

        return jsonify({"students": student_list}), 200

    except Exception as e:
        print("GET STUDENTS ERROR:", e)
        return jsonify({"message": "Server error while loading students"}), 500


@student_bp.route("/<student_id>", methods=["DELETE"])
@token_required
def delete_student(student_id):
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        if current_user.get("role") != "admin":
            return jsonify({"message": "Only admin can delete students"}), 403

        student = db.students.find_one({"student_id": student_id})

        if not student:
            return jsonify({"message": "Student not found"}), 404

        user_id = student.get("user_id")

        db.notifications.delete_many({"student_id": student_id})
        db.results.delete_many({"student_id": student_id})

        attempts = list(db.exam_attempts.find({"student_id": student_id}, {"_id": 0, "attempt_id": 1}))
        attempt_ids = [a.get("attempt_id") for a in attempts if a.get("attempt_id")]

        if attempt_ids:
            db.answers.delete_many({"attempt_id": {"$in": attempt_ids}})
            db.proctoring_logs.delete_many({"attempt_id": {"$in": attempt_ids}})

        db.exam_attempts.delete_many({"student_id": student_id})
        db.students.delete_one({"student_id": student_id})

        if user_id:
            db.users.delete_one({"user_id": user_id})

        return jsonify({"message": "Student deleted successfully"}), 200

    except Exception as e:
        print("DELETE STUDENT ERROR:", e)
        return jsonify({"message": "Server error while deleting student"}), 500