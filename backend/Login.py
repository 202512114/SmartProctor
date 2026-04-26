import jwt
import datetime
from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from utils import token_required

auth_bp = Blueprint("auth", __name__)


def next_id(collection, prefix, field_name):
    db = current_app.mongo.db
    last_doc = db[collection].find_one(
        {field_name: {"$regex": f"^{prefix}"}},
        sort=[(field_name, -1)]
    )

    if not last_doc or not last_doc.get(field_name):
        return f"{prefix}001"

    last_id = str(last_doc.get(field_name))
    try:
        num = int(last_id.replace(prefix, ""))
    except Exception:
        num = 0

    return f"{prefix}{num + 1:03}"


def get_user_by_token_identity(db, decoded_id):
    user = None

    try:
        user = db.users.find_one({"_id": ObjectId(decoded_id)})
    except Exception:
        user = None

    if not user:
        user = db.users.find_one({"user_id": decoded_id})

    return user


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json(force=True)

        email = data.get("email")
        password = data.get("password")
        selected_role = data.get("selectedRole")

        if not email or not password:
            return jsonify({"message": "Email and password required"}), 400

        db = current_app.mongo.db
        user = db.users.find_one({"email": email})

        if not user:
            return jsonify({"message": "User not found"}), 400

        if user.get("password") != password:
            return jsonify({"message": "Invalid password"}), 400

        if selected_role and user.get("role") != selected_role:
            return jsonify({"message": "Access denied: wrong role selected"}), 403

        user_id = user.get("user_id") or str(user.get("_id"))

        admin_id = None
        student_id = None

        if user.get("role") == "admin":
            admin_doc = db.admins.find_one({"user_id": user_id}, {"_id": 0})
            if not admin_doc:
                admin_doc = db.admins.find_one({"user_id": str(user.get("_id"))}, {"_id": 0})
            if admin_doc:
                admin_id = admin_doc.get("admin_id")

        if user.get("role") == "student":
            student_doc = db.students.find_one({"user_id": user_id}, {"_id": 0})
            if not student_doc:
                student_doc = db.students.find_one({"user_id": str(user.get("_id"))}, {"_id": 0})
            if student_doc:
                student_id = student_doc.get("student_id")

        token = jwt.encode(
            {
                "id": str(user["_id"]),
                "user_id": user_id,
                "admin_id": admin_id,
                "student_id": student_id,
                "role": user.get("role"),
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            },
            current_app.config["SECRET_KEY"],
            algorithm="HS256"
        )

        return jsonify({
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "user_id": user_id,
                "admin_id": admin_id,
                "student_id": student_id,
                "name": user.get("name", ""),
                "email": user.get("email", ""),
                "role": user.get("role", ""),
                "avatar": user.get("avatar", "")
            }
        }), 200

    except Exception as e:
        print("LOGIN ERROR:", e)
        return jsonify({"message": f"Server error: {str(e)}"}), 500


@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json(force=True)

        name = data.get("name")
        email = data.get("email")
        password = data.get("password")
        role = data.get("role", "student")

        if not name or not email or not password:
            return jsonify({"message": "All fields required"}), 400

        db = current_app.mongo.db

        existing_user = db.users.find_one({"email": email})
        if existing_user:
            return jsonify({"message": "User already exists"}), 400

        generated_user_id = next_id("users", "U", "user_id")

        new_user = {
            "user_id": generated_user_id,
            "name": name,
            "email": email,
            "password": password,
            "role": role,
            "avatar": "",
            "created_at": datetime.datetime.utcnow(),
            "last_login": None
        }

        user_result = db.users.insert_one(new_user)
        mongo_user_id = user_result.inserted_id

        admin_id = None
        student_id = None

        if role == "student":
            generated_student_id = next_id("students", "S", "student_id")
            student_doc = {
                "student_id": generated_student_id,
                "user_id": generated_user_id,
                "enrollment_no": data.get("enrollment_no", None),
                "department": data.get("department", None),
                "semester": data.get("semester", None),
                "profile_photo": data.get("profile_photo", None)
            }
            db.students.insert_one(student_doc)
            student_id = generated_student_id

        elif role == "admin":
            generated_admin_id = next_id("admins", "A", "admin_id")
            admin_doc = {
                "admin_id": generated_admin_id,
                "user_id": generated_user_id,
                "designation": data.get("designation", None),
                "privilege_level": data.get("privilege_level", None)
            }
            db.admins.insert_one(admin_doc)
            admin_id = generated_admin_id

        token = jwt.encode(
            {
                "id": str(mongo_user_id),
                "user_id": generated_user_id,
                "admin_id": admin_id,
                "student_id": student_id,
                "role": role,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            },
            current_app.config["SECRET_KEY"],
            algorithm="HS256"
        )

        return jsonify({
            "token": token,
            "user": {
                "id": str(mongo_user_id),
                "user_id": generated_user_id,
                "admin_id": admin_id,
                "student_id": student_id,
                "name": name,
                "email": email,
                "role": role,
                "avatar": ""
            }
        }), 201

    except Exception as e:
        print("REGISTER ERROR:", e)
        return jsonify({"message": f"Server error: {str(e)}"}), 500


@auth_bp.route("/me", methods=["GET"])
@token_required
def me():
    try:
        user = request.current_user
        db = current_app.mongo.db

        user_id = user.get("user_id") or str(user.get("_id"))

        admin_id = None
        student_id = None

        if user.get("role") == "admin":
            admin_doc = db.admins.find_one({"user_id": user_id}, {"_id": 0})
            if admin_doc:
                admin_id = admin_doc.get("admin_id")

        if user.get("role") == "student":
            student_doc = db.students.find_one({"user_id": user_id}, {"_id": 0})
            if student_doc:
                student_id = student_doc.get("student_id")

        return jsonify({
            "id": str(user.get("_id")),
            "user_id": user_id,
            "admin_id": admin_id,
            "student_id": student_id,
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "role": user.get("role", ""),
            "avatar": user.get("avatar", "")
        }), 200

    except Exception as e:
        print("ME ERROR:", e)
        return jsonify({"message": f"Server error: {str(e)}"}), 500