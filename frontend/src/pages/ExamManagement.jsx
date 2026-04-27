import { useEffect, useState } from 'react'
import { Settings, Plus, Edit, Trash, Save } from '../components/Icons'
import { API_BASE_URL } from '../config'

const emptyQuestion = () => ({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'A',
    marks: 1
})

export default function ExamManagement() {
    const [examList, setExamList] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [saveMessage, setSaveMessage] = useState('')

    const [form, setForm] = useState({
        title: '',
        subject: '',
        duration_minutes: 30,
        scheduled_at: '',
        questions: [emptyQuestion()]
    })

    useEffect(() => {
        fetchExams()
    }, [])

    const formatDateTimeForInput = (dateString) => {
        if (!dateString) return ''
        const d = new Date(dateString)
        if (isNaN(d.getTime())) return ''
        const pad = (n) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    const formatDisplayDate = (dateString) => {
        if (!dateString) return '-'
        const d = new Date(dateString)
        if (isNaN(d.getTime())) return dateString
        return d.toLocaleString()
    }

    const fetchExams = async () => {
        try {
            setLoading(true)
            setError('')
            setSaveMessage('')

            const token = localStorage.getItem('token')

            const res = await fetch(`${API_BASE_URL}/api/exams`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await res.json()

            if (!res.ok) {
                setExamList([])
                setError(data.message || 'Failed to load exams')
                return
            }

            setExamList(Array.isArray(data.exams) ? data.exams : [])
        } catch (err) {
            console.error(err)
            setExamList([])
            setError('Server error while loading exams')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setForm({
            title: '',
            subject: '',
            duration_minutes: 30,
            scheduled_at: '',
            questions: [emptyQuestion()]
        })
        setEditId(null)
        setError('')
    }

    const addQuestion = () => {
        setForm((prev) => ({
            ...prev,
            questions: [...prev.questions, emptyQuestion()]
        }))
    }

    const removeQuestion = (index) => {
        setForm((prev) => ({
            ...prev,
            questions: prev.questions.length === 1
                ? [emptyQuestion()]
                : prev.questions.filter((_, i) => i !== index)
        }))
    }

    const updateQuestion = (index, field, value) => {
        setForm((prev) => ({
            ...prev,
            questions: prev.questions.map((q, i) =>
                i === index ? { ...q, [field]: value } : q
            )
        }))
    }

    const calculateTotalMarks = () => {
        return form.questions.reduce((sum, q) => sum + (parseInt(q.marks, 10) || 0), 0)
    }

    const validateForm = () => {
        if (!form.title.trim() || !form.subject.trim() || !form.scheduled_at) {
            setError('Please fill all exam details')
            return false
        }

        if (!form.questions.length) {
            setError('At least one question is required')
            return false
        }

        for (let i = 0; i < form.questions.length; i++) {
            const q = form.questions[i]
            if (
                !q.question_text.trim() ||
                !q.option_a.trim() ||
                !q.option_b.trim() ||
                !q.option_c.trim() ||
                !q.option_d.trim()
            ) {
                setError(`Please complete all fields for question ${i + 1}`)
                return false
            }
        }

        return true
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (saving) return

        setError('')
        setSaveMessage('')

        if (!validateForm()) return

        try {
            setSaving(true)
            const token = localStorage.getItem('token')

            if (!token) {
                setError('Login token not found. Please login again.')
                return
            }

            const payload = {
                title: form.title.trim(),
                subject: form.subject.trim(),
                duration_minutes: parseInt(form.duration_minutes, 10),
                scheduled_at: form.scheduled_at,
                total_marks: calculateTotalMarks(),
                questions: form.questions.map((q) => ({
                    question_text: q.question_text.trim(),
                    option_a: q.option_a.trim(),
                    option_b: q.option_b.trim(),
                    option_c: q.option_c.trim(),
                    option_d: q.option_d.trim(),
                    correct_option: q.correct_option,
                    marks: parseInt(q.marks, 10)
                }))
            }

            const url = editId
                ? `${API_BASE_URL}/api/exams/${editId}`
                : `${API_BASE_URL}/api/exams`

            const method = editId ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            let data = {}
            try {
                data = await res.json()
            } catch (jsonErr) {
                console.error('JSON parse error:', jsonErr)
            }

            if (!res.ok) {
                setError(data.message || 'Failed to save exam')
                return
            }

            setSaveMessage(editId ? 'Exam updated successfully' : 'Exam created successfully')
            setShowForm(false)
            resetForm()
            await fetchExams()
        } catch (err) {
            console.error(err)
            setError('Server error while saving exam')
        } finally {
            setSaving(false)
        }
    }

    const handleEdit = async (examId) => {
        try {
            setError('')
            const token = localStorage.getItem('token')

            const res = await fetch(`${API_BASE_URL}/api/exams/${examId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.message || 'Failed to load exam details')
                return
            }

            setForm({
                title: data.exam?.title || '',
                subject: data.exam?.subject || '',
                duration_minutes: data.exam?.duration_minutes || 30,
                scheduled_at: formatDateTimeForInput(data.exam?.scheduled_at),
                questions: Array.isArray(data.questions) && data.questions.length > 0
                    ? data.questions.map((q) => ({
                        question_text: q.question_text || '',
                        option_a: q.option_a || '',
                        option_b: q.option_b || '',
                        option_c: q.option_c || '',
                        option_d: q.option_d || '',
                        correct_option: q.correct_option || 'A',
                        marks: q.marks || 1
                    }))
                    : [emptyQuestion()]
            })

            setEditId(examId)
            setShowForm(true)
        } catch (err) {
            console.error(err)
            setError('Server error while loading exam details')
        }
    }

    const handleDelete = async (examId) => {
        try {
            setError('')
            const token = localStorage.getItem('token')

            const res = await fetch(`${API_BASE_URL}/api/exams/${examId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.message || 'Failed to delete exam')
                return
            }

            setSaveMessage('Exam deleted successfully')
            await fetchExams()
        } catch (err) {
            console.error(err)
            setError('Server error while deleting exam')
        }
    }

    const badgeClass = (status) => {
        if (status === 'live') return 'badge badge-live'
        if (status === 'completed') return 'badge badge-completed'
        return 'badge badge-upcoming'
    }

    return (
        <div className="animate-slide-up">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Settings size={28} /> Exam Management
                    </h1>
                    <p>Create, edit, and manage only your own examinations</p>
                </div>

                <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => {
                        resetForm()
                        setShowForm(true)
                    }}
                >
                    <Plus size={16} /> Create Exam
                </button>
            </div>

            {error && <div className="alert-bar warning" style={{ marginBottom: 16 }}>{error}</div>}
            {saveMessage && (
                <div className="alert-bar" style={{ marginBottom: 16, background: 'rgba(34,197,94,0.15)' }}>
                    {saveMessage}
                </div>
            )}

            <div className="glass-card">
                {loading ? (
                    <div style={{ padding: 20 }}>Loading exams...</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Exam</th>
                                <th>Subject</th>
                                <th>Duration</th>
                                <th>Marks</th>
                                <th>Scheduled</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {examList.length > 0 ? (
                                examList.map((exam) => (
                                    <tr key={exam.exam_id}>
                                        <td style={{ fontWeight: 600 }}>{exam.title || '-'}</td>
                                        <td>{exam.subject || '-'}</td>
                                        <td>{exam.duration_minutes ? `${exam.duration_minutes} min` : '-'}</td>
                                        <td>{exam.total_marks ?? '-'}</td>
                                        <td>{formatDisplayDate(exam.scheduled_at)}</td>
                                        <td>
                                            <span className={badgeClass(exam.status)}>
                                                {exam.status || 'upcoming'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    type="button"
                                                    onClick={() => handleEdit(exam.exam_id)}
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    type="button"
                                                    onClick={() => handleDelete(exam.exam_id)}
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: 20 }}>
                                        No exams found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 900, maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {editId ? <><Edit size={20} /> Edit Exam</> : <><Plus size={20} /> Create New Exam</>}
                        </h2>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Exam Title</label>
                                    <input
                                        className="form-input"
                                        value={form.title}
                                        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Subject</label>
                                    <input
                                        className="form-input"
                                        value={form.subject}
                                        onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid-2">
                                <div className="form-group">
                                    <label>Duration (minutes)</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        min="1"
                                        value={form.duration_minutes}
                                        onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Scheduled At</label>
                                    <input
                                        className="form-input"
                                        type="datetime-local"
                                        value={form.scheduled_at}
                                        onChange={(e) => setForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="glass-card" style={{ padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <h3 style={{ margin: 0 }}>Questions</h3>
                                    <button type="button" className="btn btn-primary btn-sm" onClick={addQuestion}>
                                        <Plus size={14} /> Add Question
                                    </button>
                                </div>

                                {form.questions.map((question, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: 12,
                                            padding: 16,
                                            marginBottom: 16
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <h4 style={{ margin: 0 }}>Question {index + 1}</h4>
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={() => removeQuestion(index)}
                                            >
                                                <Trash size={14} />
                                            </button>
                                        </div>

                                        <div className="form-group">
                                            <label>Question Text</label>
                                            <textarea
                                                className="form-input"
                                                rows="3"
                                                value={question.question_text}
                                                onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="grid-2">
                                            <div className="form-group">
                                                <label>Option A</label>
                                                <input
                                                    className="form-input"
                                                    value={question.option_a}
                                                    onChange={(e) => updateQuestion(index, 'option_a', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Option B</label>
                                                <input
                                                    className="form-input"
                                                    value={question.option_b}
                                                    onChange={(e) => updateQuestion(index, 'option_b', e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid-2">
                                            <div className="form-group">
                                                <label>Option C</label>
                                                <input
                                                    className="form-input"
                                                    value={question.option_c}
                                                    onChange={(e) => updateQuestion(index, 'option_c', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Option D</label>
                                                <input
                                                    className="form-input"
                                                    value={question.option_d}
                                                    onChange={(e) => updateQuestion(index, 'option_d', e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid-2">
                                            <div className="form-group">
                                                <label>Correct Option</label>
                                                <select
                                                    className="form-select"
                                                    value={question.correct_option}
                                                    onChange={(e) => updateQuestion(index, 'correct_option', e.target.value)}
                                                >
                                                    <option value="A">A</option>
                                                    <option value="B">B</option>
                                                    <option value="C">C</option>
                                                    <option value="D">D</option>
                                                </select>
                                            </div>

                                            <div className="form-group">
                                                <label>Marks</label>
                                                <input
                                                    className="form-input"
                                                    type="number"
                                                    min="1"
                                                    value={question.marks}
                                                    onChange={(e) => updateQuestion(index, 'marks', e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <div style={{ fontWeight: 600, marginTop: 8 }}>
                                    Total Marks: {calculateTotalMarks()}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowForm(false)
                                        resetForm()
                                    }}
                                >
                                    Cancel
                                </button>

                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {editId ? <><Save size={16} /> Save Changes</> : <><Plus size={16} /> {saving ? 'Creating...' : 'Create Exam'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
