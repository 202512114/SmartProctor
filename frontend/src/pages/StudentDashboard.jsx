import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
    ClipboardList,
    Users,
    AlertTriangle,
    Target,
    Rocket,
    Bot,
    FileText,
    Ban,
    Armchair,
    RefreshCw,
    BarChart,
    Clock
} from '../components/Icons'

export default function StudentDashboard() {
    const [dashboard, setDashboard] = useState({
        studentName: 'Student',
        stats: {
            todayExams: 0,
            liveExams: 0,
            upcomingExams: 0,
            completedExams: 0,
            alertsToday: 0,
            averageScore: 0
        },
        todayExams: [],
        recentAlerts: [],
        recentResults: []
    })

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const alertIcons = {
        multiple_faces: <Users size={16} />,
        no_face: <Ban size={16} />,
        left_seat: <Armchair size={16} />,
        tab_switch: <RefreshCw size={16} />,
        warning: <AlertTriangle size={16} />
    }

    useEffect(() => {
        fetchDashboard()
    }, [])

    const fetchDashboard = async () => {
        try {
            setLoading(true)
            setError('')

            const token = localStorage.getItem('token')

            const res = await fetch('http://localhost:5000/api/student-dashboard/summary', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.message || 'Failed to load dashboard')
                return
            }

            setDashboard(data)
        } catch (err) {
            console.error('DASHBOARD ERROR:', err)
            setError('Server error while loading dashboard')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="animate-slide-up">
                <div className="page-header">
                    <h1>Welcome to SmartProctor!</h1>
                    <p>Loading your student dashboard...</p>
                </div>

                <div className="glass-card" style={{ padding: 20 }}>
                    Loading dashboard...
                </div>
            </div>
        )
    }

    return (
        <div className="animate-slide-up">
            <div className="page-header">
                <h1>Welcome, {dashboard.studentName}!</h1>
                <p>Your real-time exam activity and performance dashboard</p>
            </div>

            {error && (
                <div className="alert-bar warning" style={{ marginBottom: 16 }}>
                    {error}
                </div>
            )}

            <div className="grid-4" style={{ marginBottom: 28 }}>
                <div className="stat-card blue">
                    <div className="stat-icon">
                        <ClipboardList size={22} color="var(--accent-blue)" />
                    </div>
                    <div className="stat-info">
                        <h3>{dashboard.stats.todayExams}</h3>
                        <p>Today&apos;s Exams</p>
                    </div>
                </div>

                <div className="stat-card green">
                    <div className="stat-icon">
                        <Rocket size={22} color="var(--accent-green)" />
                    </div>
                    <div className="stat-info">
                        <h3>{dashboard.stats.liveExams}</h3>
                        <p>Live Exams</p>
                    </div>
                </div>

                <div className="stat-card red">
                    <div className="stat-icon">
                        <AlertTriangle size={22} color="var(--accent-red)" />
                    </div>
                    <div className="stat-info">
                        <h3>{dashboard.stats.alertsToday}</h3>
                        <p>Alerts Today</p>
                    </div>
                </div>

                <div className="stat-card orange">
                    <div className="stat-icon">
                        <Target size={22} color="var(--accent-orange)" />
                    </div>
                    <div className="stat-info">
                        <h3>{dashboard.stats.averageScore}%</h3>
                        <p>Average Score</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
                <Link to="/exam-list" className="btn btn-primary btn-lg">
                    <Rocket size={18} /> Start Exam
                </Link>

                <Link to="/results" className="btn btn-secondary btn-lg">
                    <BarChart size={18} /> View Results
                </Link>
            </div>

            <div className="grid-2">
                <div className="glass-card">
                    <div className="section-title">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={16} /> Today&apos;s Exams
                        </span>

                        <Link
                            to="/exam-list"
                            style={{ fontSize: 13, color: 'var(--accent-blue)', textDecoration: 'none' }}
                        >
                            View All →
                        </Link>
                    </div>

                    {dashboard.todayExams.length === 0 ? (
                        <div style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                            No exams scheduled for today.
                        </div>
                    ) : (
                        dashboard.todayExams.map(exam => (
                            <div
                                key={exam.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 0',
                                    borderBottom: '1px solid var(--border-glass)',
                                    gap: 12
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                                        {exam.title}
                                    </div>

                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <Clock size={12} />
                                        {exam.time} • {exam.questions} Q • {exam.duration} min
                                    </div>
                                </div>

                                <span className={`badge badge-${exam.status}`}>
                                    {exam.status}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <div className="glass-card">
                    <div className="section-title">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertTriangle size={16} color="var(--accent-red)" /> My Alerts
                        </span>

                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Today
                        </span>
                    </div>

                    {dashboard.recentAlerts.length === 0 ? (
                        <div style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                            No suspicious activity detected today.
                        </div>
                    ) : (
                        dashboard.recentAlerts.map(log => (
                            <div
                                key={log.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 0',
                                    borderBottom: '1px solid var(--border-glass)',
                                    gap: 12
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ color: 'var(--accent-red)' }}>
                                        {alertIcons[log.type] || <AlertTriangle size={16} />}
                                    </span>

                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                                            {log.message}
                                        </div>

                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            Severity: {log.severity}
                                        </div>
                                    </div>
                                </div>

                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {log.time}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="glass-card" style={{ marginTop: 24 }}>
                <div className="section-title">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BarChart size={16} /> Recent Results
                    </span>

                    <Link
                        to="/results"
                        style={{ fontSize: 13, color: 'var(--accent-blue)', textDecoration: 'none' }}
                    >
                        View All →
                    </Link>
                </div>

                {dashboard.recentResults.length === 0 ? (
                    <div style={{ padding: '14px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                        No results generated yet.
                    </div>
                ) : (
                    dashboard.recentResults.map(result => (
                        <div
                            key={result.id}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1.6fr 0.7fr 0.7fr 0.5fr',
                                gap: 12,
                                alignItems: 'center',
                                padding: '12px 0',
                                borderBottom: '1px solid var(--border-glass)'
                            }}
                        >
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>
                                    {result.exam_title}
                                </div>

                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {result.generated_at}
                                </div>
                            </div>

                            <div style={{ fontSize: 13 }}>
                                {result.total_score}/{result.total_marks}
                            </div>

                            <div style={{ fontSize: 13 }}>
                                {result.percentage}%
                            </div>

                            <span className={`badge ${Number(result.percentage) >= 40 ? 'badge-passed' : 'badge-failed'}`}>
                                {result.grade}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}