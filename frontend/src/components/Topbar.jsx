import { useAuth } from '../App'
import { Search, Bell, Settings, LogOut } from './Icons'
import { useNavigate } from 'react-router-dom'

export default function Topbar({ title }) {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    return (
        <header className="topbar">
            <div className="topbar-left">
                <h2>{title}</h2>
            </div>
            <div className="topbar-search">
                <Search size={16} color="var(--text-muted)" />
                <input type="text" placeholder="Search exams, students..." />
            </div>
            <div className="topbar-right">
                <div 
                  className="topbar-icon" 
                  title="Settings"
                  onClick={() => navigate('/profile')}
                  style={{ cursor: 'pointer' }}>
                  <Settings size={18} />
                </div>
                <div className="topbar-icon" onClick={logout} title="Logout" style={{ cursor: 'pointer' }}>
                    <LogOut size={18} />
                </div>
            </div>
        </header>
    )
}
