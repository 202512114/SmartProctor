import { useState, useEffect } from 'react'
import { BarChart, ClipboardList, FileText, TrendingUp, AlertTriangle, CheckCircle, Users, Ban, Armchair, RefreshCw } from '../components/Icons'

const alertIcons = {
    multiple_faces: <Users size={14} />,
    no_face: <Ban size={14} />,
    left_seat: <Armchair size={14} />,
    tab_switch: <RefreshCw size={14} />
}

export default function Results() {
    const [tab, setTab] = useState('results')
    const [results, setResults] = useState([])
    const [activityLogs, setActivityLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const token = localStorage.getItem("token")

        const fetchResults = async () => {
            try {
                setLoading(true)
                setError('')

                const res = await fetch("http://127.0.0.1:5000/api/results/", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

                const data = await res.json()
                console.log("API DATA:", data)

                if (!res.ok) {
                    setError(data.message || "Failed to load results")
                    return
                }

                setResults(data.results || [])
                setActivityLogs(data.activity_logs || [])
            } catch (err) {
                console.error(err)
                setError("Server error while loading results")
            } finally {
                setLoading(false)
            }
        }

        fetchResults()
    }, [])

    const barData = [65, 78, 85, 60, 92, 70, 88, 55, 76, 82, 90, 68]
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    return (
        <div className="animate-slide-up">
            <div className="page-header">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BarChart size={28} /> Results & Analytics
                </h1>
                <p>View exam performance and activity logs</p>
            </div>

            {error && (
                <div className="alert-bar warning" style={{ marginBottom: 16 }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <button
                    className={`btn btn-sm ${tab === 'results' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTab('results')}
                >
                    <ClipboardList size={14} /> Results
                </button>

                <button
                    className={`btn btn-sm ${tab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTab('analytics')}
                >
                    <BarChart size={14} /> Analytics
                </button>

                <button
                    className={`btn btn-sm ${tab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setTab('logs')}
                >
                    <FileText size={14} /> Activity Logs
                </button>
            </div>

            {tab === 'results' && (
                <div className="glass-card">
                    <div className="section-title">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ClipboardList size={16} /> All Results
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ padding: 16 }}>Loading results...</div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Exam</th>
                                    <th>Score</th>
                                    <th>Percentage</th>
                                    <th>Status</th>
                                    <th>Warnings</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map(r => {
                                    const percentage = Math.round(r.percentage || 0)
                                    const status = percentage >= 40 ? "passed" : "failed"
                                    const total = r.total_marks || 100

                                    return (
                                        <tr key={r.result_id}>
                                            <td>{r.student_name || 'Student'}</td>
                                            <td>{r.exam_title || `Exam ${r.exam_id}`}</td>
                                            <td>{r.total_score}/{total}</td>

                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div className="progress-bar" style={{ width: 80 }}>
                                                        <div
                                                            className={`fill ${percentage >= 70 ? 'green' : percentage >= 40 ? 'orange' : 'red'}`}
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                    <span style={{ fontSize: 13 }}>{percentage}%</span>
                                                </div>
                                            </td>

                                            <td>
                                                <span className={`badge badge-${status}`}>
                                                    {status.toUpperCase()}
                                                </span>
                                            </td>

                                            <td>
                                                {r.warnings > 0 ? (
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
                                                {r.generated_at ? new Date(r.generated_at).toLocaleDateString() : '-'}
                                            </td>
                                        </tr>
                                    )
                                })}

                                {!loading && results.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: 20 }}>
                                            No results found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {tab === 'analytics' && (
                <div className="grid-2">
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
                                <TrendingUp size={16} /> Score Distribution
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                            {['90-100%', '70-89%', '40-69%', '0-39%'].map((range, i) => {
                                const widths = [20, 45, 25, 10]
                                const colors = ['green', 'blue', 'orange', 'red']

                                return (
                                    <div key={range} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span style={{ fontSize: 12, width: 70, color: 'var(--text-muted)' }}>{range}</span>
                                        <div className="progress-bar" style={{ flex: 1 }}>
                                            <div className={`fill ${colors[i]}`} style={{ width: `${widths[i]}%` }} />
                                        </div>
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 30 }}>{widths[i]}%</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {tab === 'logs' && (
                <div className="glass-card">
                    <div className="section-title">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={16} /> Suspicious Activity Logs
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ padding: 16 }}>Loading logs...</div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Activity</th>
                                    <th>Exam</th>
                                    <th>Severity</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activityLogs.map(log => (
                                    <tr key={log.log_id}>
                                        <td style={{ fontWeight: 600 }}>{log.student_name}</td>
                                        <td>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {alertIcons[log.type] || <AlertTriangle size={14} />}
                                                {log.message}
                                            </span>
                                        </td>
                                        <td>{log.exam_title}</td>
                                        <td>
                                            <span className={`badge badge-${log.severity === 'high' ? 'failed' : log.severity === 'medium' ? 'medium' : 'easy'}`}>
                                                {log.severity}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)' }}>
                                            {log.time ? new Date(log.time).toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                ))}

                                {!loading && activityLogs.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>
                                            No activity logs found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    )
}