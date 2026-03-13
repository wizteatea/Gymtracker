import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Plus, Calendar, Clock, Dumbbell, TrendingUp } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getWorkouts, getSchedule, getHistory } from '../data/store'
import { format, isToday, isFuture, parseISO, startOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function Dashboard() {
  const { profile, profileId, refreshKey } = useApp()
  const navigate = useNavigate()

  const workouts = useMemo(() => getWorkouts(profileId), [profileId, refreshKey])
  const schedule = useMemo(() => getSchedule(profileId), [profileId, refreshKey])
  const history = useMemo(() => getHistory(profileId), [profileId, refreshKey])

  // Find next scheduled workout
  const today = startOfDay(new Date())
  const nextSession = useMemo(() => {
    return schedule
      .filter(s => !s.completed && (isToday(parseISO(s.date)) || isFuture(parseISO(s.date))))
      .sort((a, b) => a.date.localeCompare(b.date))[0]
  }, [schedule])

  const nextWorkout = nextSession ? workouts.find(w => w.id === nextSession.workoutId) : null

  // Stats
  const totalSessions = history.length
  const thisWeekSessions = history.filter(h => {
    const d = parseISO(h.completedAt)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return d >= weekAgo
  }).length

  return (
    <div className="page">
      <div style={{ marginBottom: 24 }}>
        <div className="text-secondary text-sm">Bonjour,</div>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>{profile?.prenom} 👋</h1>
      </div>

      {/* Next workout */}
      {nextWorkout && (
        <div className="card" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', marginBottom: 16 }}>
          <div className="text-sm" style={{ opacity: 0.8, color: 'white', marginBottom: 4 }}>
            Prochain entraînement · {isToday(parseISO(nextSession.date))
              ? "Aujourd'hui"
              : format(parseISO(nextSession.date), 'EEEE d MMM', { locale: fr })}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 12 }}>
            {nextWorkout.title}
          </div>
          <div style={{ display: 'flex', gap: 8, color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 14 }}>
            <span>{nextWorkout.exercises?.length || 0} exercices</span>
          </div>
          <button
            className="btn"
            style={{ background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(4px)' }}
            onClick={() => navigate('/session', { state: { workoutId: nextWorkout.id } })}
          >
            <Play size={18} /> Démarrer la séance
          </button>
        </div>
      )}

      {!nextWorkout && (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>
          <Dumbbell size={32} color="var(--text-muted)" style={{ marginBottom: 8 }} />
          <div className="text-secondary text-sm mb-8">Aucun entraînement prévu</div>
          <button className="btn btn-primary btn-small" onClick={() => navigate('/calendar')}>
            <Calendar size={16} /> Planifier une séance
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <button className="card" onClick={() => navigate('/workouts/new')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 20, cursor: 'pointer' }}>
          <Plus size={24} color="var(--accent)" />
          <span className="text-sm font-bold">Créer</span>
        </button>
        <button className="card" onClick={() => navigate('/workouts')}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 20, cursor: 'pointer' }}>
          <Dumbbell size={24} color="var(--success)" />
          <span className="text-sm font-bold">Mes séances</span>
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div className="card">
          <div className="text-xs text-muted mb-8">Cette semaine</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{thisWeekSessions}</div>
          <div className="text-xs text-secondary">séance{thisWeekSessions !== 1 ? 's' : ''}</div>
        </div>
        <div className="card">
          <div className="text-xs text-muted mb-8">Total</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{totalSessions}</div>
          <div className="text-xs text-secondary">séance{totalSessions !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Recent history */}
      {history.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-8">
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Dernières séances</h2>
            <button onClick={() => navigate('/history')} className="text-accent text-sm font-bold" style={{ background: 'none' }}>
              Voir tout
            </button>
          </div>
          {history.slice(0, 3).map(h => (
            <div key={h.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'var(--success-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <TrendingUp size={18} color="var(--success)" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-bold text-sm">{h.workoutTitle}</div>
                <div className="text-xs text-muted">
                  {format(parseISO(h.completedAt), 'EEEE d MMM · HH:mm', { locale: fr })}
                </div>
              </div>
              <div className="text-xs text-muted">
                <Clock size={12} style={{ verticalAlign: 'middle' }} /> {h.duration || '–'}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
