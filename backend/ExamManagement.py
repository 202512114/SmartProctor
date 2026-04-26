from flask import Blueprint, request, jsonify, current_app
from utils import token_required
from bson import ObjectId
from datetime import datetime, timedelta

exam_bp = Blueprint("exam_bp", __name__)


def next_id(collection, prefix, field_name):
    db = current_app.mongo.db

    docs = list(
        db[collection]
        .find({field_name: {"$regex": f"^{prefix}"}})
        .sort(field_name, -1)
        .limit(1)
    )

    if not docs:
        return f"{prefix}001"

    last_id = str(docs[0].get(field_name, f"{prefix}000"))

    try:
        num = int(last_id.replace(prefix, ""))
    except Exception:
        num = 0

    return f"{prefix}{num + 1:03}"


def parse_datetime(date_value):
    if not date_value:
        return None

    if isinstance(date_value, datetime):
        return date_value

    value = str(date_value).strip()
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", ""))
    except Exception:
        pass

    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d"
    ]

    for fmt in formats:
        try:
            return datetime.strptime(value, fmt)
        except Exception:
            continue

    return None


def calculate_status(scheduled_at, duration_minutes):
    start_time = parse_datetime(scheduled_at)
    if not start_time:
        return "upcoming"

    try:
        minutes = int(duration_minutes)
    except Exception:
        minutes = 30

    if minutes <= 0:
        minutes = 30

    end_time = start_time + timedelta(minutes=minutes)
    now = datetime.now()

    if now < start_time:
        return "upcoming"
    elif start_time <= now <= end_time:
        return "live"
    else:
        return "completed"


def get_logged_in_admin(db, current_user):
    if not current_user:
        return None

    if current_user.get("role") != "admin":
        return None

    token_id = current_user.get("id")
    user_doc = None

    if token_id:
        try:
            user_doc = db.users.find_one({"_id": ObjectId(token_id)})
        except Exception:
            user_doc = None

    if not user_doc and current_user.get("_id"):
        try:
            user_doc = db.users.find_one({"_id": ObjectId(str(current_user.get("_id")) )})
        except Exception:
            user_doc = None

    if not user_doc and current_user.get("email"):
        user_doc = db.users.find_one({"email": current_user.get("email")})

    if not user_doc:
        return None

    mongo_user_id_str = str(user_doc.get("_id"))
    custom_user_id = user_doc.get("user_id")

    admin_doc = db.admins.find_one({"user_id": mongo_user_id_str}, {"_id": 0})
    if not admin_doc and custom_user_id:
        admin_doc = db.admins.find_one({"user_id": custom_user_id}, {"_id": 0})

    if not admin_doc:
        return None

    return {
        "mongo_user_id": mongo_user_id_str,
        "user_id": custom_user_id,
        "admin_id": admin_doc.get("admin_id"),
        "role": user_doc.get("role")
    }


def get_exam_owner_filter(admin_info, exam_id=None):
    owner_values = []

    if admin_info.get("admin_id"):
        owner_values.append(admin_info.get("admin_id"))
    if admin_info.get("user_id"):
        owner_values.append(admin_info.get("user_id"))
    if admin_info.get("mongo_user_id"):
        owner_values.append(admin_info.get("mongo_user_id"))

    owner_values = [value for value in owner_values if value]

    owner_filter = {"created_by": {"$in": owner_values}}

    if exam_id:
        owner_filter["exam_id"] = exam_id

    return owner_filter


def sync_exam_status(db, exam):
    new_status = calculate_status(
        exam.get("scheduled_at"),
        exam.get("duration_minutes", 30)
    )

    if exam.get("status") != new_status:
        db.exams.update_one(
            {"exam_id": exam.get("exam_id")},
            {"$set": {"status": new_status}}
        )
        exam["status"] = new_status

    return exam


def serialize_exam(exam):
    return {
        "exam_id": exam.get("exam_id", ""),
        "title": exam.get("title", ""),
        "subject": exam.get("subject", ""),
        "duration_minutes": exam.get("duration_minutes", 0),
        "total_marks": exam.get("total_marks", 0),
        "scheduled_at": exam.get("scheduled_at", ""),
        "created_by": exam.get("created_by", ""),
        "status": exam.get("status", "upcoming")
    }


@exam_bp.route("", methods=["GET"])
@token_required
def get_exams():
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        admin_info = get_logged_in_admin(db, current_user)
        if not admin_info:
            return jsonify({"message": "Only admin can view exams"}), 403

        exams = list(db.exams.find(get_exam_owner_filter(admin_info), {"_id": 0}))

        final_exams = []
        for exam in exams:
            synced_exam = sync_exam_status(db, exam)
            final_exams.append(serialize_exam(synced_exam))

        final_exams.sort(key=lambda x: str(x.get("scheduled_at", "")), reverse=True)

        return jsonify({"exams": final_exams}), 200

    except Exception as e:
        print("GET EXAMS ERROR:", e)
        return jsonify({"message": f"Server error while loading exams: {str(e)}"}), 500


@exam_bp.route("/<exam_id>", methods=["GET"])
@token_required
def get_exam_details(exam_id):
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        admin_info = get_logged_in_admin(db, current_user)
        if not admin_info:
            return jsonify({"message": "Only admin can view exam details"}), 403

        exam = db.exams.find_one(get_exam_owner_filter(admin_info, exam_id), {"_id": 0})

        if not exam:
            return jsonify({"message": "Exam not found or access denied"}), 404

        exam = sync_exam_status(db, exam)
        questions = list(db.questions.find({"exam_id": exam_id}, {"_id": 0}))

        return jsonify({
            "exam": serialize_exam(exam),
            "questions": questions
        }), 200

    except Exception as e:
        print("GET EXAM DETAILS ERROR:", e)
        return jsonify({"message": f"Server error while loading exam details: {str(e)}"}), 500


@exam_bp.route("", methods=["POST"])
@token_required
def create_exam():
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        admin_info = get_logged_in_admin(db, current_user)
        if not admin_info:
            return jsonify({"message": "Only admin can create exams"}), 403

        if not admin_info.get("admin_id"):
            return jsonify({"message": "Admin profile not found"}), 404

        data = request.get_json(silent=True) or {}

        title = str(data.get("title", "")).strip()
        subject = str(data.get("subject", "")).strip()
        duration_minutes = data.get("duration_minutes")
        total_marks = data.get("total_marks")
        scheduled_at = str(data.get("scheduled_at", "")).strip()
        questions = data.get("questions", [])

        if not title or not subject or not scheduled_at:
            return jsonify({"message": "Please fill all exam details"}), 400

        try:
            duration_minutes = int(duration_minutes)
        except Exception:
            return jsonify({"message": "Duration must be a valid number"}), 400

        try:
            total_marks = int(total_marks)
        except Exception:
            return jsonify({"message": "Total marks must be a valid number"}), 400

        if duration_minutes <= 0:
            return jsonify({"message": "Duration must be greater than 0"}), 400

        if total_marks <= 0:
            return jsonify({"message": "Total marks must be greater than 0"}), 400

        parsed_scheduled = parse_datetime(scheduled_at)
        if not parsed_scheduled:
            return jsonify({"message": "Invalid scheduled date and time"}), 400

        if not isinstance(questions, list) or len(questions) == 0:
            return jsonify({"message": "At least one question is required"}), 400

        validated_questions = []
        for index, q in enumerate(questions):
            question_text = str(q.get("question_text", "")).strip()
            option_a = str(q.get("option_a", "")).strip()
            option_b = str(q.get("option_b", "")).strip()
            option_c = str(q.get("option_c", "")).strip()
            option_d = str(q.get("option_d", "")).strip()
            correct_option = str(q.get("correct_option", "A")).strip()
            marks = q.get("marks", 1)

            if not question_text or not option_a or not option_b or not option_c or not option_d:
                return jsonify({"message": f"Please complete all fields for question {index + 1}"}), 400

            try:
                marks = int(marks)
            except Exception:
                return jsonify({"message": f"Marks must be valid for question {index + 1}"}), 400

            if marks <= 0:
                return jsonify({"message": f"Marks must be greater than 0 for question {index + 1}"}), 400

            if correct_option not in ["A", "B", "C", "D"]:
                return jsonify({"message": f"Correct option must be A, B, C or D for question {index + 1}"}), 400

            validated_questions.append({
                "question_text": question_text,
                "option_a": option_a,
                "option_b": option_b,
                "option_c": option_c,
                "option_d": option_d,
                "correct_option": correct_option,
                "marks": marks
            })

        exam_id = next_id("exams", "E", "exam_id")
        status = calculate_status(scheduled_at, duration_minutes)

        exam_doc = {
            "exam_id": exam_id,
            "title": title,
            "subject": subject,
            "duration_minutes": duration_minutes,
            "total_marks": total_marks,
            "scheduled_at": scheduled_at,
            "created_by": admin_info.get("admin_id"),
            "status": status
        }

        db.exams.insert_one(exam_doc)

        for q in validated_questions:
            question_id = next_id("questions", "Q", "question_id")
            db.questions.insert_one({
                "question_id": question_id,
                "exam_id": exam_id,
                "question_text": q["question_text"],
                "option_a": q["option_a"],
                "option_b": q["option_b"],
                "option_c": q["option_c"],
                "option_d": q["option_d"],
                "correct_option": q["correct_option"],
                "marks": q["marks"]
            })

        notif_id = next_id("notifications", "N", "notif_id")
        db.notifications.insert_one({
            "notif_id": notif_id,
            "exam_id": exam_id,
            "message": f"New exam '{title}' has been created.",
            "sent_at": datetime.now().isoformat(),
            "is_read": False
        })

        return jsonify({
            "message": "Exam created successfully",
            "exam_id": exam_id
        }), 201

    except Exception as e:
        print("CREATE EXAM ERROR:", e)
        return jsonify({"message": f"Server error while creating exam: {str(e)}"}), 500


@exam_bp.route("/<exam_id>", methods=["PUT"])
@token_required
def update_exam(exam_id):
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        admin_info = get_logged_in_admin(db, current_user)
        if not admin_info:
            return jsonify({"message": "Only admin can update exams"}), 403

        existing_exam = db.exams.find_one(get_exam_owner_filter(admin_info, exam_id))
        if not existing_exam:
            return jsonify({"message": "Exam not found or access denied"}), 404

        data = request.get_json(silent=True) or {}

        title = str(data.get("title", "")).strip()
        subject = str(data.get("subject", "")).strip()
        duration_minutes = data.get("duration_minutes")
        total_marks = data.get("total_marks")
        scheduled_at = str(data.get("scheduled_at", "")).strip()
        questions = data.get("questions", [])

        if not title or not subject or not scheduled_at:
            return jsonify({"message": "Please fill all exam details"}), 400

        try:
            duration_minutes = int(duration_minutes)
        except Exception:
            return jsonify({"message": "Duration must be a valid number"}), 400

        try:
            total_marks = int(total_marks)
        except Exception:
            return jsonify({"message": "Total marks must be a valid number"}), 400

        if duration_minutes <= 0:
            return jsonify({"message": "Duration must be greater than 0"}), 400

        if total_marks <= 0:
            return jsonify({"message": "Total marks must be greater than 0"}), 400

        parsed_scheduled = parse_datetime(scheduled_at)
        if not parsed_scheduled:
            return jsonify({"message": "Invalid scheduled date and time"}), 400

        if not isinstance(questions, list) or len(questions) == 0:
            return jsonify({"message": "At least one question is required"}), 400

        validated_questions = []
        for index, q in enumerate(questions):
            question_text = str(q.get("question_text", "")).strip()
            option_a = str(q.get("option_a", "")).strip()
            option_b = str(q.get("option_b", "")).strip()
            option_c = str(q.get("option_c", "")).strip()
            option_d = str(q.get("option_d", "")).strip()
            correct_option = str(q.get("correct_option", "A")).strip()
            marks = q.get("marks", 1)

            if not question_text or not option_a or not option_b or not option_c or not option_d:
                return jsonify({"message": f"Please complete all fields for question {index + 1}"}), 400

            try:
                marks = int(marks)
            except Exception:
                return jsonify({"message": f"Marks must be valid for question {index + 1}"}), 400

            if marks <= 0:
                return jsonify({"message": f"Marks must be greater than 0 for question {index + 1}"}), 400

            if correct_option not in ["A", "B", "C", "D"]:
                return jsonify({"message": f"Correct option must be A, B, C or D for question {index + 1}"}), 400

            validated_questions.append({
                "question_text": question_text,
                "option_a": option_a,
                "option_b": option_b,
                "option_c": option_c,
                "option_d": option_d,
                "correct_option": correct_option,
                "marks": marks
            })

        status = calculate_status(scheduled_at, duration_minutes)

        db.exams.update_one(
            get_exam_owner_filter(admin_info, exam_id),
            {
                "$set": {
                    "title": title,
                    "subject": subject,
                    "duration_minutes": duration_minutes,
                    "total_marks": total_marks,
                    "scheduled_at": scheduled_at,
                    "status": status
                }
            }
        )

        db.questions.delete_many({"exam_id": exam_id})

        for q in validated_questions:
            question_id = next_id("questions", "Q", "question_id")
            db.questions.insert_one({
                "question_id": question_id,
                "exam_id": exam_id,
                "question_text": q["question_text"],
                "option_a": q["option_a"],
                "option_b": q["option_b"],
                "option_c": q["option_c"],
                "option_d": q["option_d"],
                "correct_option": q["correct_option"],
                "marks": q["marks"]
            })

        return jsonify({"message": "Exam updated successfully"}), 200

    except Exception as e:
        print("UPDATE EXAM ERROR:", e)
        return jsonify({"message": f"Server error while updating exam: {str(e)}"}), 500


@exam_bp.route("/<exam_id>", methods=["DELETE"])
@token_required
def delete_exam(exam_id):
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        admin_info = get_logged_in_admin(db, current_user)
        if not admin_info:
            return jsonify({"message": "Only admin can delete exams"}), 403

        existing_exam = db.exams.find_one(get_exam_owner_filter(admin_info, exam_id))
        if not existing_exam:
            return jsonify({"message": "Exam not found or access denied"}), 404

        db.exams.delete_one(get_exam_owner_filter(admin_info, exam_id))
        db.questions.delete_many({"exam_id": exam_id})

        return jsonify({"message": "Exam deleted successfully"}), 200

    except Exception as e:
        print("DELETE EXAM ERROR:", e)
        return jsonify({"message": f"Server error while deleting exam: {str(e)}"}), 500
