import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Home, Dumbbell, Calendar, BarChart3, User } from 'lucide-react'
import { AppProvider, useApp } from './context/AppContext'
import ProfileSelect from './pages/ProfileSelect'
import Dashboard from './pages/Dashboard'
import WorkoutList from './pages/WorkoutList'
import WorkoutEdit from './pages/WorkoutEdit'
import CalendarPage from './pages/CalendarPage'
import SessionPage from './pages/SessionPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'

function AppContent() {
  const { profileId } = useApp()
  const location = useLocation()

  // Show profile selector if no profile is active
  if (!profileId) {
    return <ProfileSelect />
  }

  // Hide nav during workout session
  const hideNav = location.pathname === '/session'

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/workouts" element={<WorkoutList />} />
        <Route path="/workouts/new" element={<WorkoutEdit />} />
        <Route path="/workouts/edit/:id" element={<WorkoutEdit />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>

      {!hideNav && (
        <nav className="bottom-nav">
          <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Home size={24} />
            <span>Accueil</span>
          </NavLink>
          <NavLink to="/workouts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Dumbbell size={24} />
            <span>Séances</span>
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Calendar size={24} />
            <span>Calendrier</span>
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BarChart3 size={24} />
            <span>Historique</span>
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <User size={24} />
            <span>Profil</span>
          </NavLink>
        </nav>
      )}
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
