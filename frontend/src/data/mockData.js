export const users = [
    { id: 1, name: 'Admin User', email: 'admin@smartproctor.com', role: 'admin', avatar: 'A' },
    { id: 2, name: 'Rahul Sharma', email: 'rahul@student.com', role: 'student', avatar: 'R' },
    { id: 3, name: 'Priya Patel', email: 'priya@student.com', role: 'student', avatar: 'P' },
    { id: 4, name: 'Amit Kumar', email: 'amit@student.com', role: 'student', avatar: 'A' },
    { id: 5, name: 'Sneha Reddy', email: 'sneha@student.com', role: 'student', avatar: 'S' },
];

export const exams = [
    { id: 1, title: 'Math Quiz', subject: 'Mathematics', questions: 30, duration: 45, status: 'live', date: '2026-02-19', totalMarks: 30, passingMarks: 12 },
    { id: 2, title: 'Physics Test', subject: 'Physics', questions: 25, duration: 40, status: 'live', date: '2026-02-19', totalMarks: 25, passingMarks: 10 },
    { id: 3, title: 'History Exam', subject: 'History', questions: 27, duration: 35, status: 'upcoming', date: '2026-02-21', totalMarks: 27, passingMarks: 11 },
    { id: 4, title: 'Chemistry Final', subject: 'Chemistry', questions: 40, duration: 60, status: 'upcoming', date: '2026-02-22', totalMarks: 40, passingMarks: 16 },
    { id: 5, title: 'English Literature', subject: 'English', questions: 20, duration: 30, status: 'completed', date: '2026-02-15', totalMarks: 20, passingMarks: 8 },
    { id: 6, title: 'Computer Science', subject: 'CS', questions: 35, duration: 50, status: 'completed', date: '2026-02-14', totalMarks: 35, passingMarks: 14 },
    { id: 7, title: 'Biology Basics', subject: 'Biology', questions: 22, duration: 30, status: 'live', date: '2026-02-19', totalMarks: 22, passingMarks: 9 },
    { id: 8, title: 'Geography Test', subject: 'Geography', questions: 18, duration: 25, status: 'upcoming', date: '2026-02-25', totalMarks: 18, passingMarks: 7 },
];

export const questions = [
    { id: 1, examId: 1, text: 'What is the derivative of x²?', type: 'mcq', options: ['x', '2x', '2', 'x²'], correct: 1 },
    { id: 2, examId: 1, text: 'What is 15 × 12?', type: 'mcq', options: ['170', '175', '180', '185'], correct: 2 },
    { id: 3, examId: 1, text: 'Value of π (approx)?', type: 'mcq', options: ['3.12', '3.14', '3.16', '3.18'], correct: 1 },
    { id: 4, examId: 1, text: 'What is √144?', type: 'mcq', options: ['10', '11', '12', '13'], correct: 2 },
    { id: 5, examId: 1, text: 'Integral of 2x?', type: 'mcq', options: ['x', 'x²', '2x²', 'x² + C'], correct: 3 },
    { id: 6, examId: 2, text: "Newton's second law?", type: 'mcq', options: ['F = ma', 'E = mc²', 'V = IR', 'P = IV'], correct: 0 },
    { id: 7, examId: 2, text: 'Unit of Force?', type: 'mcq', options: ['Joule', 'Watt', 'Newton', 'Pascal'], correct: 2 },
    { id: 8, examId: 2, text: 'Speed of light?', type: 'mcq', options: ['3×10⁶', '3×10⁸', '3×10¹⁰', '3×10⁴'], correct: 1 },
    { id: 9, examId: 2, text: 'Planet with most gravity?', type: 'mcq', options: ['Earth', 'Mars', 'Jupiter', 'Saturn'], correct: 2 },
    { id: 10, examId: 2, text: 'SI unit of energy?', type: 'mcq', options: ['Newton', 'Joule', 'Watt', 'Volt'], correct: 1 },
    { id: 11, examId: 1, text: 'What is 7!?', type: 'mcq', options: ['720', '5040', '40320', '362880'], correct: 1 },
    { id: 12, examId: 1, text: 'log₁₀(1000)?', type: 'mcq', options: ['1', '2', '3', '4'], correct: 2 },
    { id: 13, examId: 1, text: '3x + 5 = 20, x = ?', type: 'mcq', options: ['3', '4', '5', '6'], correct: 2 },
    { id: 14, examId: 1, text: 'Area of circle r=7?', type: 'mcq', options: ['44', '154', '88', '308'], correct: 1 },
    { id: 15, examId: 1, text: 'Sum of angles in triangle?', type: 'mcq', options: ['90°', '180°', '270°', '360°'], correct: 1 },
];

export const practiceQuizzes = [
    { id: 101, title: 'Quick Math Challenge', subject: 'Mathematics', questions: 10, difficulty: 'Easy' },
    { id: 102, title: 'Science Trivia', subject: 'Science', questions: 8, difficulty: 'Medium' },
    { id: 103, title: 'History Facts', subject: 'History', questions: 12, difficulty: 'Easy' },
    { id: 104, title: 'Code Cracker', subject: 'CS', questions: 15, difficulty: 'Hard' },
    { id: 105, title: 'Geography Explorer', subject: 'Geography', questions: 10, difficulty: 'Medium' },
    { id: 106, title: 'Literature Legends', subject: 'English', questions: 8, difficulty: 'Easy' },
];

export const practiceQuestions = [
    { id: 1, quizId: 101, text: 'What is 25 × 4?', options: ['90', '100', '110', '80'], correct: 1 },
    { id: 2, quizId: 101, text: '144 ÷ 12?', options: ['10', '11', '12', '13'], correct: 2 },
    { id: 3, quizId: 101, text: 'What is 2⁵?', options: ['16', '32', '64', '128'], correct: 1 },
    { id: 4, quizId: 101, text: '√81?', options: ['7', '8', '9', '10'], correct: 2 },
    { id: 5, quizId: 101, text: '13 + 28?', options: ['39', '40', '41', '42'], correct: 2 },
    { id: 6, quizId: 102, text: 'Gas plants absorb?', options: ['O₂', 'CO₂', 'N₂', 'H₂'], correct: 1 },
    { id: 7, quizId: 102, text: 'H₂O is?', options: ['Salt', 'Water', 'Acid', 'Gas'], correct: 1 },
    { id: 8, quizId: 102, text: 'Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correct: 1 },
    { id: 9, quizId: 104, text: 'HTML stands for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'], correct: 0 },
    { id: 10, quizId: 104, text: 'FIFO structure?', options: ['Stack', 'Queue', 'Tree', 'Graph'], correct: 1 },
];

export const results = [
    { id: 1, studentId: 2, studentName: 'Rahul Sharma', examId: 5, examTitle: 'English Literature', score: 16, total: 20, percentage: 80, status: 'passed', date: '2026-02-15', warnings: 1 },
    { id: 2, studentId: 3, studentName: 'Priya Patel', examId: 5, examTitle: 'English Literature', score: 18, total: 20, percentage: 90, status: 'passed', date: '2026-02-15', warnings: 0 },
    { id: 3, studentId: 4, studentName: 'Amit Kumar', examId: 6, examTitle: 'Computer Science', score: 28, total: 35, percentage: 80, status: 'passed', date: '2026-02-14', warnings: 2 },
    { id: 4, studentId: 5, studentName: 'Sneha Reddy', examId: 6, examTitle: 'Computer Science', score: 12, total: 35, percentage: 34, status: 'failed', date: '2026-02-14', warnings: 5 },
    { id: 5, studentId: 2, studentName: 'Rahul Sharma', examId: 6, examTitle: 'Computer Science', score: 30, total: 35, percentage: 86, status: 'passed', date: '2026-02-14', warnings: 0 },
];

export const activityLogs = [
    { id: 1, studentName: 'Amit Kumar', type: 'multiple_faces', message: 'Multiple Faces Detected', time: '11:35 AM', examTitle: 'Computer Science', severity: 'high' },
    { id: 2, studentName: 'Sneha Reddy', type: 'no_face', message: 'No Face Detected', time: '11:10 AM', examTitle: 'Computer Science', severity: 'high' },
    { id: 3, studentName: 'Sneha Reddy', type: 'left_seat', message: 'Student Left Seat', time: '10:45 AM', examTitle: 'Computer Science', severity: 'medium' },
    { id: 4, studentName: 'Rahul Sharma', type: 'tab_switch', message: 'Tab Switch Detected', time: '10:30 AM', examTitle: 'English Literature', severity: 'low' },
    { id: 5, studentName: 'Amit Kumar', type: 'no_face', message: 'No Face Detected', time: '11:20 AM', examTitle: 'Computer Science', severity: 'high' },
];

export const dashboardStats = {
    activeExams: 12, studentsOnline: 48, alertsToday: 3, aiAccuracy: 98, totalStudents: 312, examsConducted: 28, avgScore: 85,
};
