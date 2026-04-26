from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from utils import token_required

profile_bp = Blueprint("profile", __name__)


def _to_object_id(value):
    try:
        return ObjectId(value)
    except Exception:
        return None


@profile_bp.route("", methods=["GET"])
@token_required
def get_profile():
    try:
        db = current_app.mongo.db
        current_user = getattr(request, "current_user", None)

        if not current_user:
            return jsonify({"message": "Unauthorized"}), 401

        user_id = str(current_user.get("user_id", ""))
        role = current_user.get("role", "")
        created_at = current_user.get("createdAt") or current_user.get("created_at")

        joined = ""
        if created_at:
            try:
                joined = created_at.strftime("%B %Y")
            except Exception:
                joined = str(created_at)

        profile_data = {
            "id": user_id,
            "name": current_user.get("name", ""),
            "email": current_user.get("email", ""),
            "role": role,
            "avatar": current_user.get("avatar", ""),
            "joined": joined,
            "statusLabel": "Active Student" if role == "student" else "Active Admin",
            "studentId": "",
            "department": "",
            "semester": "",
            "profilePhoto": "",
            "designation": "",
            "privilegeLevel": "",
            "lastExam": "",
            "performance": "",
            "examsTaken": 0,
            "avgScore": "0%",
            "warnings": 0
        }

        if role == "student":
            student = db.students.find_one({"user_id": user_id})

            if student:
                profile_data["studentId"] = student.get("student_id", "")
                profile_data["department"] = student.get("department", "")
                profile_data["semester"] = student.get("semester", "")
                profile_data["profilePhoto"] = student.get("profile_photo", "")

                student_id = student.get("student_id", "")

                profile_data["examsTaken"] = db.exam_attempts.count_documents({
                    "student_id": student_id
                })

                results_cursor = list(db.results.find({"student_id": student_id}))
                if results_cursor:
                    total_percentage = sum(r.get("percentage", 0) for r in results_cursor)
                    avg_percentage = total_percentage / len(results_cursor)
                    profile_data["avgScore"] = f"{round(avg_percentage)}%"

                    if avg_percentage >= 75:
                        profile_data["performance"] = "Excellent"
                    elif avg_percentage >= 60:
                        profile_data["performance"] = "Good"
                    elif avg_percentage >= 40:
                        profile_data["performance"] = "Average"
                    else:
                        profile_data["performance"] = "Needs Improvement"

                latest_attempt = db.exam_attempts.find_one(
                    {"student_id": student_id},
                    sort=[("start_time", -1)]
                )

                if latest_attempt:
                    attempt_id = latest_attempt.get("attempt_id", "")
                    exam_id = latest_attempt.get("exam_id", "")

                    exam = db.exams.find_one({"exam_id": exam_id})
                    if exam:
                        profile_data["lastExam"] = exam.get("title", "")

                    profile_data["warnings"] = db.proctoring_logs.count_documents({
                        "attempt_id": attempt_id
                    })

        elif role == "admin":
            admin = db.admins.find_one({"user_id": user_id})

            if admin:
                profile_data["designation"] = admin.get("designation", "")
                profile_data["privilegeLevel"] = admin.get("privilege_level", "")

            profile_data["examsTaken"] = db.exams.count_documents({"created_by": user_id})

            profile_data["warnings"] = db.notifications.count_documents({"is_read": False})

            admin_exams = list(db.exams.find({"created_by": user_id}))
            exam_ids = [exam.get("exam_id", "") for exam in admin_exams]

            if exam_ids:
                results_cursor = list(db.results.find({"exam_id": {"$in": exam_ids}}))
                if results_cursor:
                    total_percentage = sum(r.get("percentage", 0) for r in results_cursor)
                    avg_percentage = total_percentage / len(results_cursor)
                    profile_data["avgScore"] = f"{round(avg_percentage)}%"
                profile_data["performance"] = "Admin Access"

        return jsonify(profile_data), 200

    except Exception as e:
        print("GET PROFILE ERROR:", e)
        return jsonify({"message": "Server error while loading profile"}), 500


@profile_bp.route("", methods=["PUT"])
@token_required
def update_profile():
    try:
        db = current_app.mongo.db
        current_user = getattr(request, "current_user", None)

        if not current_user:
            return jsonify({"message": "Unauthorized"}), 401

        user_id = str(current_user.get("_id", ""))
        role = current_user.get("role", "")
        data = request.get_json(force=True)

        user_update = {
            "name": data.get("name", current_user.get("name", "")),
            "email": data.get("email", current_user.get("email", "")),
            "avatar": data.get("avatar", current_user.get("avatar", ""))
        }

        db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": user_update}
        )

        if role == "student":
            student_update = {
                "student_id": data.get("studentId", ""),
                "department": data.get("department", ""),
                "semester": data.get("semester", ""),
                "profile_photo": data.get("profilePhoto", "")
            }

            existing_student = db.students.find_one({"user_id": user_id})

            if existing_student:
                db.students.update_one(
                    {"user_id": user_id},
                    {"$set": student_update}
                )
            else:
                db.students.insert_one({
                    "user_id": user_id,
                    "student_id": data.get("studentId", ""),
                    "enrollment_no": None,
                    "department": data.get("department", ""),
                    "semester": data.get("semester", ""),
                    "profile_photo": data.get("profilePhoto", "")
                })

        elif role == "admin":
            admin_update = {
                "designation": data.get("designation", ""),
                "privilege_level": data.get("privilegeLevel", "")
            }

            existing_admin = db.admins.find_one({"user_id": user_id})

            if existing_admin:
                db.admins.update_one(
                    {"user_id": user_id},
                    {"$set": admin_update}
                )
            else:
                db.admins.insert_one({
                    "user_id": user_id,
                    "admin_id": "",
                    "designation": data.get("designation", ""),
                    "privilege_level": data.get("privilegeLevel", "")
                })

        updated_user = db.users.find_one({"_id": current_user["_id"]})

        return jsonify({
            "message": "Profile updated successfully",
            "user": {
                "id": str(updated_user["_id"]),
                "name": updated_user.get("name", ""),
                "email": updated_user.get("email", ""),
                "role": updated_user.get("role", ""),
                "avatar": updated_user.get("avatar", "")
            }
        }), 200

    except Exception as e:
        print("UPDATE PROFILE ERROR:", e)
        return jsonify({"message": "Server error while saving profile"}), 500