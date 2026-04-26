import { useEffect, useState } from 'react'
import { Bot, AlertTriangle, Eye } from '../components/Icons'

export default function Proctoring() {
    const [activityLogs, setActivityLogs] = useState([])
    const [error, setError] = useState('')

    useEffect(() => {
        const token = localStorage.getItem("token")

        fetch("http://127.0.0.1:5000/api/proctoring/", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        .then(res => res.json())
        .then(data => {
            console.log("PROCTORING DATA:", data)

            if (!data.logs) {
                setError(data.message || "Failed to load logs")
                return
            }

            setActivityLogs(data.logs)
        })
        .catch(err => {
            console.error(err)
            setError("Server error")
        })
    }, [])

    return (
        <div className="animate-slide-up">
            <div className="page-header">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Bot size={28} /> AI Proctoring
                </h1>
                <p>Real-Time Exam Monitoring</p>
            </div>

            {error && (
                <div className="alert-bar warning" style={{ marginBottom: 16 }}>
                    {error}
                </div>
            )}

            <div className="glass-card">
                <div className="section-title">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={16} color="var(--accent-red)" /> Recent Alert History
                    </span>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Alert Type</th>
                            <th>Exam</th>
                            <th>Severity</th>
                            <th>Time</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activityLogs.map(log => (
                            <tr key={log.log_id}>
                                <td style={{ fontWeight: 600 }}>{log.student_name}</td>
                                <td>{log.event_type.replaceAll("_", " ")}</td>
                                <td>{log.exam_title}</td>
                                <td>
                                    <span className={`badge ${
                                        log.severity === 'high'
                                            ? 'badge-failed'
                                            : log.severity === 'medium'
                                            ? 'badge-medium'
                                            : 'badge-easy'
                                    }`}>
                                        {log.severity}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>
                                    {new Date(log.detected_at).toLocaleString()}
                                </td>
                                <td>
                                    <button className="btn btn-secondary btn-sm">
                                        <Eye size={14} /> Review
                                    </button>
                                </td>
                            </tr>
                        ))}

                        {activityLogs.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: 20 }}>
                                    No logs found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}