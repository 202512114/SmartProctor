import { useAuth } from '../App'
import { useLocation, Link } from 'react-router-dom'
import { Home, FileText, Gamepad, BarChart, Bot, Settings } from './Icons'

export default function Sidebar() {
    const { user } = useAuth()
    const location = useLocation()
    const isActive = (path) => location.pathname === path ? 'active' : ''

    const studentLinks = [
        { path: '/dashboard', icon: <Home size={18} />, label: 'Dashboard' },
        { path: '/exam-list', icon: <FileText size={18} />, label: 'Examinations' },
        { path: '/practice', icon: <Gamepad size={18} />, label: 'Practice Quizzes' },
        { path: '/results', icon: <BarChart size={18} />, label: 'Results' },
        { path: '/proctoring', icon: <Bot size={18} />, label: 'AI Proctoring' },
    ]

    const adminLinks = [
        { path: '/admin', icon: <Home size={18} />, label: 'Dashboard' },
        { path: '/manage-students', icon: <Settings size={18} />, label: 'Manage Students' },
        { path: '/manage-exams', icon: <Settings size={18} />, label: 'Manage Exams' },
        { path: '/results', icon: <BarChart size={18} />, label: 'Results & Reports' },
        { path: '/proctoring', icon: <Bot size={18} />, label: 'AI Proctoring' },
    ]

    const links = user?.role === 'admin' ? adminLinks : studentLinks

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon">S</div>
                <div>
                    <h1>SmartProctor</h1>
                    <span>AI Exam System</span>
                </div>
            </div>
            <nav className="sidebar-nav">
                <div className="sidebar-section-label">Main Menu</div>
                {links.map((link) => (
                    <Link key={link.path} to={link.path} className={isActive(link.path)}>
                        <span className="nav-icon">{link.icon}</span>
                        {link.label}
                    </Link>
                ))}
            </nav>
            <div className="sidebar-footer">
                <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
                <div className="user-info">
                    <div className="name">{user?.name || 'User'}</div>
                    <div className="role">{user?.role || 'student'}</div>
                </div>
            </div>
        </aside>
    )
}
