import { useEffect, useState } from 'react'
import { Users, Trash } from '../components/Icons'

export default function StudentManagement() {
    const [studentList, setStudentList] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [saveMessage, setSaveMessage] = useState('')

    useEffect(() => {
        fetchStudents()
    }, [])

    const fetchStudents = async () => {
        try {
            setLoading(true)
            setError('')
            const token = localStorage.getItem('token')

            const res = await fetch('http://localhost:5000/api/students', {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.message || 'Failed to load students')
                return
            }

            setStudentList(data.students || [])
        } catch (err) {
            console.error(err)
            setError('Server error while loading students')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (studentId) => {
        const confirmDelete = window.confirm('Are you sure you want to remove this student?')
        if (!confirmDelete) return

        try {
            setError('')
            setSaveMessage('')
            const token = localStorage.getItem('token')

            const res = await fetch(`http://localhost:5000/api/students/${studentId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.message || 'Failed to delete student')
                return
            }

            setSaveMessage('Student deleted successfully')
            fetchStudents()
        } catch (err) {
            console.error(err)
            setError('Server error while deleting student')
        }
    }

    return (
        <div className="animate-slide-up">
            <div
                className="page-header"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20
                }}
            >
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Users size={28} /> Student Management
                    </h1>
                    <p>View and remove registered student details</p>
                </div>
            </div>

            {error && (
                <div className="alert-bar warning" style={{ marginBottom: 16 }}>
                    {error}
                </div>
            )}

            {saveMessage && (
                <div
                    className="alert-bar"
                    style={{
                        marginBottom: 16,
                        background: 'rgba(34,197,94,0.15)'
                    }}
                >
                    {saveMessage}
                </div>
            )}

            <div
                className="glass-card"
                style={{
                    padding: 0,
                    overflow: 'hidden',
                    borderRadius: 18
                }}
            >
                <div
                    style={{
                        padding: '18px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)'
                    }}
                >
                    <h3 style={{ margin: 0 }}>Registered Students</h3>
                    <p style={{ margin: '4px 0 0 0', opacity: 0.7 }}>
                        Total Students: {studentList.length}
                    </p>
                </div>

                {loading ? (
                    <div style={{ padding: 24 }}>Loading students...</div>
                ) : (
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                        <table
                            className="data-table"
                            style={{
                                width: '100%',
                                minWidth: 850,
                                borderCollapse: 'collapse'
                            }}
                        >
                            <thead>
                                <tr>
                                    <th>Student ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Enrollment No</th>
                                    <th>Department</th>
                                    <th>Semester</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {studentList.map(student => (
                                    <tr key={student.student_id}>
                                        <td style={{ fontWeight: 600 }}>
                                            {student.student_id}
                                        </td>

                                        <td>{student.name || 'N/A'}</td>

                                        <td
                                            style={{
                                                maxWidth: 220,
                                                wordBreak: 'break-word'
                                            }}
                                        >
                                            {student.email || 'N/A'}
                                        </td>

                                        <td>{student.enrollment_no || 'N/A'}</td>

                                        <td>{student.department || 'N/A'}</td>

                                        <td>{student.semester || 'N/A'}</td>

                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDelete(student.student_id)}
                                            >
                                                <Trash size={14} /> Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}

                                {studentList.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: 24 }}>
                                            No students found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}