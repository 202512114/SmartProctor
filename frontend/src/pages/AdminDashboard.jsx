import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CheckCircle, AlertTriangle, ClipboardList, Users, BarChart } from '../components/Icons'

export default function AdminDashboard() {
    const [dashboardStats, setDashboardStats] = useState({
        avgScore: 0,
        warnings: 0,
        exams: 0,
        students: 0
    })

    const [activityLogs, setActivityLogs] = useState([])
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(true)

    const barData = [65, 78, 85, 60, 92, 70, 88, 55, 76, 82, 90, 68]
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')

            const [statsRes, activityRes, resultsRes] = await Promise.all([
                fetch('http://localhost:5000/api/dashboard/stats', {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    }
                }),
                fetch('http://localhost:5000/api/dashboard/activity', {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    }
                }),
                fetch('http://localhost:5000/api/dashboard/recent-results', {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    }
                })
            ])

            const statsData = await statsRes.json()
            const activityData = await activityRes.json()
            const resultsData = await resultsRes.json()

            if (statsRes.ok) {
                setDashboardStats({
                    avgScore: statsData.avgScore || 0,
                    warnings: statsData.warnings || 0,
                    exams: statsData.exams || 0,
                    students: statsData.students || 0
                })
            }

            if (activityRes.ok) {
                setActivityLogs(Array.isArray(activityData) ? activityData : [])
            }

            if (resultsRes.ok) {
                setResults(Array.isArray(resultsData) ? resultsData : [])
            }
        } catch (error) {
            console.error('Dashboard fetch error:', error)
        } finally {
            setLoading(false)
        }
    }

    const getSeverityColor = (severity) => {
        if (severity === 'high') return 'var(--accent-red)'
        if (severity === 'medium') return 'var(--accent-orange)'
        return 'var(--accent-blue)'
    }

    const formatDateTime = (value) => {
        if (!value) return '-'
        const d = new Date(value)
        if (isNaN(d.getTime())) return value
        return d.toLocaleString()
    }

    const getResultBadgeClass = (status) => {
        if (status === 'pass') return 'badge badge-live'
        if (status === 'fail') return 'badge badge-completed'
        return 'badge badge-upcoming'
    }

    return (
        <div className="animate-slide-up">
            <div className="page-header">
                <h1>Results & Analytics</h1>
                <p>Overview of exam performance and system activity</p>
            </div>

            <div className="grid-4" style={{ marginBottom: 28 }}>
                <div className="stat-card green">
                    <div className="stat-icon">
                        <CheckCircle size={22} color="var(--accent-green)" />
                    </div>
                    <div className="stat-info">
                        <h3>{loading ? '...' : `${dashboardStats.avgScore}%`}</h3>
                        <p>Avg Score</p>
                    </div>
                </div>

                <div className="stat-card red">
                    <div className="stat-icon">
                        <AlertTriangle size={22} color="var(--accent-red)" />
                    </div>
                    <div className="stat-info">
                        <h3>{loading ? '...' : dashboardStats.warnings}</h3>
                        <p>Warnings</p>
                    </div>
                </div>

                <div className="stat-card blue">
                    <div className="stat-icon">
                        <ClipboardList size={22} color="var(--accent-blue)" />
                    </div>
                    <div className="stat-info">
                        <h3>{loading ? '...' : dashboardStats.exams}</h3>
                        <p>Exams Conducted</p>
                    </div>
                </div>

                <div className="stat-card purple">
                    <div className="stat-icon">
                        <Users size={22} color="var(--accent-purple)" />
                    </div>
                    <div className="stat-info">
                        <h3>{loading ? '...' : dashboardStats.students}</h3>
                        <p>Students</p>
                    </div>
                </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 28 }}>
                <div className="glass-card">
                    <div className="section-title">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BarChart size={16} /> Performance Chart
                        </span>
                    </div>

                    <div className="chart-bars">
                        {barData.map((h, i) => (
                            <div key={i} className="chart-bar" style={{ height: `${h}%` }}>
                                <span className="chart-label">{months[i]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="glass-card">
                    <div className="section-title">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <AlertTriangle size={16} color="var(--accent-red)" /> Suspicious Activity Log
                        </span>
                    </div>

                    {activityLogs.length > 0 ? (
                        activityLogs.map((log, index) => (
                            <div
                                key={log.log_id || index}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 0',
                                    borderBottom: '1px solid var(--border-glass)'
                                }}
                            >
                                <span
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        display: 'inline-block',
                                        background: getSeverityColor(log.severity)
                                    }}
                                ></span>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                                        {log.message || log.event_type || 'Suspicious activity detected'}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {log.studentName || log.student_id || log.attempt_id || 'Unknown student'}
                                    </div>
                                </div>

                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {log.time || formatDateTime(log.detected_at)}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '10px 0', color: 'var(--text-muted)' }}>
                            No recent suspicious activities
                        </div>
                    )}
                </div>
            </div>

            <div className="glass-card">
                <div className="section-title">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ClipboardList size={16} /> Recent Results
                    </span>
                    <Link to="/results" style={{ fontSize: 13, color: 'var(--accent-blue)', textDecoration: 'none' }}>
                        View All →
                    </Link>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Exam</th>
                            <th>Score</th>
                            <th>Status</th>
                            <th>Warnings</th>
                            <th>Date</th>
                        </tr>
                    </thead>

                    <tbody>
                        {results.length > 0 ? (
                            results.map((r, index) => (
                                <tr key={r.result_id || index}>
                                    <td style={{ fontWeight: 600 }}>
                                        {r.studentName || r.student_id || '-'}
                                    </td>
                                    <td>{r.examTitle || r.exam_id || '-'}</td>
                                    <td>
                                        {r.score !== undefined && r.total !== undefined
                                            ? `${r.score}/${r.total} (${r.percentage || 0}%)`
                                            : `${r.total_score || 0} (${r.percentage || 0}%)`}
                                    </td>
                                    <td>
                                        <span className={getResultBadgeClass(r.status)}>
                                            {r.status || 'pass'}
                                        </span>
                                    </td>
                                    <td>
                                        {(r.warnings || 0) > 0 ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-red)' }}>
                                                <AlertTriangle size={14} /> {r.warnings}
                                            </span>
                                        ) : (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-green)' }}>
                                                <CheckCircle size={14} /> 0
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ color: 'var(--text-muted)' }}>
                                        {r.date || formatDateTime(r.generated_at)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                                    No recent results found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}