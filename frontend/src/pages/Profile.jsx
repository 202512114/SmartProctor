import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
    const navigate = useNavigate()
    const saveTimer = useRef(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [saveMessage, setSaveMessage] = useState('')

    const [user, setUser] = useState({
        name: '',
        role: '',
        email: '',
        joined: '',
        avatar: '',
        statusLabel: '',
        studentId: '',
        department: '',
        semester: '',
        profilePhoto: '',
        designation: '',
        privilegeLevel: '',
        lastExam: '',
        performance: '',
        examsTaken: 0,
        avgScore: '0%',
        warnings: 0
    })

    useEffect(() => {
        fetchProfile()

        return () => {
            if (saveTimer.current) {
                clearTimeout(saveTimer.current)
            }
        }
    }, [])

    const fetchProfile = async () => {
        try {
            setLoading(true)
            setError('')

            const token = localStorage.getItem('token')

            const res = await fetch('http://localhost:5000/api/profile', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.message || 'Failed to load profile')
                return
            }

            setUser({
                name: data.name || '',
                role: data.role || '',
                email: data.email || '',
                joined: data.joined || '',
                avatar: data.avatar || '',
                statusLabel: data.statusLabel || 'Active User',
                studentId: data.studentId || '',
                department: data.department || '',
                semester: data.semester || '',
                profilePhoto: data.profilePhoto || '',
                designation: data.designation || '',
                privilegeLevel: data.privilegeLevel || '',
                lastExam: data.lastExam || 'Not available',
                performance: data.performance || 'Not available',
                examsTaken: data.examsTaken || 0,
                avgScore: data.avgScore || '0%',
                warnings: data.warnings || 0
            })
        } catch (err) {
            console.error('PROFILE LOAD ERROR:', err)
            setError('Server error while loading profile')
        } finally {
            setLoading(false)
        }
    }

    const autoSave = async updatedUser => {
        try {
            setSaving(true)
            setError('')
            setSaveMessage('')

            const token = localStorage.getItem('token')

            const res = await fetch('http://localhost:5000/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: updatedUser.name,
                    email: updatedUser.email,
                    avatar: updatedUser.avatar,
                    studentId: updatedUser.studentId,
                    department: updatedUser.department,
                    semester: updatedUser.semester,
                    profilePhoto: updatedUser.profilePhoto,
                    designation: updatedUser.designation,
                    privilegeLevel: updatedUser.privilegeLevel
                })
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.message || 'Failed to save profile')
                return
            }

            const storedUser = JSON.parse(localStorage.getItem('user') || '{}')

            storedUser.name = data.user?.name || updatedUser.name
            storedUser.email = data.user?.email || updatedUser.email
            storedUser.avatar = data.user?.avatar || updatedUser.avatar || updatedUser.profilePhoto || ''
            storedUser.role = data.user?.role || updatedUser.role

            localStorage.setItem('user', JSON.stringify(storedUser))

            setSaveMessage('Profile auto-saved')
            setTimeout(() => setSaveMessage(''), 1600)
        } catch (err) {
            console.error('PROFILE SAVE ERROR:', err)
            setError('Server error while saving profile')
        } finally {
            setSaving(false)
        }
    }

    const handleChange = (field, value) => {
        setError('')
        setSaveMessage('')

        const updatedUser = {
            ...user,
            [field]: value
        }

        setUser(updatedUser)

        if (saveTimer.current) {
            clearTimeout(saveTimer.current)
        }

        saveTimer.current = setTimeout(() => {
            autoSave(updatedUser)
        }, 800)
    }

    const goBack = () => {
        if (user.role === 'admin') {
            navigate('/admin')
        } else {
            navigate('/dashboard')
        }
    }

    const isStudent = user.role === 'student'
    const isAdmin = user.role === 'admin'
    const imageUrl = isStudent ? user.profilePhoto : user.avatar

    if (loading) {
        return (
            <div className="animate-slide-up">
                <div className="page-header">
                    <h1>Profile Settings</h1>
                    <p>Loading your profile...</p>
                </div>

                <div className="glass-card" style={{ padding: 24 }}>
                    Loading profile...
                </div>
            </div>
        )
    }

    return (
        <div className="animate-slide-up">
            <div
                className="page-header"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16
                }}
            >
                <div>
                    <h1>Profile Settings</h1>
                    <p>Manage your account information and academic details</p>
                </div>

                <button className="btn btn-secondary" onClick={goBack}>
                    ← Back
                </button>
            </div>

            {(error || saveMessage || saving) && (
                <div style={{ marginBottom: 16 }}>
                    {error && (
                        <div className="alert-bar warning">
                            {error}
                        </div>
                    )}

                    {!error && saving && (
                        <div className="alert-bar" style={{ background: 'rgba(79,140,255,0.15)' }}>
                            Saving changes...
                        </div>
                    )}

                    {!error && !saving && saveMessage && (
                        <div className="alert-bar" style={{ background: 'rgba(34,197,94,0.15)' }}>
                            {saveMessage}
                        </div>
                    )}
                </div>
            )}

            {isStudent && (
                <div className="grid-3" style={{ marginBottom: 24 }}>
                    <InfoCard title="Exams Taken" value={user.examsTaken} color="#4f8cff" />
                    <InfoCard title="Average Score" value={user.avgScore} color="#22c55e" />
                    <InfoCard title="Warnings" value={user.warnings} color="#ef4444" />
                </div>
            )}

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '280px minmax(0, 1fr)',
                    gap: 24,
                    alignItems: 'flex-start'
                }}
            >
                <div
                    className="glass-card"
                    style={{
                        padding: 24,
                        textAlign: 'center',
                        boxShadow: '0 0 30px rgba(79,140,255,0.15)'
                    }}
                >
                    <div
                        style={{
                            width: 96,
                            height: 96,
                            borderRadius: '50%',
                            background: imageUrl
                                ? `url(${imageUrl}) center/cover`
                                : 'linear-gradient(135deg, #4f8cff, #6ed0ff)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 34,
                            fontWeight: 800,
                            margin: '0 auto 14px',
                            boxShadow: '0 0 20px rgba(79,140,255,0.6)'
                        }}
                    >
                        {!imageUrl && (user.name ? user.name.charAt(0).toUpperCase() : 'U')}
                    </div>

                    <h3 style={{ marginBottom: 4 }}>{user.name || 'User'}</h3>

                    <p style={{ color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 4 }}>
                        {user.role || 'User'}
                    </p>

                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Joined: {user.joined || '-'}
                    </p>

                    <div
                        style={{
                            marginTop: 12,
                            padding: '5px 12px',
                            background: 'rgba(79,140,255,0.2)',
                            borderRadius: 14,
                            display: 'inline-block',
                            fontSize: 12
                        }}
                    >
                        {user.statusLabel || 'Active User'}
                    </div>
                </div>

                <div
                    className="glass-card"
                    style={{
                        padding: 24,
                        boxShadow: '0 0 25px rgba(0,0,0,0.3)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
                        <div>
                            <h3 style={{ marginBottom: 4 }}>Account Information</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                Changes are saved automatically
                            </p>
                        </div>

                        <span
                            className={`badge ${saving ? 'badge-upcoming' : 'badge-live'}`}
                            style={{ height: 'fit-content' }}
                        >
                            {saving ? 'Saving' : 'Auto Save On'}
                        </span>
                    </div>

                    <hr style={{ opacity: 0.1, marginBottom: 20 }} />

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: 16
                        }}
                    >
                        <Input
                            label="Name"
                            value={user.name}
                            onChange={value => handleChange('name', value)}
                        />

                        <Input
                            label="Email"
                            value={user.email}
                            onChange={value => handleChange('email', value)}
                        />

                        <Input
                            label="Role"
                            value={user.role}
                            disabled
                        />

                        <Input
                            label="Joined"
                            value={user.joined}
                            disabled
                        />

                        {isStudent && (
                            <>
                                <Input
                                    label="Student ID"
                                    value={user.studentId}
                                    onChange={value => handleChange('studentId', value)}
                                />

                                <Input
                                    label="Department"
                                    value={user.department}
                                    onChange={value => handleChange('department', value)}
                                />

                                <Input
                                    label="Semester"
                                    value={user.semester}
                                    onChange={value => handleChange('semester', value)}
                                />

                                <Input
                                    label="Profile Photo URL"
                                    value={user.profilePhoto}
                                    onChange={value => handleChange('profilePhoto', value)}
                                />

                                <Input
                                    label="Last Exam"
                                    value={user.lastExam}
                                    disabled
                                />

                                <Input
                                    label="Performance"
                                    value={user.performance}
                                    disabled
                                />
                            </>
                        )}

                        {isAdmin && (
                            <>
                                <Input
                                    label="Designation"
                                    value={user.designation}
                                    onChange={value => handleChange('designation', value)}
                                />

                                <Input
                                    label="Privilege Level"
                                    value={user.privilegeLevel}
                                    onChange={value => handleChange('privilegeLevel', value)}
                                />

                                <Input
                                    label="Avatar URL"
                                    value={user.avatar}
                                    onChange={value => handleChange('avatar', value)}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function InfoCard({ title, value, color }) {
    return (
        <div className="glass-card" style={{ padding: 16 }}>
            <h2 style={{ color, marginBottom: 4 }}>{value}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{title}</p>
        </div>
    )
}

function Input({ label, value, onChange, disabled = false }) {
    return (
        <div>
            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {label}
            </label>

            <input
                value={value || ''}
                disabled={disabled}
                onChange={disabled ? undefined : e => onChange(e.target.value)}
                style={{
                    width: '100%',
                    marginTop: 6,
                    padding: '11px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                    color: disabled ? 'var(--text-muted)' : 'white',
                    outline: 'none',
                    cursor: disabled ? 'not-allowed' : 'text'
                }}
            />
        </div>
    )
}