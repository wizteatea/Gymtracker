import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Calendar, Clock, ChevronDown, ChevronUp, Dumbbell, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getHistory, deleteHistoryEntry } from '../data/store'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DEFAULT_EXERCISES } from '../data/exercises'

export default function HistoryPage() {
  const { profileId, refresh, refreshKey } = useApp()
  const navigate = useNavigate()
  const history = useMemo(() => getHistory(profileId), [profileId, refreshKey])
  const [expandedId, setExpandedId] = useState(null)
  const [selectedExercise, setSelectedExercise] = useState('')
  const [showStats, setShowStats] = useState(false)

  // Get all unique exercise names from history
  const exerciseNames = useMemo(() => {
    const names = new Set()
    history.forEach(h => h.exercises?.forEach(ex => names.add(ex.name)))
    return [...names].sort()
  }, [history])

  // Progression data for a specific exercise
  const progressionData = useMemo(() => {
    if (!selectedExercise) return []
    const data = []
    // Go through history in reverse (oldest first)
    ;[...history].reverse().forEach(h => {
      h.exercises?.forEach(ex => {
        if (ex.name === selectedExercise && ex.setsCompleted) {
          const maxWeight = Math.max(...ex.setsCompleted.filter(s => s.done).map(s => s.weight || 0), 0)
          const totalVolume = ex.setsCompleted.filter(s => s.done).reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0)
          if (maxWeight > 0 || totalVolume > 0) {
            data.push({
              date: format(parseISO(h.completedAt), 'dd/MM'),
              fullDate: format(parseISO(h.completedAt), 'dd MMM yyyy', { locale: fr }),
              maxWeight,
              totalVolume,
            })
          }
        }
      })
    })
    return data
  }, [history, selectedExercise])

  // Stats
  const stats = useMemo(() => {
    const totalSessions = history.length
    const totalDuration = history.reduce((sum, h) => sum + (h.durationSeconds || 0), 0)
    const avgDuration = totalSessions > 0 ? Math.floor(totalDuration / totalSessions / 60) : 0

    // Sessions per week (last 4 weeks)
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
    const recentSessions = history.filter(h => parseISO(h.completedAt) >= fourWeeksAgo).length
    const sessionsPerWeek = (recentSessions / 4).toFixed(1)

    return { totalSessions, avgDuration, sessionsPerWeek }
  }, [history])

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirm('Supprimer cette séance de l\'historique ?')) {
      deleteHistoryEntry(profileId, id)
      refresh()
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Historique</h1>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
        <div className="card text-center" style={{ padding: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.totalSessions}</div>
          <div className="text-xs text-muted">Séances</div>
        </div>
        <div className="card text-center" style={{ padding: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.avgDuration}</div>
          <div className="text-xs text-muted">Min / séance</div>
        </div>
        <div className="card text-center" style={{ padding: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.sessionsPerWeek}</div>
          <div className="text-xs text-muted">/ semaine</div>
        </div>
      </div>

      {/* Progression chart */}
      {exerciseNames.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="flex items-center justify-between mb-8" onClick={() => setShowStats(!showStats)} style={{ cursor: 'pointer' }}>
            <div className="font-bold text-sm flex items-center gap-8">
              <TrendingUp size={16} color="var(--accent)" /> Progression
            </div>
            {showStats ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>

          {showStats && (
            <>
              <select
                value={selectedExercise}
                onChange={e => setSelectedExercise(e.target.value)}
                style={{ marginBottom: 12 }}
              >
                <option value="">Choisir un exercice</option>
                {exerciseNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              {progressionData.length > 1 ? (
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          color: 'var(--text)'
                        }}
                        formatter={(value, name) => [
                          `${value} ${name === 'maxWeight' ? 'kg' : 'kg·reps'}`,
                          name === 'maxWeight' ? 'Poids max' : 'Volume total'
                        ]}
                      />
                      <Line type="monotone" dataKey="maxWeight" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} name="maxWeight" />
                      <Line type="monotone" dataKey="totalVolume" stroke="var(--success)" strokeWidth={2} dot={{ r: 3 }} name="totalVolume" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : selectedExercise ? (
                <p className="text-xs text-muted text-center" style={{ padding: 20 }}>
                  Pas assez de données pour afficher un graphique
                </p>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* Session list */}
      {history.length === 0 && (
        <div className="empty-state">
          <Calendar size={48} />
          <p className="mt-8">Aucune séance réalisée</p>
          <p className="text-xs mt-8 text-muted">Démarre un entraînement pour voir ton historique ici</p>
        </div>
      )}

      {history.map(h => (
        <div key={h.id} className="card" onClick={() => setExpandedId(expandedId === h.id ? null : h.id)} style={{ cursor: 'pointer' }}>
          <div className="flex items-center gap-12">
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--success-light)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Dumbbell size={18} color="var(--success)" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="font-bold text-sm">{h.workoutTitle}</div>
              <div className="text-xs text-muted">
                {format(parseISO(h.completedAt), 'EEEE d MMM · HH:mm', { locale: fr })}
              </div>
            </div>
            <div className="flex items-center gap-8">
              <span className="text-xs text-muted">
                <Clock size={12} style={{ verticalAlign: 'middle' }} /> {h.duration}
              </span>
              <button onClick={(e) => handleDelete(e, h.id)}
                style={{ background: 'none', color: 'var(--danger)', padding: 4 }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {expandedId === h.id && h.exercises && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              {h.exercises.map((ex, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div className="font-bold text-xs" style={{ marginBottom: 4 }}>{ex.name}</div>
                  {ex.type === 'cardio' ? (
                    <div className="text-xs text-muted">
                      {ex.setsCompleted?.[0]?.duration} min · {ex.setsCompleted?.[0]?.distance} km
                    </div>
                  ) : (
                    <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                      {ex.setsCompleted?.filter(s => s.done).map((s, j) => (
                        <span key={j} className="text-xs" style={{
                          background: 'var(--bg-input)', padding: '2px 8px',
                          borderRadius: 4
                        }}>
                          {s.weight}kg × {s.reps}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
