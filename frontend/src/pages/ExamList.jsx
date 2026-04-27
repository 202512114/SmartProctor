import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, FileText, Rocket, Lock, BarChart, Calendar, Clock, XCircle } from '../components/Icons'
import { API_BASE_URL } from '../config'

export default function ExamList() {
    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [exams, setExams] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [resultModal, setResultModal] = useState(null)

    useEffect(() => {
        fetchExams()
    }, [])

    const fetchExams = async () => {
        try {
            setLoading(true)
            setError('')

            const token = localStorage.getItem('token')

            const res = await fetch(`${API_BASE_URL}/api/exam-list`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.message || 'Failed to load exams')
                setExams([])
                return
            }

            setExams(data.exams || [])
        } catch (err) {
            console.error('FETCH EXAMS ERROR:', err)
            setError('Server error while loading exams')
            setExams([])
        } finally {
            setLoading(false)
        }
    }

    const viewResult = async examId => {
        try {
            setError('')

            const token = localStorage.getItem('token')

            const res = await fetch(`${API_BASE_URL}/api/exam-list/${examId}/result`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.message || 'Failed to load result')
                return
            }

            setResultModal(data.result)
        } catch (err) {
            console.error('VIEW RESULT ERROR:', err)
            setError('Server error while loading result')
        }
    }

    const filtered = exams.filter(e => {
        if (filter !== 'all' && e.status !== filter) return false
        if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    if (loading) {
        return (
            <div className="animate-slide-up">
                <div className="page-header">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText size={28} /> Examinations
                    </h1>
                    <p>Browse and start available exams</p>
                </div>

                <div className="glass-card" style={{ padding: 20 }}>
                    Loading exams...
                </div>
            </div>
        )
    }

    return (
        <div className="animate-slide-up">
            <div className="page-header">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={28} /> Examinations
                </h1>
                <p>Browse and start available exams</p>
            </div>

            {error && (
                <div className="alert-bar warning" style={{ marginBottom: 16 }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="topbar-search" style={{ minWidth: 280 }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        type="text"
                        placeholder="Search exams..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {['all', 'live', 'upcoming', 'completed'].map(f => (
                    <button
                        key={f}
                        className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            <div className="grid-3">
                {filtered.map((exam, i) => (
                    <div key={exam.id} className="glass-card" style={{ animationDelay: `${i * 0.05}s` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                                    {exam.title}
                                </h3>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                    {exam.subject}
                                </p>
                            </div>

                            <span className={`badge badge-${exam.status}`}>
                                {exam.status}
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <FileText size={14} /> {exam.questions} Questions
                            </span>

                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={14} /> {exam.duration} min
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                            <span>Total: {exam.totalMarks} marks</span>
                            <span>Pass: {exam.passingMarks} marks</span>
                        </div>

                        <div className="progress-bar" style={{ marginBottom: 12 }}>
                            <div
                                className={`fill ${exam.hasResult ? 'green' : exam.status === 'live' ? 'blue' : 'orange'}`}
                                style={{
                                    width: exam.hasResult ? '100%' : exam.status === 'live' ? '60%' : '10%'
                                }}
                            />
                        </div>

                        <div
                            style={{
                                fontSize: 12,
                                color: 'var(--text-muted)',
                                marginBottom: 16,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}
                        >
                            <Calendar size={12} /> {exam.date}
                        </div>

                        {exam.hasResult ? (
                            <button
                                className="btn btn-secondary"
                                style={{ width: '100%', justifyContent: 'center' }}
                                onClick={() => viewResult(exam.id)}
                            >
                                <BarChart size={16} /> View Result
                            </button>
                        ) : exam.status === 'live' ? (
                            <Link
                                to={`/exam/${exam.id}`}
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                <Rocket size={16} /> Start Exam
                            </Link>
                        ) : exam.status === 'upcoming' ? (
                            <button
                                className="btn btn-secondary"
                                style={{ width: '100%', justifyContent: 'center' }}
                                disabled
                            >
                                <Lock size={16} /> Not Available Yet
                            </button>
                        ) : (
                            <button
                                className="btn btn-secondary"
                                style={{ width: '100%', justifyContent: 'center' }}
                                disabled
                            >
                                <Lock size={16} /> Exam Completed
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {!loading && filtered.length === 0 && !error && (
                <div className="glass-card" style={{ padding: 20, marginTop: 20 }}>
                    No exams found.
                </div>
            )}

            {resultModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 520 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BarChart size={22} /> Exam Result
                            </h2>

                            <button className="btn btn-secondary btn-sm" onClick={() => setResultModal(null)}>
                                <XCircle size={14} /> Close
                            </button>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                                {resultModal.exam_title}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                {resultModal.subject}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
                            <div className="stat-card blue">
                                <div className="stat-info">
                                    <h3>{resultModal.total_score}/{resultModal.total_marks}</h3>
                                    <p>Score</p>
                                </div>
                            </div>

                            <div className="stat-card green">
                                <div className="stat-info">
                                    <h3>{resultModal.percentage}%</h3>
                                    <p>Percentage</p>
                                </div>
                            </div>

                            <div className="stat-card orange">
                                <div className="stat-info">
                                    <h3>{resultModal.grade}</h3>
                                    <p>Grade</p>
                                </div>
                            </div>
                        </div>

                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Generated At: {resultModal.generated_at}
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}