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
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=True
)


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