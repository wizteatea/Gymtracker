import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Play, Trash2, X, Grid3X3, List, CalendarDays, Dumbbell, CheckCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getWorkouts, getSchedule, scheduleWorkout, removeScheduledWorkout, getHistory } from '../data/store'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  addWeeks, subWeeks, isToday, isFuture, parseISO
} from 'date-fns'
import { fr } from 'date-fns/locale'

export default function CalendarPage() {
  const { profileId, refresh, refreshKey } = useApp()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  const workouts = useMemo(() => getWorkouts(profileId), [profileId, refreshKey])
  const schedule = useMemo(() => getSchedule(profileId), [profileId, refreshKey])
  const history = useMemo(() => getHistory(profileId), [profileId, refreshKey])

  const scheduleByDate = useMemo(() => {
    const map = {}
    schedule.forEach(s => {
      if (!map[s.date]) map[s.date] = []
      map[s.date].push(s)
    })
    return map
  }, [schedule])

  const historyByDate = useMemo(() => {
    const map = {}
    history.forEach(h => {
      const key = h.completedAt.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(h)
    })
    return map
  }, [history])

  const getDateSchedule = (date) => scheduleByDate[format(date, 'yyyy-MM-dd')] || []
  const getDateHistory = (date) => historyByDate[format(date, 'yyyy-MM-dd')] || []

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const monthCalStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const monthCalEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const monthDays = eachDayOfInterval({ start: monthCalStart, end: monthCalEnd })

  const listItems = useMemo(() => {
    const items = []
    schedule.forEach(s => {
      const w = workouts.find(ww => ww.id === s.workoutId)
      if (w) items.push({ type: 'scheduled', date: s.date, workout: w, scheduleId: s.id })
    })
    history.forEach(h => {
      items.push({ type: 'completed', date: h.completedAt.split('T')[0], session: h })
    })
    return items.sort((a, b) => b.date.localeCompare(a.date))
  }, [schedule, history, workouts])

  const handleSchedule = (workoutId) => {
    scheduleWorkout(profileId, workoutId, format(selectedDate || new Date(), 'yyyy-MM-dd'))
    refresh()
    setShowScheduleModal(false)
  }

  const handleRemoveSchedule = (scheduleId) => {
    removeScheduledWorkout(profileId, scheduleId)
    refresh()
  }

  const goBack = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1))
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1))
  }
  const goForward = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1))
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1))
  }
  const goToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()) }

  const navLabel = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy', { locale: fr })
    if (viewMode === 'week') return `${format(weekStart, 'd MMM', { locale: fr })} — ${format(weekEnd, 'd MMM', { locale: fr })}`
    return 'Toutes les séances'
  }

  const selectedSchedule = selectedDate ? getDateSchedule(selectedDate) : []
  const selectedHistory = selectedDate ? getDateHistory(selectedDate) : []

  return (
    <div className="page" style={{ paddingBottom: 80 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Calendrier</h1>
        <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 10, padding: 3, gap: 2 }}>
          {[['week', <CalendarDays size={16} />], ['month', <Grid3X3 size={16} />], ['list', <List size={16} />]].map(([mode, icon]) => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              padding: '6px 10px', borderRadius: 8, border: 'none',
              background: viewMode === mode ? 'var(--accent)' : 'transparent',
              color: viewMode === mode ? 'white' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', cursor: 'pointer'
            }}>{icon}</button>
          ))}
        </div>
      </div>

      {/* ── Nav bar (week / month) ── */}
      {viewMode !== 'list' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={goBack} style={{ background: 'none', color: 'var(--text)', padding: 8 }}>
            <ChevronLeft size={22} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div className="font-bold" style={{ fontSize: 15, textTransform: 'capitalize' }}>{navLabel()}</div>
            <button onClick={goToday} style={{ background: 'none', color: 'var(--accent)', fontSize: 12, marginTop: 2 }}>
              Aujourd'hui
            </button>
          </div>
          <button onClick={goForward} style={{ background: 'none', color: 'var(--text)', padding: 8 }}>
            <ChevronRight size={22} />
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════
          WEEK VIEW
      ══════════════════════════════════════ */}
      {viewMode === 'week' && (
        <>
          {/* Day strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 20 }}>
            {weekDays.map(day => {
              const hasScheduled = getDateSchedule(day).length > 0
              const hasHistory = getDateHistory(day).length > 0
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const today = isToday(day)

              return (
                <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', border: 'none', cursor: 'pointer', background: 'transparent' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {format(day, 'EEE', { locale: fr })}
                  </span>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSelected ? 'var(--accent)' : today ? 'var(--accent-light)' : 'transparent',
                    border: today && !isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                    fontWeight: today || isSelected ? 800 : 400,
                    fontSize: 15,
                    color: isSelected ? 'white' : today ? 'var(--accent)' : 'var(--text)',
                    transition: 'all 0.15s'
                  }}>
                    {format(day, 'd')}
                  </div>
                  {/* Event dots */}
                  <div style={{ display: 'flex', gap: 3, height: 6 }}>
                    {hasScheduled && <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'var(--accent)' : 'var(--accent)' }} />}
                    {hasHistory && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)' }} />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selected day content */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div className="font-bold" style={{ fontSize: 16, textTransform: 'capitalize' }}>
                {selectedDate ? format(selectedDate, 'EEEE d MMMM', { locale: fr }) : ''}
              </div>
              {isToday(selectedDate) && (
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>Aujourd'hui</span>
              )}
            </div>
            <button className="btn btn-primary btn-small" onClick={() => setShowScheduleModal(true)}>
              <Plus size={14} /> Planifier
            </button>
          </div>

          {selectedSchedule.length === 0 && selectedHistory.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '32px 20px',
              background: 'var(--bg-card)', borderRadius: 16,
              border: '2px dashed var(--border)'
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏋️</div>
              <p className="text-sm text-muted">Aucune séance ce jour</p>
              <button className="btn btn-primary btn-small" style={{ marginTop: 12 }}
                onClick={() => setShowScheduleModal(true)}>
                <Plus size={14} /> Planifier une séance
              </button>
            </div>
          )}

          {selectedSchedule.map(s => {
            const w = workouts.find(ww => ww.id === s.workoutId)
            if (!w) return null
            return (
              <div key={s.id} style={{
                background: 'var(--bg-card)', borderRadius: 16, padding: 16, marginBottom: 10,
                borderLeft: '4px solid var(--accent)', display: 'flex', alignItems: 'center', gap: 12
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: 'var(--accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <Dumbbell size={20} color="var(--accent)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-bold text-sm">{w.title}</div>
                  <div className="text-xs text-muted" style={{ marginTop: 2 }}>{w.exercises?.length || 0} exercices · Planifié</div>
                </div>
                <button onClick={() => navigate('/session', { state: { workoutId: w.id } })}
                  style={{ background: 'var(--success-light)', color: 'var(--success)', border: 'none', borderRadius: 10, padding: '8px 10px', cursor: 'pointer' }}>
                  <Play size={18} />
                </button>
                <button onClick={() => handleRemoveSchedule(s.id)}
                  style={{ background: 'none', color: 'var(--danger)', padding: 6 }}>
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}

          {selectedHistory.map(h => (
            <div key={h.id} style={{
              background: 'var(--bg-card)', borderRadius: 16, padding: 16, marginBottom: 10,
              borderLeft: '4px solid var(--success)', display: 'flex', alignItems: 'center', gap: 12
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: 'var(--success-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <CheckCircle size={20} color="var(--success)" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="font-bold text-sm">{h.workoutTitle}</div>
                <div className="text-xs" style={{ color: 'var(--success)', marginTop: 2 }}>
                  Terminé · {h.duration || format(parseISO(h.completedAt), 'HH:mm')}
                </div>
              </div>
            </div>
          ))}

          {/* Rest of the week */}
          {weekDays.filter(d => !isSameDay(d, selectedDate)).some(d => getDateSchedule(d).length > 0 || getDateHistory(d).length > 0) && (
            <>
              <div className="text-xs font-bold text-muted" style={{ marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                Reste de la semaine
              </div>
              {weekDays.filter(d => !isSameDay(d, selectedDate)).map(day => {
                const ds = getDateSchedule(day)
                const dh = getDateHistory(day)
                if (ds.length === 0 && dh.length === 0) return null
                return (
                  <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
                    style={{
                      width: '100%', textAlign: 'left', background: 'var(--bg-card)', borderRadius: 12,
                      padding: '12px 14px', marginBottom: 8, border: '1px solid var(--border)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12
                    }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: 'var(--bg-input)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{format(day, 'EEE', { locale: fr })}</span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{format(day, 'd')}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      {ds.map(s => {
                        const w = workouts.find(ww => ww.id === s.workoutId)
                        return w ? <div key={s.id} className="text-sm font-bold">{w.title}</div> : null
                      })}
                      {dh.map(h => (
                        <div key={h.id} className="text-sm" style={{ color: 'var(--success)' }}>✓ {h.workoutTitle}</div>
                      ))}
                    </div>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </button>
                )
              })}
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════
          MONTH VIEW
      ══════════════════════════════════════ */}
      {viewMode === 'month' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              <div key={i} className="text-xs text-muted text-center" style={{ padding: '4px 0', fontWeight: 600 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 20 }}>
            {monthDays.map(day => {
              const hasScheduled = getDateSchedule(day).length > 0
              const hasDone = getDateHistory(day).length > 0
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const inMonth = isSameMonth(day, currentDate)
              const today = isToday(day)
              return (
                <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    padding: '8px 2px', border: 'none', cursor: 'pointer', borderRadius: 10,
                    background: isSelected ? 'var(--accent)' : today ? 'var(--accent-light)' : 'transparent',
                    opacity: inMonth ? 1 : 0.3,
                  }}>
                  <span style={{
                    fontSize: 14, fontWeight: today || isSelected ? 800 : 400,
                    color: isSelected ? 'white' : today ? 'var(--accent)' : 'var(--text)'
                  }}>
                    {format(day, 'd')}
                  </span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {hasScheduled && <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'white' : 'var(--accent)' }} />}
                    {hasDone && <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? 'white' : 'var(--success)' }} />}
                    {!hasScheduled && !hasDone && <div style={{ width: 5, height: 5 }} />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, justifyContent: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} /> Planifié
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} /> Réalisé
            </span>
          </div>

          {/* Selected day detail */}
          {selectedDate && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="font-bold" style={{ fontSize: 15, textTransform: 'capitalize' }}>
                  {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </div>
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
                  <div key={s.id} style={{
                    background: 'var(--bg-card)', borderRadius: 14, padding: 14, marginBottom: 8,
                    borderLeft: '4px solid var(--accent)', display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <div style={{ flex: 1 }}>
                      <div className="font-bold text-sm">{w.title}</div>
                      <div className="text-xs text-muted">{w.exercises?.length || 0} exercices</div>
                    </div>
                    <button onClick={() => navigate('/session', { state: { workoutId: w.id } })}
                      style={{ background: 'var(--success-light)', color: 'var(--success)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
                      <Play size={16} />
                    </button>
                    <button onClick={() => handleRemoveSchedule(s.id)}
                      style={{ background: 'none', color: 'var(--danger)', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
              {selectedHistory.map(h => (
                <div key={h.id} style={{
                  background: 'var(--bg-card)', borderRadius: 14, padding: 14, marginBottom: 8,
                  borderLeft: '4px solid var(--success)', display: 'flex', alignItems: 'center', gap: 12
                }}>
                  <div style={{ flex: 1 }}>
                    <div className="font-bold text-sm">{h.workoutTitle}</div>
                    <div className="text-xs" style={{ color: 'var(--success)' }}>✓ Terminé · {h.duration || '–'}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════
          LIST VIEW
      ══════════════════════════════════════ */}
      {viewMode === 'list' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span className="text-sm text-muted">{listItems.length} séance{listItems.length !== 1 ? 's' : ''}</span>
            <button className="btn btn-primary btn-small" onClick={() => { setSelectedDate(new Date()); setShowScheduleModal(true) }}>
              <Plus size={14} /> Planifier
            </button>
          </div>

          {listItems.length === 0 && (
            <div className="card text-center" style={{ padding: 32 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
              <p className="text-muted text-sm">Aucune séance planifiée ou réalisée</p>
            </div>
          )}

          {listItems.map((item, i) => {
            const showHeader = i === 0 || listItems[i - 1].date !== item.date
            const dateObj = parseISO(item.date + 'T00:00:00')
            return (
              <div key={`${item.type}-${item.scheduleId || item.session?.id}-${i}`}>
                {showHeader && (
                  <div style={{
                    fontSize: 12, fontWeight: 700, marginTop: i === 0 ? 0 : 16, marginBottom: 8,
                    textTransform: 'capitalize',
                    color: isToday(dateObj) ? 'var(--accent)' : 'var(--text-muted)'
                  }}>
                    {isToday(dateObj) ? "Aujourd'hui" : format(dateObj, 'EEEE d MMMM yyyy', { locale: fr })}
                  </div>
                )}
                {item.type === 'scheduled' && (
                  <div style={{
                    background: 'var(--bg-card)', borderRadius: 14, padding: 14, marginBottom: 8,
                    borderLeft: `4px solid ${isFuture(dateObj) || isToday(dateObj) ? 'var(--accent)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <div style={{ flex: 1 }}>
                      <div className="font-bold text-sm">{item.workout.title}</div>
                      <div className="text-xs text-muted">{item.workout.exercises?.length || 0} exercices · Planifié</div>
                    </div>
                    <button onClick={() => navigate('/session', { state: { workoutId: item.workout.id } })}
                      style={{ background: 'var(--success-light)', color: 'var(--success)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
                      <Play size={16} />
                    </button>
                    <button onClick={() => handleRemoveSchedule(item.scheduleId)}
                      style={{ background: 'none', color: 'var(--danger)', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
                {item.type === 'completed' && (
                  <div style={{
                    background: 'var(--bg-card)', borderRadius: 14, padding: 14, marginBottom: 8,
                    borderLeft: '4px solid var(--success)', display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <div style={{ flex: 1 }}>
                      <div className="font-bold text-sm">{item.session.workoutTitle}</div>
                      <div className="text-xs" style={{ color: 'var(--success)' }}>✓ Terminé · {item.session.duration || '–'}</div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* ── Schedule modal ── */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Planifier une séance</h2>
                {selectedDate && (
                  <div className="text-xs text-muted" style={{ marginTop: 4, textTransform: 'capitalize' }}>
                    {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                  </div>
                )}
              </div>
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
                <button key={w.id} onClick={() => handleSchedule(w.id)}
                  style={{
                    width: '100%', textAlign: 'left', background: 'var(--bg)', borderRadius: 12,
                    padding: '14px 16px', marginBottom: 8, border: '1px solid var(--border)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12
                  }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: 'var(--accent-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Dumbbell size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">{w.title}</div>
                    <div className="text-xs text-muted">{w.exercises?.length || 0} exercices</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
