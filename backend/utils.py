import jwt
from flask import request, jsonify, current_app
from functools import wraps
from bson import ObjectId

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"message": "Token is missing"}), 401

        try:
            data = jwt.decode(
                token,
                current_app.config["SECRET_KEY"],
                algorithms=["HS256"]
            )

            user_id = data.get("id")
            user = current_app.mongo.db.users.find_one({"_id": ObjectId(user_id)})

            if not user:
                return jsonify({"message": "User not found"}), 401

            request.current_user = user

        except Exception as e:
            print("TOKEN ERROR:", e)
            return jsonify({"message": "Token is invalid"}), 401

        return f(*args, **kwargs)

    return decorated