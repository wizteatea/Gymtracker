import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Play, Trash2, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getWorkouts, getSchedule, scheduleWorkout, removeScheduledWorkout, getHistory } from '../data/store'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday
} from 'date-fns'
import { fr } from 'date-fns/locale'

export default function CalendarPage() {
  const { profileId, refresh, refreshKey } = useApp()
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  const workouts = useMemo(() => getWorkouts(profileId), [profileId, refreshKey])
  const schedule = useMemo(() => getSchedule(profileId), [profileId, refreshKey])
  const history = useMemo(() => getHistory(profileId), [profileId, refreshKey])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const getDateSchedule = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return schedule.filter(s => s.date === dateStr)
  }

  const getDateHistory = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return history.filter(h => h.completedAt.startsWith(dateStr))
  }

  const selectedSchedule = selectedDate ? getDateSchedule(selectedDate) : []
  const selectedHistory = selectedDate ? getDateHistory(selectedDate) : []

  const handleSchedule = (workoutId) => {
    scheduleWorkout(profileId, workoutId, format(selectedDate, 'yyyy-MM-dd'))
    refresh()
    setShowScheduleModal(false)
  }

  const handleRemoveSchedule = (scheduleId) => {
    removeScheduledWorkout(profileId, scheduleId)
    refresh()
  }

  return (
    <div className="page">
      <h1 className="page-title">Calendrier</h1>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-16">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          style={{ background: 'none', color: 'var(--text)', padding: 8 }}>
          <ChevronLeft size={24} />
        </button>
        <div className="font-bold" style={{ fontSize: 18, textTransform: 'capitalize' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
        </div>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          style={{ background: 'none', color: 'var(--text)', padding: 8 }}>
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
          <div key={d} className="text-xs text-muted text-center" style={{ padding: 4 }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 20 }}>
        {days.map(day => {
          const daySchedule = getDateSchedule(day)
          const dayHistory = getDateHistory(day)
          const hasEvent = daySchedule.length > 0 || dayHistory.length > 0
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const inMonth = isSameMonth(day, currentMonth)

          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              style={{
                background: isSelected ? 'var(--accent)' : isToday(day) ? 'var(--accent-light)' : 'transparent',
                color: isSelected ? 'white' : inMonth ? 'var(--text)' : 'var(--text-muted)',
                borderRadius: 10,
                padding: '10px 0',
                position: 'relative',
                fontWeight: isToday(day) ? 700 : 400,
                fontSize: 14,
                border: 'none',
              }}
            >
              {format(day, 'd')}
              {hasEvent && (
                <div style={{
                  position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)',
                  width: 5, height: 5, borderRadius: '50%',
                  background: dayHistory.length > 0 ? 'var(--success)' : 'var(--accent)',
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date detail */}
      {selectedDate && (
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 style={{ fontSize: 16, fontWeight: 700, textTransform: 'capitalize' }}>
              {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
            </h2>
            <button className="btn btn-primary btn-small" onClick={() => setShowScheduleModal(true)}>
              <Plus size={14} /> Planifier
            </button>
          </div>

          {selectedSchedule.length === 0 && selectedHistory.length === 0 && (
            <div className="card text-center" style={{ padding: 20 }}>
              <p className="text-muted text-sm">Aucune séance ce jour</p>
            </div>
          )}

          {selectedSchedule.map(s => {
            const w = workouts.find(ww => ww.id === s.workoutId)
            if (!w) return null
            return (
              <div key={s.id} className="card flex items-center gap-12">
                <div style={{ flex: 1 }}>
                  <div className="font-bold text-sm">{w.title}</div>
                  <div className="text-xs text-muted">{w.exercises?.length || 0} exercices · Planifié</div>
                </div>
                <button onClick={() => navigate('/session', { state: { workoutId: w.id } })}
                  style={{ background: 'none', color: 'var(--success)', padding: 4 }}>
                  <Play size={18} />
                </button>
                <button onClick={() => handleRemoveSchedule(s.id)}
                  style={{ background: 'none', color: 'var(--danger)', padding: 4 }}>
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}

          {selectedHistory.map(h => (
            <div key={h.id} className="card flex items-center gap-12">
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--success)', flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <div className="font-bold text-sm">{h.workoutTitle}</div>
                <div className="text-xs text-success">Terminé</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule modal */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Planifier une séance</h2>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: 'none', color: 'var(--text-muted)' }}>
                <X size={24} />
              </button>
            </div>
            {workouts.length === 0 ? (
              <div className="text-center" style={{ padding: 20 }}>
                <p className="text-muted text-sm mb-16">Crée d'abord un entraînement</p>
                <button className="btn btn-primary" onClick={() => navigate('/workouts/new')}>
                  <Plus size={16} /> Créer un entraînement
                </button>
              </div>
            ) : (
              workouts.map(w => (
                <button
                  key={w.id}
                  className="card w-full"
                  onClick={() => handleSchedule(w.id)}
                  style={{ textAlign: 'left', cursor: 'pointer', display: 'block' }}
                >
                  <div className="font-bold text-sm">{w.title}</div>
                  <div className="text-xs text-muted">{w.exercises?.length || 0} exercices</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
