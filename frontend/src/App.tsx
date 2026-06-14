import { Routes, Route, Link, useLocation } from 'react-router-dom'
import RegisterPage from './pages/RegisterPage'
import AdminPage from './pages/AdminPage'
import VolunteerPortal from './pages/VolunteerPortal'
import HomePage from './pages/HomePage'
import StatisticsPage from './pages/StatisticsPage'
import SubstitutePage from './pages/SubstitutePage'
import CertificationPage from './pages/CertificationPage'

function NavLink({ to, label, icon }: { to: string; label: string; icon: string }) {
  const location = useLocation()
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/')

  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        isActive
          ? 'bg-primary-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

function App() {
  const location = useLocation()
  const showNav = location.pathname !== '/'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-primary-700 via-primary-600 to-accent-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
              🏟️
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-wide">大型赛事志愿者岗位管理系统</h1>
              <p className="text-white/80 text-sm">Volunteer Management System · 2026</p>
            </div>
          </Link>
        </div>
      </header>

      {showNav && (
        <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap gap-2">
            <NavLink to="/" label="首页" icon="🏠" />
            <NavLink to="/register" label="志愿者报名" icon="📝" />
            <NavLink to="/volunteer" label="志愿者入口" icon="👤" />
            <NavLink to="/admin" label="组委会管理" icon="⚙️" />
            <NavLink to="/substitute" label="替补调度" icon="🔄" />
            <NavLink to="/statistics" label="数据统计" icon="📊" />
            <NavLink to="/certifications" label="证明管理" icon="🏅" />
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/volunteer" element={<VolunteerPortal />} />
          <Route path="/volunteer/:id" element={<VolunteerPortal />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/substitute" element={<SubstitutePage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/certifications" element={<CertificationPage />} />
        </Routes>
      </main>

      <footer className="mt-16 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-500 text-sm">
          <p>© 2026 大型赛事组委会 · 志愿者岗位管理系统 v1.0</p>
        </div>
      </footer>
    </div>
  )
}

export default App
