import { useState, useMemo } from 'react'
import { Search, TrendingUp, ChevronDown, ChevronUp, Award, Flame, BarChart2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getHistory, getCustomExercises } from '../data/store'
import { DEFAULT_EXERCISES, MUSCLE_GROUPS } from '../data/exercises'
import { getCustomMuscleGroups } from '../data/store'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function StatsPage() {
  const { profileId, refreshKey } = useApp()
  const history = useMemo(() => getHistory(profileId), [profileId, refreshKey])
  const customExercises = useMemo(() => getCustomExercises(profileId), [profileId, refreshKey])
  const customMuscles = useMemo(() => getCustomMuscleGroups(profileId), [profileId, refreshKey])

  const allMuscleGroups = useMemo(() => [...MUSCLE_GROUPS, ...customMuscles], [customMuscles])
  const allExercises = useMemo(() => [...DEFAULT_EXERCISES, ...customExercises], [customExercises])

  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState('all')
  const [expandedEx, setExpandedEx] = useState(null)
  const [chartMetric, setChartMetric] = useState('maxWeight') // 'maxWeight' | 'volume'

  // Build per-exercise stats from history
  const exerciseStats = useMemo(() => {
    const map = {}
    ;[...history].reverse().forEach(session => {
      session.exercises?.forEach(ex => {
        if (!ex.setsCompleted) return
        const doneSets = ex.setsCompleted.filter(s => s.done)
        if (doneSets.length === 0) return

        if (!map[ex.name]) {
          const def = allExercises.find(e => e.name === ex.name)
          map[ex.name] = {
            name: ex.name,
            muscle: ex.muscle || def?.muscle || '',
            type: ex.type || def?.type || 'musculation',
            sessions: 0,
            maxWeight: 0,
            totalVolume: 0,
            lastDate: null,
            history: [], // { date, maxWeight, volume }
          }
        }

        const stat = map[ex.name]
        stat.sessions++
        stat.lastDate = session.completedAt

        if (ex.type === 'cardio') {
          stat.history.push({
            date: format(parseISO(session.completedAt), 'dd/MM'),
            fullDate: session.completedAt,
            duration: doneSets[0]?.duration || 0,
            distance: doneSets[0]?.distance || 0,
          })
        } else {
          const sessionMax = Math.max(...doneSets.map(s => s.weight || 0))
          const sessionVol = doneSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0)
          if (sessionMax > stat.maxWeight) stat.maxWeight = sessionMax
          stat.totalVolume += sessionVol
          stat.history.push({
            date: format(parseISO(session.completedAt), 'dd/MM'),
            fullDate: session.completedAt,
            maxWeight: sessionMax,
            volume: sessionVol,
          })
        }
      })
    })
    return Object.values(map).sort((a, b) => b.sessions - a.sessions)
  }, [history, allExercises])

  // Filters
  const filtered = useMemo(() => {
    return exerciseStats.filter(ex => {
      const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase())
      const matchMuscle = muscleFilter === 'all' || ex.muscle === muscleFilter
      return matchSearch && matchMuscle
    })
  }, [exerciseStats, search, muscleFilter])

  // Muscles actually used
  const usedMuscles = useMemo(() => {
    const ids = new Set(exerciseStats.map(e => e.muscle))
    return allMuscleGroups.filter(g => ids.has(g.id))
  }, [exerciseStats, allMuscleGroups])

  const expanded = expandedEx ? exerciseStats.find(e => e.name === expandedEx) : null

  return (
    <div className="page">
      <h1 className="page-title">Statistiques</h1>

      {exerciseStats.length === 0 && (
        <div className="empty-state">
          <BarChart2 size={48} />
          <p className="mt-8">Aucune donnée</p>
          <p className="text-xs mt-8 text-muted">Lance des entraînements pour voir tes stats ici</p>
        </div>
      )}

      {exerciseStats.length > 0 && (
        <>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un exercice..."
              style={{ paddingLeft: 38 }}
            />
          </div>

          {/* Muscle filter chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 16 }}>
            <button className={`chip ${muscleFilter === 'all' ? 'active' : ''}`} onClick={() => setMuscleFilter('all')}>
              Tous
            </button>
            {usedMuscles.map(g => (
              <button key={g.id} className={`chip ${muscleFilter === g.id ? 'active' : ''}`}
                onClick={() => setMuscleFilter(g.id)} style={{ whiteSpace: 'nowrap' }}>
                {g.emoji} {g.label}
              </button>
            ))}
          </div>

          {/* Exercise cards */}
          {filtered.map(ex => {
            const isOpen = expandedEx === ex.name
            const muscleGroup = allMuscleGroups.find(g => g.id === ex.muscle)
            const hasChart = ex.history.length > 1 && ex.type !== 'cardio'

            return (
              <div key={ex.name} className="card" style={{ marginBottom: 10 }}>
                {/* Header row */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  onClick={() => setExpandedEx(isOpen ? null : ex.name)}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: ex.type === 'cardio' ? 'rgba(239,68,68,0.12)' : 'var(--accent-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                  }}>
                    {muscleGroup?.emoji || '💪'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="font-bold text-sm" style={{ marginBottom: 2 }}>{ex.name}</div>
                    <div className="text-xs text-muted">{muscleGroup?.label} · {ex.sessions} séance{ex.sessions > 1 ? 's' : ''}</div>
                  </div>
                  {ex.type !== 'cardio' && ex.maxWeight > 0 && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{ex.maxWeight} kg</div>
                      <div className="text-xs text-muted">PR</div>
                    </div>
                  )}
                  {isOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>

                    {/* Mini stats */}
                    {ex.type !== 'cardio' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                        <div style={{ textAlign: 'center', background: 'var(--bg)', borderRadius: 8, padding: '10px 6px' }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{ex.maxWeight} kg</div>
                          <div className="text-xs text-muted">Record</div>
                        </div>
                        <div style={{ textAlign: 'center', background: 'var(--bg)', borderRadius: 8, padding: '10px 6px' }}>
                          <div style={{ fontSize: 18, fontWeight: 800 }}>{ex.sessions}</div>
                          <div className="text-xs text-muted">Séances</div>
                        </div>
                        <div style={{ textAlign: 'center', background: 'var(--bg)', borderRadius: 8, padding: '10px 6px' }}>
                          <div style={{ fontSize: 18, fontWeight: 800 }}>
                            {ex.totalVolume >= 1000 ? (ex.totalVolume / 1000).toFixed(1) + 't' : ex.totalVolume + ''}
                          </div>
                          <div className="text-xs text-muted">Volume total</div>
                        </div>
                      </div>
                    )}

                    {ex.type === 'cardio' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                        <div style={{ textAlign: 'center', background: 'var(--bg)', borderRadius: 8, padding: '10px 6px' }}>
                          <div style={{ fontSize: 18, fontWeight: 800 }}>{ex.sessions}</div>
                          <div className="text-xs text-muted">Séances</div>
                        </div>
                        <div style={{ textAlign: 'center', background: 'var(--bg)', borderRadius: 8, padding: '10px 6px' }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>
                            {ex.lastDate ? format(parseISO(ex.lastDate), 'd MMM', { locale: fr }) : '–'}
                          </div>
                          <div className="text-xs text-muted">Dernière fois</div>
                        </div>
                      </div>
                    )}

                    {/* Chart toggle + chart */}
                    {hasChart && (
                      <>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                          {[['maxWeight', '🏋️ Poids max'], ['volume', '📦 Volume']].map(([key, label]) => (
                            <button key={key} onClick={() => setChartMetric(key)}
                              style={{
                                padding: '5px 12px', borderRadius: 20, fontSize: 12,
                                background: chartMetric === key ? 'var(--accent)' : 'var(--bg-input)',
                                color: chartMetric === key ? '#fff' : 'var(--text)',
                                border: 'none', cursor: 'pointer', fontWeight: chartMetric === key ? 700 : 400
                              }}>
                              {label}
                            </button>
                          ))}
                        </div>
                        <div style={{ height: 180 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={ex.history}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={36} />
                              <Tooltip
                                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}
                                formatter={v => [`${v} ${chartMetric === 'maxWeight' ? 'kg' : 'kg·reps'}`, chartMetric === 'maxWeight' ? 'Poids max' : 'Volume']}
                              />
                              <Line type="monotone" dataKey={chartMetric}
                                stroke={chartMetric === 'maxWeight' ? 'var(--accent)' : 'var(--success)'}
                                strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}

                    {/* Last session */}
                    {ex.lastDate && (
                      <div className="text-xs text-muted" style={{ marginTop: 12, textAlign: 'right' }}>
                        Dernière fois : {format(parseISO(ex.lastDate), 'EEEE d MMM yyyy', { locale: fr })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="empty-state"><p>Aucun exercice trouvé</p></div>
          )}
        </>
      )}
    </div>
  )
}
