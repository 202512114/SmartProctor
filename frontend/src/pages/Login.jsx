import { useState } from 'react'
import { useAuth } from '../App'
import { Lock, Rocket } from '../components/Icons'
import { API_BASE_URL } from '../config'

export default function Login() {
    const { login } = useAuth()

    const [mode, setMode] = useState('login')
    const [role, setRole] = useState('student')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        try {
            const isLogin = mode === "login"

            const url = isLogin
                ? `${API_BASE_URL}/api/auth/login`
                : `${API_BASE_URL}/api/auth/register`

            const payload = isLogin
                ? { email, password, selectedRole: role }
                : { name, email, password, role }

            console.log("MODE:", mode)
            console.log("PAYLOAD:", payload)

            const res = await fetch(url, {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json()

            console.log("RESPONSE:", data)

            if (!res.ok) {
                setError(data.message || "Something went wrong")
                return
            }

            localStorage.setItem("token", data.token)
            localStorage.setItem("user", JSON.stringify(data.user))

            login(data.user, data.token)

        } catch (err) {
            console.error("ERROR:", err)
            setError("Server error")
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">

                <div className="logo-area">
                    <div className="logo-circle">S</div>
                    <h1>SmartProctor</h1>
                    <p>AI-Enabled Secure Examination System</p>
                </div>

                <div className="role-toggle">
                    <button
                        type="button"
                        className={role === 'student' ? 'active' : ''}
                        onClick={() => setRole('student')}
                    >
                        Student
                    </button>

                    <button
                        type="button"
                        className={role === 'admin' ? 'active' : ''}
                        onClick={() => setRole('admin')}
                    >
                        Teacher
                    </button>
                </div>

                <form onSubmit={handleSubmit}>

                    {mode === 'register' && (
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                className="form-input"
                                type="text"
                                placeholder="Enter your name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            className="form-input"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="alert-bar warning">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', justifyContent: 'center' }}
                    >
                        {mode === 'login'
                            ? <><Lock size={16} /> Sign In</>
                            : <><Rocket size={16} /> Create Account</>
                        }
                    </button>

                </form>

                <div className="switch-mode">
                    {mode === 'login' ? (
                        <>
                            Don't have an account?{' '}
                            <a onClick={() => setMode('register')}>
                                Register
                            </a>
                        </>
                    ) : (
                        <>
                            Already have an account?{' '}
                            <a onClick={() => setMode('login')}>
                                Sign In
                            </a>
                        </>
                    )}
                </div>

            </div>
        </div>
    )
}