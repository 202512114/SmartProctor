import { useState, useEffect, useCallback, useRef } from 'react'
import * as faceapi from 'face-api.js'
import { useParams, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config'
import {
    Clock,
    AlertTriangle,
    ClipboardList,
    Flag,
    ArrowLeft,
    ArrowRight,
    CheckCircle,
    XCircle,
    BarChart,
    Inbox,
    FileText
} from '../components/Icons'

export default function ExamTaking() {
    const { examId } = useParams()
    const navigate = useNavigate()

    const [exam, setExam] = useState(null)
    const [questions, setQuestions] = useState([])
    const [currentQ, setCurrentQ] = useState(0)
    const [answers, setAnswers] = useState({})
    const [flagged, setFlagged] = useState(new Set())
    const [timeLeft, setTimeLeft] = useState(0)
    const [submitted, setSubmitted] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [showResult, setShowResult] = useState(false)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [proctorWarning, setProctorWarning] = useState(null)
    const [warningCount, setWarningCount] = useState(0)
    const [webcamActive, setWebcamActive] = useState(true)

    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const detectionIntervalRef = useRef(null)
    const submittedRef = useRef(false)

    useEffect(() => {
        fetchExam()
    }, [examId])

    const fetchExam = async () => {
        try {
            setLoading(true)
            setError('')

            const token = localStorage.getItem('token')

            const res = await fetch(`${API_BASE_URL}/api/exam-list/${examId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.message || 'Failed to load exam')
                return
            }

            setExam(data.exam)
            setQuestions(data.questions || [])
            setTimeLeft((data.exam?.duration_minutes || 30) * 60)
        } catch (err) {
            console.error('FETCH EXAM ERROR:', err)
            setError('Server error while loading exam')
        } finally {
            setLoading(false)
        }
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null
        }

        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current)
            detectionIntervalRef.current = null
        }
    }

    const saveProctoringWarning = async (eventType, message, severity = 'medium') => {
        try {
            const token = localStorage.getItem('token')

            await fetch(`${API_BASE_URL}/api/exam-list/${examId}/warning`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    event_type: eventType,
                    severity: severity,
                    message: message,
                    detected_at: new Date().toISOString(),
                    snapshot_url: ''
                })
            })
        } catch (err) {
            console.error('SAVE PROCTORING WARNING ERROR:', err)
        }
    }

    const addWarning = useCallback((eventType, message, severity = 'medium') => {
        if (submittedRef.current) return

        setProctorWarning({ msg: message })
        saveProctoringWarning(eventType, message, severity)

        setWarningCount(prev => {
            const newCount = prev + 1

            if (newCount >= 5 && !submittedRef.current) {
                setTimeout(() => submitExam(true), 300)
            }

            return newCount
        })

        setTimeout(() => setProctorWarning(null), 3000)
    }, [examId])

    useEffect(() => {
        if (!exam || submitted) return

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    submitExam(true)
                    return 0
                }

                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [exam, submitted])

    useEffect(() => {
        const startVideo = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true })

                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    streamRef.current = stream
                }
            } catch (err) {
                console.error('Camera error:', err)
                addWarning('camera_error', 'Camera permission denied or unavailable.', 'high')
            }
        }

        const loadModels = async () => {
            try {
                await faceapi.nets.tinyFaceDetector.loadFromUri('/models')
                startVideo()
            } catch (err) {
                console.error('Face model loading error:', err)
            }
        }

        if (!submitted && !loading && exam) {
            loadModels()
        }

        return () => stopCamera()
    }, [loading, exam])

    useEffect(() => {
        if (!exam || submitted) return

        detectionIntervalRef.current = setInterval(async () => {
            if (submittedRef.current) return

            if (videoRef.current && videoRef.current.readyState === 4) {
                try {
                    const detections = await faceapi.detectAllFaces(
                        videoRef.current,
                        new faceapi.TinyFaceDetectorOptions()
                    )

                    if (detections.length === 0) {
                        setWebcamActive(false)
                        addWarning('no_face', 'No Face Detected! Please Stay Visible.', 'medium')
                    } else if (detections.length > 1) {
                        setWebcamActive(true)
                        addWarning('multiple_faces', 'Multiple Faces Detected!', 'high')
                    } else {
                        setWebcamActive(true)
                    }
                } catch (err) {
                    console.error('Face detection error:', err)
                }
            }
        }, 6000)

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current)
                detectionIntervalRef.current = null
            }
        }
    }, [exam, submitted, addWarning])

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && !submittedRef.current) {
                addWarning('tab_switch', 'Tab Switch Detected! Stay on exam page.', 'high')
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [addWarning])

    const selectAnswer = (qIdx, optionLetter) => {
        if (!submitted) {
            setAnswers(prev => ({
                ...prev,
                [qIdx]: optionLetter
            }))
        }
    }

    const toggleFlag = () => {
        setFlagged(prev => {
            const next = new Set(prev)

            if (next.has(currentQ)) {
                next.delete(currentQ)
            } else {
                next.add(currentQ)
            }

            return next
        })
    }

    const submitExam = async (autoSubmit = false) => {
        if (submittedRef.current) return

        submittedRef.current = true
        stopCamera()

        try {
            const token = localStorage.getItem('token')

            const formattedAnswers = questions.map((q, index) => ({
                question_id: q.question_id,
                selected_option: answers[index] || ''
            }))

            const res = await fetch(`${API_BASE_URL}/api/exam-list/${examId}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    answers: formattedAnswers,
                    auto_submit: autoSubmit
                })
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.message || 'Failed to submit exam')
                submittedRef.current = false
                return
            }

            setResult(data.result)
            setSubmitted(true)
            setShowConfirm(false)
            setShowResult(true)
        } catch (err) {
            console.error('SUBMIT EXAM ERROR:', err)
            setError('Server error while submitting exam')
            submittedRef.current = false
        }
    }

    const formatTime = seconds => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    const timerClass = timeLeft < 60 ? 'danger' : timeLeft < 300 ? 'warning' : ''

    if (loading) {
        return (
            <div className="glass-card" style={{ padding: 20 }}>
                Loading exam...
            </div>
        )
    }

    if (error) {
        return (
            <div className="empty-state">
                <Inbox size={48} />
                <h3>{error}</h3>
                <button className="btn btn-primary" onClick={() => navigate('/exam-list')}>
                    Back to Exams
                </button>
            </div>
        )
    }

    if (!exam || questions.length === 0) {
        return (
            <div className="empty-state">
                <Inbox size={48} />
                <h3>No questions found for this exam</h3>
                <button className="btn btn-primary" onClick={() => navigate('/exam-list')}>
                    Back to Exams
                </button>
            </div>
        )
    }

    if (showResult && result) {
        const passed = Number(result.percentage) >= 40

        return (
            <div className="animate-slide-up" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
                <div className="glass-card" style={{ padding: 48 }}>
                    <div style={{ marginBottom: 16 }}>
                        {passed ? (
                            <CheckCircle size={64} color="var(--accent-green)" />
                        ) : (
                            <XCircle size={64} color="var(--accent-red)" />
                        )}
                    </div>

                    <h1 style={{ fontSize: 32, marginBottom: 8 }}>
                        {passed ? 'Congratulations!' : 'Better Luck Next Time'}
                    </h1>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
                        {result.exam_title || exam.title} - Results
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 32 }}>
                        <div>
                            <div style={{ fontSize: 36, fontWeight: 800, color: passed ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                {result.total_score}/{result.total_marks}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Score</div>
                        </div>

                        <div>
                            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent-blue)' }}>
                                {result.percentage}%
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Percentage</div>
                        </div>

                        <div>
                            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent-orange)' }}>
                                {warningCount}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Warnings</div>
                        </div>
                    </div>

                    <span className={`badge ${passed ? 'badge-passed' : 'badge-failed'}`} style={{ fontSize: 14, padding: '8px 24px' }}>
                        {passed ? 'PASSED' : 'FAILED'}
                    </span>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
                        <button className="btn btn-primary" onClick={() => navigate('/exam-list')}>
                            <ClipboardList size={16} /> Back to Exams
                        </button>

                        <button className="btn btn-secondary" onClick={() => navigate('/results')}>
                            <BarChart size={16} /> View All Results
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const q = questions[currentQ]

    return (
        <div className="animate-fade-in">
            <div className="exam-header">
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>{exam.title}</h2>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{exam.subject}</span>
                </div>

                <div className={`exam-timer ${timerClass}`}>
                    <Clock size={18} /> Time Left: {formatTime(timeLeft)}
                </div>
            </div>

            {proctorWarning && (
                <div className="alert-bar warning" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={16} /> {proctorWarning.msg}
                </div>
            )}

            <div className="exam-container">
                <div className="exam-main">
                    <div className="question-card">
                        <div className="q-number">
                            Question {currentQ + 1} of {questions.length}
                        </div>

                        <div className="q-text">{q.question_text}</div>

                        <div className="options">
                            {q.options.map((opt, i) => {
                                const letter = String.fromCharCode(65 + i)

                                return (
                                    <button
                                        key={letter}
                                        className={`option-btn ${answers[currentQ] === letter ? 'selected' : ''}`}
                                        onClick={() => selectAnswer(currentQ, letter)}
                                    >
                                        <span className="option-letter">{letter}</span>
                                        <span>{opt}</span>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="question-nav">
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={currentQ === 0}
                                onClick={() => setCurrentQ(c => c - 1)}
                            >
                                <ArrowLeft size={14} /> Previous
                            </button>

                            <button
                                className={`btn btn-sm ${flagged.has(currentQ) ? 'btn-danger' : 'btn-secondary'}`}
                                onClick={toggleFlag}
                            >
                                <Flag size={14} /> {flagged.has(currentQ) ? 'Flagged' : 'Flag'}
                            </button>

                            {currentQ < questions.length - 1 ? (
                                <button className="btn btn-primary btn-sm" onClick={() => setCurrentQ(c => c + 1)}>
                                    Next <ArrowRight size={14} />
                                </button>
                            ) : (
                                <button className="btn btn-success btn-sm" onClick={() => setShowConfirm(true)}>
                                    <CheckCircle size={14} /> Submit Exam
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="exam-sidebar-panel">
                    <div className="webcam-preview">
                        <div className="cam-box">
                            <video ref={videoRef} autoPlay muted className="cam-box" style={{ width: '100%', borderRadius: '10px' }} />
                        </div>

                        <div className={`cam-status ${webcamActive ? 'active' : 'warning'}`}>
                            <span
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: webcamActive ? 'var(--accent-green)' : 'var(--accent-red)',
                                    display: 'inline-block'
                                }}
                            />
                            {webcamActive ? 'Face Detected' : 'No Face'}
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ClipboardList size={14} /> Question Navigator
                        </div>

                        <div className="q-nav-grid">
                            {questions.map((_, i) => (
                                <button
                                    key={i}
                                    className={`q-nav-btn ${i === currentQ ? 'current' : ''} ${answers[i] !== undefined ? 'answered' : ''} ${flagged.has(i) ? 'flagged' : ''}`}
                                    onClick={() => setCurrentQ(i)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>

                        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                            <span>Answered: {Object.keys(answers).length}</span>
                            <span>Remaining: {questions.length - Object.keys(answers).length}</span>
                            <span>Flagged: {flagged.size}</span>
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <AlertTriangle size={14} /> Warnings: {warningCount}
                        </div>

                        <div className="progress-bar">
                            <div
                                className={`fill ${warningCount > 3 ? 'red' : warningCount > 1 ? 'orange' : 'green'}`}
                                style={{ width: `${Math.min(warningCount * 20, 100)}%` }}
                            />
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                            Max 5 warnings allowed
                        </div>
                    </div>
                </div>
            </div>

            {showConfirm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={20} /> Submit Exam?
                        </h2>

                        <p>
                            You have answered {Object.keys(answers).length} out of {questions.length} questions.
                        </p>

                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                                Cancel
                            </button>

                            <button className="btn btn-success" onClick={() => submitExam(false)}>
                                <CheckCircle size={16} /> Confirm Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}