import os
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request
from flask_pymongo import PyMongo
from flask_cors import CORS
from Login import auth_bp
from Profile import profile_bp
from ExamManagement import exam_bp
from ExamList import exams_bp
from Results import results_bp
from Proctoring import proctoring_bp
from StudentManagement import student_bp
from AdminDashboard import dashboard_bp
from StudentDashboard import student_dashboard_bp

app = Flask(__name__)

app.config["MONGO_URI"] = os.environ.get("MONGO_URI", "mongodb://localhost:27017/smartproctor")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "mysecretkey")

mongo = PyMongo(app)
app.mongo = mongo

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    FRONTEND_URL,
]

CORS(
    app,
    resources={r"/api/*": {"origins": ALLOWED_ORIGINS}},
    supports_credentials=True
)

@app.after_request
def after_request(response):
    origin = request.headers.get("Origin")

    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"

    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,PATCH,OPTIONS"
    response.headers["Access-Control-Allow-Credentials"] = "true"

    return response


app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(profile_bp, url_prefix="/api/profile")

# Admin Exam Create / Edit / Delete
app.register_blueprint(exam_bp, url_prefix="/api/exams")

# Student Exam List / Start / Submit
app.register_blueprint(exams_bp, url_prefix="/api/exam-list")

app.register_blueprint(results_bp, url_prefix="/api/results")
app.register_blueprint(proctoring_bp, url_prefix="/api/proctoring")
app.register_blueprint(student_bp, url_prefix="/api/students")
app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
app.register_blueprint(student_dashboard_bp, url_prefix="/api/student-dashboard")

if __name__ == "__main__":
    app.run(debug=True, port=5000)