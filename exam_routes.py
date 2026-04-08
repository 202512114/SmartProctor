from flask import Blueprint, request, jsonify, current_app
from utils import token_required

exam_bp = Blueprint("exam_bp", __name__)


def next_id(collection, prefix, field_name):
    last_doc = current_app.mongo.db[collection].find_one(sort=[(field_name, -1)])
    if not last_doc or not last_doc.get(field_name):
        return f"{prefix}001"

    last_id = last_doc[field_name]
    try:
        num = int(last_id.replace(prefix, ""))
    except Exception:
        num = 0
    return f"{prefix}{num + 1:03}"


@exam_bp.route("", methods=["GET"])
@token_required
def get_exams():
    try:
        db = current_app.mongo.db
        exams = list(db.exams.find({}, {"_id": 0}))

        exam_list = []
        for exam in exams:
            question_count = db.questions.count_documents({"exam_id": exam["exam_id"]})
            exam_list.append({
                **exam,
                "question_count": question_count
            })

        return jsonify({"exams": exam_list}), 200

    except Exception as e:
        print("GET EXAMS ERROR:", e)
        return jsonify({"message": "Server error while loading exams"}), 500


@exam_bp.route("/<exam_id>", methods=["GET"])
@token_required
def get_exam_details(exam_id):
    try:
        db = current_app.mongo.db
        exam = db.exams.find_one({"exam_id": exam_id}, {"_id": 0})

        if not exam:
            return jsonify({"message": "Exam not found"}), 404

        questions = list(db.questions.find({"exam_id": exam_id}, {"_id": 0}))

        return jsonify({
            "exam": exam,
            "questions": questions
        }), 200

    except Exception as e:
        print("GET EXAM DETAILS ERROR:", e)
        return jsonify({"message": "Server error while loading exam details"}), 500


@exam_bp.route("", methods=["POST"])
@token_required
def create_exam():
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        if current_user.get("role") != "admin":
            return jsonify({"message": "Only admin can create exams"}), 403

        data = request.get_json(force=True)

        title = data.get("title")
        subject = data.get("subject")
        duration_minutes = data.get("duration_minutes")
        total_marks = data.get("total_marks")
        scheduled_at = data.get("scheduled_at")
        status = data.get("status", "upcoming")
        questions = data.get("questions", [])

        if not title or not subject or not duration_minutes or not total_marks or not scheduled_at:
            return jsonify({"message": "Missing exam details"}), 400

        if not questions or len(questions) == 0:
            return jsonify({"message": "At least one question is required"}), 400

        exam_id = next_id("exams", "E", "exam_id")

        exam_doc = {
            "exam_id": exam_id,
            "title": title,
            "subject": subject,
            "duration_minutes": int(duration_minutes),
            "total_marks": int(total_marks),
            "scheduled_at": scheduled_at,
            "created_by": current_user.get("user_id"),
            "status": status
        }

        db.exams.insert_one(exam_doc)

        for q in questions:
            question_id = next_id("questions", "Q", "question_id")
            question_doc = {
                "question_id": question_id,
                "exam_id": exam_id,
                "question_text": q.get("question_text", ""),
                "option_a": q.get("option_a", ""),
                "option_b": q.get("option_b", ""),
                "option_c": q.get("option_c", ""),
                "option_d": q.get("option_d", ""),
                "correct_option": q.get("correct_option", "A"),
                "marks": int(q.get("marks", 1))
            }
            db.questions.insert_one(question_doc)

        return jsonify({"message": "Exam created successfully", "exam_id": exam_id}), 201

    except Exception as e:
        print("CREATE EXAM ERROR:", e)
        return jsonify({"message": "Server error while creating exam"}), 500


@exam_bp.route("/<exam_id>", methods=["PUT"])
@token_required
def update_exam(exam_id):
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        if current_user.get("role") != "admin":
            return jsonify({"message": "Only admin can update exams"}), 403

        exam = db.exams.find_one({"exam_id": exam_id})
        if not exam:
            return jsonify({"message": "Exam not found"}), 404

        data = request.get_json(force=True)

        title = data.get("title")
        subject = data.get("subject")
        duration_minutes = data.get("duration_minutes")
        total_marks = data.get("total_marks")
        scheduled_at = data.get("scheduled_at")
        status = data.get("status", "upcoming")
        questions = data.get("questions", [])

        db.exams.update_one(
            {"exam_id": exam_id},
            {
                "$set": {
                    "title": title,
                    "subject": subject,
                    "duration_minutes": int(duration_minutes),
                    "total_marks": int(total_marks),
                    "scheduled_at": scheduled_at,
                    "status": status
                }
            }
        )

        db.questions.delete_many({"exam_id": exam_id})

        for q in questions:
            question_id = next_id("questions", "Q", "question_id")
            question_doc = {
                "question_id": question_id,
                "exam_id": exam_id,
                "question_text": q.get("question_text", ""),
                "option_a": q.get("option_a", ""),
                "option_b": q.get("option_b", ""),
                "option_c": q.get("option_c", ""),
                "option_d": q.get("option_d", ""),
                "correct_option": q.get("correct_option", "A"),
                "marks": int(q.get("marks", 1))
            }
            db.questions.insert_one(question_doc)

        return jsonify({"message": "Exam updated successfully"}), 200

    except Exception as e:
        print("UPDATE EXAM ERROR:", e)
        return jsonify({"message": "Server error while updating exam"}), 500


@exam_bp.route("/<exam_id>", methods=["DELETE"])
@token_required
def delete_exam(exam_id):
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        if current_user.get("role") != "admin":
            return jsonify({"message": "Only admin can delete exams"}), 403

        db.exams.delete_one({"exam_id": exam_id})
        db.questions.delete_many({"exam_id": exam_id})

        return jsonify({"message": "Exam deleted successfully"}), 200

    except Exception as e:
        print("DELETE EXAM ERROR:", e)
        return jsonify({"message": "Server error while deleting exam"}), 500


@exam_bp.route("/<exam_id>/status", methods=["PATCH"])
@token_required
def update_exam_status(exam_id):
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        if current_user.get("role") != "admin":
            return jsonify({"message": "Only admin can change status"}), 403

        data = request.get_json(force=True)
        status = data.get("status")

        if status not in ["upcoming", "live", "completed"]:
            return jsonify({"message": "Invalid status"}), 400

        db.exams.update_one(
            {"exam_id": exam_id},
            {"$set": {"status": status}}
        )

        return jsonify({"message": "Status updated successfully"}), 200

    except Exception as e:
        print("UPDATE STATUS ERROR:", e)
        return jsonify({"message": "Server error while updating status"}), 500