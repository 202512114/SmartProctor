from flask import Blueprint, jsonify, current_app, request
from utils import token_required
from datetime import datetime, timedelta

exams_bp = Blueprint("exams", __name__)


def parse_datetime(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value

    try:
        return datetime.fromisoformat(str(value).replace("Z", ""))
    except Exception:
        return None


def next_id(collection_name, prefix, field_name):
    db = current_app.mongo.db

    last_doc = db[collection_name].find_one(
        {field_name: {"$regex": f"^{prefix}"}},
        sort=[(field_name, -1)]
    )

    if not last_doc or not last_doc.get(field_name):
        return f"{prefix}001"

    try:
        number = int(str(last_doc[field_name]).replace(prefix, ""))
    except Exception:
        number = 0

    return f"{prefix}{number + 1:03}"


def get_exam_status(scheduled_at, duration_minutes):
    start_time = parse_datetime(scheduled_at)

    if not start_time:
        return "upcoming"

    try:
        duration = int(duration_minutes)
    except Exception:
        duration = 30

    end_time = start_time + timedelta(minutes=duration)
    now = datetime.now()

    if now < start_time:
        return "upcoming"

    if start_time <= now <= end_time:
        return "live"

    return "completed"


def calculate_grade(percentage):
    if percentage >= 80:
        return "A"
    elif percentage >= 60:
        return "B"
    elif percentage >= 40:
        return "C"
    return "F"


def get_logged_student_id(db, current_user):
    user_id = current_user.get("user_id")
    email = current_user.get("email")
    mongo_id = str(current_user.get("_id") or current_user.get("id") or "")

    possible_user_ids = []

    if user_id:
        possible_user_ids.append(user_id)

    if mongo_id:
        possible_user_ids.append(mongo_id)

    user_doc = None

    if email:
        user_doc = db.users.find_one({"email": email})

    if not user_doc and user_id:
        user_doc = db.users.find_one({"user_id": user_id})

    if user_doc:
        possible_user_ids.append(user_doc.get("user_id"))
        possible_user_ids.append(str(user_doc.get("_id")))

    possible_user_ids = [uid for uid in possible_user_ids if uid]

    student = None

    for uid in possible_user_ids:
        student = db.students.find_one({"user_id": uid})
        if student:
            break

    if student:
        return student.get("student_id") or str(student.get("_id"))

    return user_id or mongo_id


def get_or_create_attempt(db, exam_id, student_id):
    attempt = db.exam_attempts.find_one({
        "exam_id": exam_id,
        "student_id": student_id,
        "status": "started"
    })

    if attempt:
        return attempt.get("attempt_id")

    attempt_id = next_id("exam_attempts", "AT", "attempt_id")

    db.exam_attempts.insert_one({
        "attempt_id": attempt_id,
        "exam_id": exam_id,
        "student_id": student_id,
        "start_time": datetime.now().isoformat(),
        "end_time": "",
        "status": "started",
        "ip_address": request.remote_addr
    })

    return attempt_id


def format_exam(db, exam, student_id):
    exam_id = exam.get("exam_id", "")

    status = get_exam_status(
        exam.get("scheduled_at"),
        exam.get("duration_minutes", 0)
    )

    result = db.results.find_one({
        "exam_id": exam_id,
        "student_id": student_id
    })

    display_status = "completed" if result else status

    scheduled_at = parse_datetime(exam.get("scheduled_at"))
    question_count = db.questions.count_documents({"exam_id": exam_id})
    total_marks = int(exam.get("total_marks", 0) or 0)

    db.exams.update_one(
        {"exam_id": exam_id},
        {"$set": {"status": status}}
    )

    return {
        "id": exam_id,
        "title": exam.get("title", ""),
        "subject": exam.get("subject", ""),
        "questions": question_count,
        "duration": exam.get("duration_minutes", 0),
        "totalMarks": total_marks,
        "passingMarks": max(1, int(total_marks * 0.4)),
        "date": scheduled_at.strftime("%d %b %Y, %I:%M %p") if scheduled_at else "Not scheduled",
        "status": display_status,
        "hasResult": bool(result)
    }


@exams_bp.route("", methods=["GET"])
@exams_bp.route("/", methods=["GET"])
@token_required
def get_exams():
    try:
        db = current_app.mongo.db
        current_user = request.current_user
        student_id = get_logged_student_id(db, current_user)

        exam_docs = list(db.exams.find({}, {"_id": 0}))
        exams = []

        for exam in exam_docs:
            exams.append(format_exam(db, exam, student_id))

        exams.sort(key=lambda x: x["date"])

        return jsonify({"exams": exams}), 200

    except Exception as e:
        print("GET EXAMS ERROR:", e)
        return jsonify({"message": f"Server error while loading exams: {str(e)}"}), 500


@exams_bp.route("/<exam_id>", methods=["GET"])
@token_required
def get_exam_details(exam_id):
    try:
        db = current_app.mongo.db
        current_user = request.current_user
        student_id = get_logged_student_id(db, current_user)

        exam = db.exams.find_one({"exam_id": exam_id}, {"_id": 0})

        if not exam:
            return jsonify({"message": "Exam not found"}), 404

        existing_result = db.results.find_one({
            "exam_id": exam_id,
            "student_id": student_id
        })

        if existing_result:
            return jsonify({"message": "You have already completed this exam"}), 403

        status = get_exam_status(
            exam.get("scheduled_at"),
            exam.get("duration_minutes", 0)
        )

        if status != "live":
            return jsonify({"message": "Exam is not live right now"}), 403

        questions = list(db.questions.find({"exam_id": exam_id}, {"_id": 0}))

        safe_questions = []

        for q in questions:
            safe_questions.append({
                "question_id": q.get("question_id"),
                "question_text": q.get("question_text"),
                "options": [
                    q.get("option_a", ""),
                    q.get("option_b", ""),
                    q.get("option_c", ""),
                    q.get("option_d", "")
                ],
                "marks": int(q.get("marks", 1) or 1)
            })

        attempt_id = get_or_create_attempt(db, exam_id, student_id)

        return jsonify({
            "attempt_id": attempt_id,
            "exam": {
                "exam_id": exam.get("exam_id"),
                "title": exam.get("title"),
                "subject": exam.get("subject"),
                "duration_minutes": exam.get("duration_minutes"),
                "total_marks": exam.get("total_marks"),
                "scheduled_at": exam.get("scheduled_at"),
                "status": status
            },
            "questions": safe_questions
        }), 200

    except Exception as e:
        print("GET EXAM DETAILS ERROR:", e)
        return jsonify({"message": f"Server error while loading exam: {str(e)}"}), 500


@exams_bp.route("/<exam_id>/warning", methods=["POST"])
@token_required
def save_proctoring_warning(exam_id):
    try:
        db = current_app.mongo.db
        data = request.get_json(force=True)

        current_user = request.current_user
        student_id = get_logged_student_id(db, current_user)

        exam = db.exams.find_one({"exam_id": exam_id}, {"_id": 0})

        if not exam:
            return jsonify({"message": "Exam not found"}), 404

        existing_result = db.results.find_one({
            "exam_id": exam_id,
            "student_id": student_id
        })

        if existing_result:
            return jsonify({"message": "Exam already submitted"}), 409

        attempt_id = get_or_create_attempt(db, exam_id, student_id)

        event_type = data.get("event_type", "warning")
        severity = data.get("severity", "medium")
        detected_at = data.get("detected_at") or datetime.now().isoformat()
        snapshot_url = data.get("snapshot_url", "")
        message = data.get("message", event_type)

        log_id = next_id("proctoring_logs", "LOG", "log_id")

        db.proctoring_logs.insert_one({
            "log_id": log_id,
            "attempt_id": attempt_id,
            "event_type": event_type,
            "severity": severity,
            "detected_at": detected_at,
            "snapshot_url": snapshot_url,
            "is_reviewed": False
        })

        notif_id = next_id("notifications", "N", "notif_id")

        db.notifications.insert_one({
            "notif_id": notif_id,
            "attempt_id": attempt_id,
            "student_id": student_id,
            "message": message,
            "sent_at": datetime.now().isoformat(),
            "is_read": False
        })

        return jsonify({
            "message": "Proctoring warning saved",
            "log_id": log_id,
            "attempt_id": attempt_id
        }), 201

    except Exception as e:
        print("SAVE WARNING ERROR:", e)
        return jsonify({"message": f"Server error while saving warning: {str(e)}"}), 500


@exams_bp.route("/<exam_id>/submit", methods=["POST"])
@token_required
def submit_exam(exam_id):
    try:
        db = current_app.mongo.db
        data = request.get_json(force=True)

        current_user = request.current_user
        student_id = get_logged_student_id(db, current_user)

        exam = db.exams.find_one({"exam_id": exam_id}, {"_id": 0})

        if not exam:
            return jsonify({"message": "Exam not found"}), 404

        existing_result = db.results.find_one({
            "exam_id": exam_id,
            "student_id": student_id
        })

        if existing_result:
            return jsonify({"message": "You have already submitted this exam"}), 409

        submitted_answers = data.get("answers", [])

        if not isinstance(submitted_answers, list):
            return jsonify({"message": "Invalid answers format"}), 400

        attempt_id = get_or_create_attempt(db, exam_id, student_id)

        db.exam_attempts.update_one(
            {"attempt_id": attempt_id},
            {
                "$set": {
                    "end_time": datetime.now().isoformat(),
                    "status": "completed",
                    "ip_address": request.remote_addr
                }
            }
        )

        total_score = 0
        total_marks = 0

        db.answers.delete_many({"attempt_id": attempt_id})

        for ans in submitted_answers:
            question_id = ans.get("question_id")
            selected_option = str(ans.get("selected_option") or "").strip().upper()

            question = db.questions.find_one(
                {"question_id": question_id, "exam_id": exam_id},
                {"_id": 0}
            )

            if not question:
                continue

            correct_option = str(question.get("correct_option") or "").strip().upper()
            marks = int(question.get("marks", 1) or 1)

            total_marks += marks
            is_correct = selected_option == correct_option

            if is_correct:
                total_score += marks

            answer_id = next_id("answers", "ANS", "answer_id")

            db.answers.insert_one({
                "answer_id": answer_id,
                "attempt_id": attempt_id,
                "question_id": question_id,
                "selected_option": selected_option,
                "is_correct": is_correct,
                "answered_at": datetime.now().isoformat()
            })

        exam_total_marks = int(exam.get("total_marks", 0) or 0)

        if exam_total_marks > 0:
            total_marks = exam_total_marks

        if total_marks <= 0:
            total_marks = 1

        percentage = round((total_score / total_marks) * 100, 2)
        grade = calculate_grade(percentage)

        result_id = next_id("results", "R", "result_id")
        generated_at = datetime.now().isoformat()

        db.results.insert_one({
            "result_id": result_id,
            "attempt_id": attempt_id,
            "student_id": student_id,
            "exam_id": exam_id,
            "total_score": total_score,
            "percentage": percentage,
            "grade": grade,
            "generated_at": generated_at
        })

        return jsonify({
            "message": "Exam submitted successfully",
            "result": {
                "result_id": result_id,
                "attempt_id": attempt_id,
                "exam_id": exam_id,
                "exam_title": exam.get("title", ""),
                "subject": exam.get("subject", ""),
                "total_score": total_score,
                "total_marks": total_marks,
                "percentage": percentage,
                "grade": grade,
                "generated_at": generated_at
            }
        }), 201

    except Exception as e:
        print("SUBMIT EXAM ERROR:", e)
        return jsonify({"message": f"Server error while submitting exam: {str(e)}"}), 500


@exams_bp.route("/<exam_id>/result", methods=["GET"])
@token_required
def get_exam_result(exam_id):
    try:
        db = current_app.mongo.db
        current_user = request.current_user
        student_id = get_logged_student_id(db, current_user)

        result = db.results.find_one(
            {
                "exam_id": exam_id,
                "student_id": student_id
            },
            {"_id": 0}
        )

        if not result:
            return jsonify({"message": "Result not found for this student"}), 404

        exam = db.exams.find_one({"exam_id": exam_id}, {"_id": 0}) or {}

        total_marks = int(exam.get("total_marks", 0) or 0)

        if total_marks <= 0:
            questions = list(db.questions.find({"exam_id": exam_id}, {"_id": 0}))
            total_marks = sum(int(q.get("marks", 1) or 1) for q in questions) or 1

        return jsonify({
            "result": {
                "result_id": result.get("result_id"),
                "attempt_id": result.get("attempt_id"),
                "exam_id": exam_id,
                "exam_title": exam.get("title", exam_id),
                "subject": exam.get("subject", ""),
                "total_score": result.get("total_score", 0),
                "total_marks": total_marks,
                "percentage": result.get("percentage", 0),
                "grade": result.get("grade", ""),
                "generated_at": result.get("generated_at", "")
            }
        }), 200

    except Exception as e:
        print("GET RESULT ERROR:", e)
        return jsonify({"message": f"Server error while loading result: {str(e)}"}), 500