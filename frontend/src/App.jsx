import { useState, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'

import Login from './pages/Login'
import StudentDashboard from './pages/StudentDashboard'
import AdminDashboard from './pages/AdminDashboard'
import ExamList from './pages/ExamList'
import ExamTaking from './pages/ExamTaking'
import PracticeQuiz from './pages/PracticeQuiz'
import Results from './pages/Results'
import Proctoring from './pages/Proctoring'
import ExamManagement from './pages/ExamManagement'
import StudentManagement from './pages/StudentManagement'
import Profile from './pages/Profile'

export const AuthContext = createContext(null)

export function useAuth() {
    return useContext(AuthContext)
}

function getSavedUser() {
    try {
        const savedUser = localStorage.getItem('user')
        const token = localStorage.getItem('token')

        if (!savedUser || !token) {
            return null
        }

        return JSON.parse(savedUser)
    } catch (error) {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        return null
    }
}

function getHomePath(user) {
    if (!user) {
        return '/login'
    }

    return user.role === 'admin' ? '/admin' : '/dashboard'
}

function Layout({ children, pageTitle }) {
    return (
        <div className="app-layout">
            <Sidebar />

            <div className="main-area">
                <Topbar title={pageTitle} />

                <main
                    className="page-content"
                    style={{
                        width: '100%',
                        minHeight: 'calc(100vh - 70px)',
                        overflowX: 'hidden'
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    )
}

function ProtectedRoute({ user, allowedRoles, children }) {
    const location = useLocation()

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={getHomePath(user)} replace />
    }

    return children
}

function PublicRoute({ user, children }) {
    if (user) {
        return <Navigate to={getHomePath(user)} replace />
    }

    return children
}

function App() {
    const [user, setUser] = useState(getSavedUser)

    const login = (userData, token) => {
        if (!userData || !token) {
            return
        }

        setUser(userData)
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('token', token)
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('user')
        localStorage.removeItem('token')
    }

    const authValue = {
        user,
        login,
        logout,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        isStudent: user?.role === 'student'
    }

    return (
        <AuthContext.Provider value={authValue}>
            <BrowserRouter>
                <Routes>
                    <Route
                        path="/login"
                        element={
                            <PublicRoute user={user}>
                                <Login />
                            </PublicRoute>
                        }
                    />

                    <Route
                        path="/"
                        element={<Navigate to={getHomePath(user)} replace />}
                    />

                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute user={user} allowedRoles={['student']}>
                                <Layout pageTitle="Dashboard">
                                    <StudentDashboard />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute user={user} allowedRoles={['admin']}>
                                <Layout pageTitle="Admin Dashboard">
                                    <AdminDashboard />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/exam-list"
                        element={
                            <ProtectedRoute user={user} allowedRoles={['student']}>
                                <Layout pageTitle="Examinations">
                                    <ExamList />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/exams"
                        element={<Navigate to="/exam-list" replace />}
                    />

                    <Route
                        path="/exam/:examId"
                        element={
                            <ProtectedRoute user={user} allowedRoles={['student']}>
                                <Layout pageTitle="Exam">
                                    <ExamTaking />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/practice"
                        element={
                            <ProtectedRoute user={user} allowedRoles={['student']}>
                                <Layout pageTitle="Practice Quizzes">
                                    <PracticeQuiz />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/results"
                        element={
                            <ProtectedRoute user={user} allowedRoles={['student', 'admin']}>
                                <Layout pageTitle="Results & Analytics">
                                    <Results />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/proctoring"
                        element={
                            <ProtectedRoute user={user} allowedRoles={['student', 'admin']}>
                                <Layout pageTitle="AI Proctoring">
                                    <Proctoring />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/manage-exams"
                        element={
                            <ProtectedRoute user={user} allowedRoles={['admin']}>
                                <Layout pageTitle="Exam Management">
                                    <ExamManagement />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/manage-students"
                        element={
                            <ProtectedRoute user={user} allowedRoles={['admin']}>
                                <Layout pageTitle="Student Management">
                                    <StudentManagement />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute user={user} allowedRoles={['student', 'admin']}>
                                <Layout pageTitle="Profile">
                                    <Profile />
                                </Layout>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="*"
                        element={<Navigate to={getHomePath(user)} replace />}
                    />
                </Routes>
            </BrowserRouter>
        </AuthContext.Provider>
    )
}

export default App