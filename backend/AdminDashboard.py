from flask import Blueprint, jsonify, request, current_app
from utils import token_required
from bson import ObjectId
from datetime import datetime

dashboard_bp = Blueprint("dashboard_bp", __name__)


def get_admin_id(user, db):
    user_id = user.get("user_id") or str(user.get("_id"))

    admin = db.admins.find_one({"user_id": user_id})
    if admin:
        return admin.get("admin_id")

    admin = db.admins.find_one({"user_id": str(user.get("_id"))})
    if admin:
        return admin.get("admin_id")

    return None


@dashboard_bp.route("/stats", methods=["GET"])
@token_required
def get_dashboard_stats():
    db = current_app.mongo.db
    user = request.current_user

    admin_id = get_admin_id(user, db)
    if not admin_id:
        return jsonify({"message": "Admin not found"}), 403

    # Exams created by this admin
    exams = list(db.exams.find({"created_by": admin_id}))
    total_exams = len(exams)

    # Students
    total_students = db.students.count_documents({})

    # Results
    results = list(db.results.find())
    avg_score = 0
    if results:
        avg_score = sum(r.get("percentage", 0) for r in results) / len(results)

    # Warnings (proctoring logs)
    warnings = db.proctoring_logs.count_documents({})

    return jsonify({
        "avgScore": round(avg_score, 2),
        "warnings": warnings,
        "exams": total_exams,
        "students": total_students
    })


@dashboard_bp.route("/activity", methods=["GET"])
@token_required
def get_activity_logs():
    db = current_app.mongo.db

    logs = list(
        db.proctoring_logs
        .find()
        .sort("detected_at", -1)
        .limit(5)
    )

    formatted = []
    for log in logs:
        formatted.append({
            "message": log.get("event_type", "Activity detected"),
            "severity": log.get("severity", "low"),
            "time": str(log.get("detected_at", "")),
        })

    return jsonify(formatted)


@dashboard_bp.route("/recent-results", methods=["GET"])
@token_required
def get_recent_results():
    db = current_app.mongo.db

    results = list(
        db.results
        .find()
        .sort("generated_at", -1)
        .limit(5)
    )

    formatted = []
    for r in results:
        formatted.append({
            "student": r.get("student_id"),
            "exam": r.get("exam_id"),
            "score": r.get("total_score"),
            "percentage": r.get("percentage"),
            "date": str(r.get("generated_at", "")),
            "status": "pass" if r.get("percentage", 0) >= 40 else "fail"
        })

    return jsonify(formatted)