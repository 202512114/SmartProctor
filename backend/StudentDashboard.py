from flask import Blueprint, jsonify, request, current_app
from utils import token_required
from datetime import datetime, timedelta, time

student_dashboard_bp = Blueprint("student_dashboard_bp", __name__)


def parse_datetime(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value

    try:
        return datetime.fromisoformat(str(value).replace("Z", ""))
    except Exception:
        return None


def get_exam_status(scheduled_at, duration_minutes):
    start_time = parse_datetime(scheduled_at)

    if not start_time:
        return "upcoming"

    try:
        duration = int(duration_minutes)
    except Exception:
        duration = 30

    end_time = start_time + timedelta(minutes=duration)
    now = datetime.utcnow()

    if now < start_time:
        return "upcoming"

    if start_time <= now <= end_time:
        return "live"

    return "completed"


def get_logged_student(db, current_user):
    user_id = current_user.get("user_id")
    email = current_user.get("email")
    mongo_id = str(current_user.get("_id") or current_user.get("id") or "")

    user_doc = None

    if email:
        user_doc = db.users.find_one({"email": email})

    if not user_doc and user_id:
        user_doc = db.users.find_one({"user_id": user_id})

    possible_user_ids = []

    if user_id:
        possible_user_ids.append(user_id)

    if mongo_id:
        possible_user_ids.append(mongo_id)

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
        student_id = student.get("student_id") or str(student.get("_id"))
    else:
        student_id = user_id or mongo_id

    student_name = "Student"

    if user_doc:
        student_name = user_doc.get("name", "Student")
    elif current_user.get("name"):
        student_name = current_user.get("name")

    return student_id, student_name


def is_today(value):
    dt = parse_datetime(value)

    if not dt:
        return False

    return dt.date() == datetime.utcnow().date()


def format_time(value):
    dt = parse_datetime(value)

    if not dt:
        return "Not scheduled"

    return dt.strftime("%I:%M %p")


def format_date_time(value):
    dt = parse_datetime(value)

    if not dt:
        return str(value or "")

    return dt.strftime("%d %b %Y, %I:%M %p")


def get_total_marks(db, exam_id, exam):
    total_marks = int(exam.get("total_marks", 0) or 0)

    if total_marks > 0:
        return total_marks

    questions = list(db.questions.find({"exam_id": exam_id}, {"_id": 0}))
    return sum(int(q.get("marks", 1) or 1) for q in questions) or 1


def get_today_logs_for_attempts(db, attempt_ids):
    if not attempt_ids:
        return []

    logs = list(
        db.proctoring_logs
        .find({"attempt_id": {"$in": attempt_ids}}, {"_id": 0})
        .sort("detected_at", -1)
    )

    today_logs = []

    for log in logs:
        detected_at = parse_datetime(log.get("detected_at"))

        if detected_at and detected_at.date() == datetime.utcnow().date():
            today_logs.append(log)

    return today_logs


@student_dashboard_bp.route("/summary", methods=["GET"])
@token_required
def get_student_dashboard_summary():
    try:
        db = current_app.mongo.db
        current_user = request.current_user

        student_id, student_name = get_logged_student(db, current_user)

        all_exams = list(db.exams.find({}, {"_id": 0}))
        today_exams = []

        for exam in all_exams:
            scheduled_at = exam.get("scheduled_at")

            if not is_today(scheduled_at):
                continue

            exam_id = exam.get("exam_id")

            actual_status = get_exam_status(
                scheduled_at,
                exam.get("duration_minutes", 0)
            )

            result = db.results.find_one({
                "exam_id": exam_id,
                "student_id": student_id
            })

            display_status = "completed" if result else actual_status

            db.exams.update_one(
                {"exam_id": exam_id},
                {"$set": {"status": actual_status}}
            )

            today_exams.append({
                "id": exam_id,
                "title": exam.get("title", "Untitled Exam"),
                "subject": exam.get("subject", ""),
                "questions": db.questions.count_documents({"exam_id": exam_id}),
                "duration": exam.get("duration_minutes", 0),
                "time": format_time(scheduled_at),
                "status": display_status,
                "hasResult": bool(result),
                "scheduledSort": parse_datetime(scheduled_at) or datetime.max
            })

        today_exams.sort(key=lambda e: e["scheduledSort"])

        for exam in today_exams:
            exam.pop("scheduledSort", None)

        results = list(
            db.results
            .find({"student_id": student_id}, {"_id": 0})
            .sort("generated_at", -1)
        )

        completed_exams = len(results)

        if results:
            average_score = round(
                sum(float(r.get("percentage", 0) or 0) for r in results) / len(results),
                2
            )
        else:
            average_score = 0

        attempt_ids = [
            r.get("attempt_id")
            for r in results
            if r.get("attempt_id")
        ]

        today_logs = get_today_logs_for_attempts(db, attempt_ids)
        alerts_today = len(today_logs)

        formatted_alerts = []

        for log in today_logs[:4]:
            detected = parse_datetime(log.get("detected_at"))

            formatted_alerts.append({
                "id": log.get("log_id", ""),
                "type": log.get("event_type", "warning"),
                "message": log.get("event_type", "Warning detected").replace("_", " ").title(),
                "severity": log.get("severity", "medium").title(),
                "time": detected.strftime("%I:%M %p") if detected else str(log.get("detected_at", ""))
            })

        recent_results = []

        for result in results[:5]:
            exam = db.exams.find_one(
                {"exam_id": result.get("exam_id")},
                {"_id": 0}
            ) or {}

            total_marks = get_total_marks(db, result.get("exam_id"), exam)

            recent_results.append({
                "id": result.get("result_id", ""),
                "exam_id": result.get("exam_id", ""),
                "exam_title": exam.get("title", result.get("exam_id", "Exam")),
                "subject": exam.get("subject", ""),
                "total_score": result.get("total_score", 0),
                "total_marks": total_marks,
                "percentage": result.get("percentage", 0),
                "grade": result.get("grade", ""),
                "generated_at": format_date_time(result.get("generated_at"))
            })

        return jsonify({
            "studentName": student_name,
            "stats": {
                "todayExams": len(today_exams),
                "liveExams": len([e for e in today_exams if e["status"] == "live"]),
                "upcomingExams": len([e for e in today_exams if e["status"] == "upcoming"]),
                "completedExams": completed_exams,
                "alertsToday": alerts_today,
                "averageScore": average_score
            },
            "todayExams": today_exams[:5],
            "recentAlerts": formatted_alerts,
            "recentResults": recent_results
        }), 200

    except Exception as e:
        print("STUDENT DASHBOARD ERROR:", e)
        return jsonify({
            "message": f"Server error while loading student dashboard: {str(e)}"
        }), 500