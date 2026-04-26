from flask import Blueprint, request, jsonify, current_app
from utils import token_required, serialize_docs

activity_bp = Blueprint("activity", __name__)


@activity_bp.route("/", methods=["GET"])
@token_required
def get_logs():
    """GET /api/activity — list proctoring logs."""
    db = current_app.mongo.db   # ✅ FIXED
    logs = list(db.activity_logs.find().sort("_id", -1))
    return jsonify(serialize_docs(logs))


@activity_bp.route("/", methods=["POST"])
@token_required
def create_log():
    """POST /api/activity — log a proctoring event."""
    db = current_app.mongo.db   # ✅ FIXED
    data = request.get_json()

    result = db.activity_logs.insert_one(data)
    data["_id"] = str(result.inserted_id)

    return jsonify(data), 201

@activity_bp.route("/test", methods=["GET"])
@token_required
def test_protected():
    user = request.current_user

    return jsonify({
        "message": "Protected route working!",
        "user": user["email"]
    })