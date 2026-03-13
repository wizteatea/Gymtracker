import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Play, Trash2, X, Grid3X3, List, CalendarDays } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getWorkouts, getSchedule, scheduleWorkout, removeScheduledWorkout, getHistory } from '../data/store'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  addWeeks, subWeeks, isToday, isFuture, isPast, parseISO
} from 'date-fns'
import { fr } from 'date-fns/locale'

export default function CalendarPage() {
  const { profileId, refresh, refreshKey } = useApp()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('month') // month | week | list
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  const workouts = useMemo(() => getWorkouts(profileId), [profileId, refreshKey])
  const schedule = useMemo(() => getSchedule(profileId), [profileId, refreshKey])
  const history = useMemo(() => getHistory(profileId), [profileId, refreshKey])

  const getDateSchedule = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return schedule.filter(s => s.date === dateStr)
  }

  const getDateHistory = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return history.filter(h => h.completedAt.startsWith(dateStr))
  }

  // ── Month view days ──
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthCalStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const monthCalEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const monthDays = eachDayOfInterval({ start: monthCalStart, end: monthCalEnd })

  // ── Week view days ──
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // ── List view: upcoming + past ──
  const listItems = useMemo(() => {
    const items = []
    // Scheduled
    schedule.forEach(s => {
      const w = workouts.find(ww => ww.id === s.workoutId)
      if (w) {
        items.push({ type: 'scheduled', date: s.date, workout: w, scheduleId: s.id })
      }
    })
    // Completed
    history.forEach(h => {
      items.push({ type: 'completed', date: h.completedAt.split('T')[0], session: h })
    })
    items.sort((a, b) => b.date.localeCompare(a.date))
    return items
  }, [schedule, history, workouts])

  const selectedSchedule = selectedDate ? getDateSchedule(selectedDate) : []
  const selectedHistory = selectedDate ? getDateHistory(selectedDate) : []

  const handleSchedule = (workoutId) => {
    const dateToUse = selectedDate || new Date()
    scheduleWorkout(profileId, workoutId, format(dateToUse, 'yyyy-MM-dd'))
    refresh()
    setShowScheduleModal(false)
  }

  const handleRemoveSchedule = (scheduleId) => {
    removeScheduledWorkout(profileId, scheduleId)
    refresh()
  }

  // ── Navigation ──
  const goBack = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1))
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1))
  }
  const goForward = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1))
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1))
  }
  const goToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const navLabel = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy', { locale: fr })
    if (viewMode === 'week') return `${format(weekStart, 'd MMM', { locale: fr })} — ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`
    return 'Toutes les séances'
  }

  // ── Shared day cell renderer ──
  const renderDayCell = (day, compact = false) => {
    const daySchedule = getDateSchedule(day)
    const dayHistory = getDateHistory(day)
    const hasEvent = daySchedule.length > 0 || dayHistory.length > 0
    const isSelected = selectedDate && isSameDay(day, selectedDate)
    const inMonth = viewMode === 'week' || isSameMonth(day, currentDate)

    return (
      <button
        key={day.toISOString()}
        onClick={() => setSelectedDate(day)}
        style={{
          background: isSelected ? 'var(--accent)' : isToday(day) ? 'var(--accent-light)' : 'transparent',
          color: isSelected ? 'white' : inMonth ? 'var(--text)' : 'var(--text-muted)',
          borderRadius: 10,
          padding: compact ? '14px 0' : '10px 0',
          position: 'relative',
          fontWeight: isToday(day) ? 700 : 400,
          fontSize: compact ? 16 : 14,
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {compact && (
          <span className="text-xs" style={{ opacity: 0.5, fontWeight: 400, fontSize: 10, color: isSelected ? 'white' : 'var(--text-muted)' }}>
            {format(day, 'EEE', { locale: fr })}
          </span>
        )}
        {format(day, 'd')}
        {hasEvent && (
          <div style={{
            position: compact ? 'relative' : 'absolute',
            bottom: compact ? undefined : 3,
            left: compact ? undefined : '50%',
            transform: compact ? undefined : 'translateX(-50%)',
            display: 'flex', gap: 2, marginTop: compact ? 2 : 0,
          }}>
            {daySchedule.length > 0 && (
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'white' : 'var(--accent)' }} />
            )}
            {dayHistory.length > 0 && (
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'white' : 'var(--success)' }} />
            )}
          </div>
        )}
      </button>
    )
  }

  // ── Date detail panel (shared between views) ──
  const renderDateDetail = () => {
    if (!selectedDate) return null
    return (
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
              <div className="text-xs text-success">Terminé · {format(parseISO(h.completedAt), 'HH:mm')}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center justify-between mb-16">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Calendrier</h1>
        {/* View mode toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 10, padding: 3 }}>
          <button
            onClick={() => setViewMode('month')}
            style={{
              padding: '6px 10px', borderRadius: 8, border: 'none',
              background: viewMode === 'month' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'month' ? 'white' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center',
            }}
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('week')}
            style={{
              padding: '6px 10px', borderRadius: 8, border: 'none',
              background: viewMode === 'week' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'week' ? 'white' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center',
            }}
          >
            <CalendarDays size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '6px 10px', borderRadius: 8, border: 'none',
              background: viewMode === 'list' ? 'var(--accent)' : 'transparent',
              color: viewMode === 'list' ? 'white' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center',
            }}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Navigation (month & week) */}
      {viewMode !== 'list' && (
        <div className="flex items-center justify-between mb-16">
          <button onClick={goBack} style={{ background: 'none', color: 'var(--text)', padding: 8 }}>
            <ChevronLeft size={24} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="font-bold" style={{ fontSize: 16, textTransform: 'capitalize' }}>
              {navLabel()}
            </div>
            <button onClick={goToday} className="text-xs text-accent" style={{ background: 'none', marginTop: 2 }}>
              Aujourd'hui
            </button>
          </div>
          <button onClick={goForward} style={{ background: 'none', color: 'var(--text)', padding: 8 }}>
            <ChevronRight size={24} />
          </button>
        </div>
      )}

      {/* ═══════ MONTH VIEW ═══════ */}
      {viewMode === 'month' && (
        <>
          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
              <div key={d} className="text-xs text-muted text-center" style={{ padding: 4 }}>{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 20 }}>
            {monthDays.map(day => renderDayCell(day, false))}
          </div>
          {renderDateDetail()}
        </>
      )}

      {/* ═══════ WEEK VIEW ═══════ */}
      {viewMode === 'week' && (
        <>
          {/* Week strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 20 }}>
            {weekDays.map(day => renderDayCell(day, true))}
          </div>

          {/* Day details for each day with events, or selected */}
          {selectedDate ? (
            renderDateDetail()
          ) : (
            weekDays.map(day => {
              const daySchedule = getDateSchedule(day)
              const dayHistory = getDateHistory(day)
              if (daySchedule.length === 0 && dayHistory.length === 0) return null
              return (
                <div key={day.toISOString()} style={{ marginBottom: 16 }}>
                  <div className="text-xs font-bold text-secondary mb-8" style={{ textTransform: 'capitalize' }}>
                    {format(day, 'EEEE d', { locale: fr })}
                  </div>
                  {daySchedule.map(s => {
                    const w = workouts.find(ww => ww.id === s.workoutId)
                    if (!w) return null
                    return (
                      <div key={s.id} className="card flex items-center gap-12">
                        <div style={{
                          width: 4, height: 32, borderRadius: 2,
                          background: 'var(--accent)', flexShrink: 0
                        }} />
                        <div style={{ flex: 1 }}>
                          <div className="font-bold text-sm">{w.title}</div>
                          <div className="text-xs text-muted">{w.exercises?.length || 0} exercices</div>
                        </div>
                        <button onClick={() => navigate('/session', { state: { workoutId: w.id } })}
                          style={{ background: 'none', color: 'var(--success)', padding: 4 }}>
                          <Play size={18} />
                        </button>
                      </div>
                    )
                  })}
                  {dayHistory.map(h => (
                    <div key={h.id} className="card flex items-center gap-12">
                      <div style={{
                        width: 4, height: 32, borderRadius: 2,
                        background: 'var(--success)', flexShrink: 0
                      }} />
                      <div style={{ flex: 1 }}>
                        <div className="font-bold text-sm">{h.workoutTitle}</div>
                        <div className="text-xs text-success">Terminé</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })
          )}

          {/* If no events this week and no selection */}
          {!selectedDate && weekDays.every(d => getDateSchedule(d).length === 0 && getDateHistory(d).length === 0) && (
            <div className="card text-center" style={{ padding: 24 }}>
              <p className="text-muted text-sm">Aucune séance cette semaine</p>
              <button className="btn btn-primary btn-small mt-16" onClick={() => { setSelectedDate(new Date()); setShowScheduleModal(true) }}>
                <Plus size={14} /> Planifier
              </button>
            </div>
          )}
        </>
      )}

      {/* ═══════ LIST VIEW ═══════ */}
      {viewMode === 'list' && (
        <>
          <div className="flex items-center justify-between mb-16">
            <div className="text-secondary text-sm">{listItems.length} séance{listItems.length > 1 ? 's' : ''}</div>
            <button className="btn btn-primary btn-small" onClick={() => { setSelectedDate(new Date()); setShowScheduleModal(true) }}>
              <Plus size={14} /> Planifier
            </button>
          </div>

          {listItems.length === 0 && (
            <div className="card text-center" style={{ padding: 24 }}>
              <p className="text-muted text-sm">Aucune séance planifiée ou réalisée</p>
            </div>
          )}

          {listItems.map((item, i) => {
            // Date separator
            const showDateHeader = i === 0 || listItems[i - 1].date !== item.date
            const dateObj = parseISO(item.date)
            return (
              <div key={`${item.type}-${item.scheduleId || item.session?.id}-${i}`}>
                {showDateHeader && (
                  <div className="text-xs font-bold mb-8 mt-16" style={{
                    textTransform: 'capitalize',
                    color: isToday(dateObj) ? 'var(--accent)' : 'var(--text-secondary)'
                  }}>
                    {isToday(dateObj) ? "Aujourd'hui" : format(dateObj, 'EEEE d MMMM yyyy', { locale: fr })}
                  </div>
                )}

                {item.type === 'scheduled' && (
                  <div className="card flex items-center gap-12">
                    <div style={{
                      width: 4, height: 36, borderRadius: 2,
                      background: isFuture(dateObj) || isToday(dateObj) ? 'var(--accent)' : 'var(--warning)',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1 }}>
                      <div className="font-bold text-sm">{item.workout.title}</div>
                      <div className="text-xs text-muted">
                        {item.workout.exercises?.length || 0} exercices · Planifié
                      </div>
                    </div>
                    <button onClick={() => navigate('/session', { state: { workoutId: item.workout.id } })}
                      style={{ background: 'none', color: 'var(--success)', padding: 4 }}>
                      <Play size={18} />
                    </button>
                    <button onClick={() => handleRemoveSchedule(item.scheduleId)}
                      style={{ background: 'none', color: 'var(--danger)', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {item.type === 'completed' && (
                  <div className="card flex items-center gap-12">
                    <div style={{
                      width: 4, height: 36, borderRadius: 2,
                      background: 'var(--success)', flexShrink: 0
                    }} />
                    <div style={{ flex: 1 }}>
                      <div className="font-bold text-sm">{item.session.workoutTitle}</div>
                      <div className="text-xs text-success">
                        Terminé · {item.session.duration || '–'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </>
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
            {selectedDate && (
              <div className="text-sm text-secondary mb-16" style={{ textTransform: 'capitalize' }}>
                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </div>
            )}
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
