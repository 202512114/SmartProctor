from flask import Flask
from flask_pymongo import PyMongo
from flask_cors import CORS
from auth import auth_bp
from profile import profile_bp
from exam_routes import exam_bp
from exams import exams_bp


app = Flask(__name__)

# ✅ CORS FIX (VERY IMPORTANT)
CORS(app, supports_credentials=True)

# ✅ EXTRA HEADERS FIX (ENSURES POST WORKS)
@app.after_request
def after_request(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    return response

app.config["MONGO_URI"] = "mongodb://localhost:27017/smartproctor"
app.config["SECRET_KEY"] = "mysecretkey"

mongo = PyMongo(app)
app.mongo = mongo

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(profile_bp, url_prefix="/api/profile")
app.register_blueprint(exam_bp, url_prefix="/api/exam")
app.register_blueprint(exams_bp, url_prefix="/api/exams")

if __name__ == "__main__":
    app.run(debug=True)