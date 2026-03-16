import { useState, useMemo } from 'react'
import { Search, TrendingUp, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getHistory, getCustomExercises, getCustomMuscleGroups } from '../data/store'
import { DEFAULT_EXERCISES, MUSCLE_GROUPS } from '../data/exercises'
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

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
  const [chartMetric, setChartMetric] = useState('maxWeight')

  // ── Global stats ──
  const globalStats = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    let weekVolume = 0
    let weekSessions = 0
    const muscleCount = {}

    history.forEach(session => {
      const date = parseISO(session.completedAt)
      const isThisWeek = date >= weekStart && date <= weekEnd

      session.exercises?.forEach(ex => {
        if (!ex.setsCompleted) return
        const doneSets = ex.setsCompleted.filter(s => s.done)
        if (doneSets.length === 0) return

        const vol = doneSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0)

        if (isThisWeek) {
          weekVolume += vol
        }

        // muscle count (all time)
        if (ex.muscle && ex.type !== 'cardio') {
          muscleCount[ex.muscle] = (muscleCount[ex.muscle] || 0) + 1
        }
      })

      if (isThisWeek) weekSessions++
    })

    // Top 5 muscles
    const topMuscles = Object.entries(muscleCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        id,
        label: allMuscleGroups.find(g => g.id === id)?.label || id,
        emoji: allMuscleGroups.find(g => g.id === id)?.emoji || '💪',
        count,
      }))

    return { weekVolume, weekSessions, topMuscles }
  }, [history, allMuscleGroups])

  // ── Monthly progression (last 6 months) ──
  const monthlyData = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i)
      const key = format(d, 'yyyy-MM')
      months.push({ key, label: format(d, 'MMM', { locale: fr }), sessions: 0, volume: 0 })
    }
    history.forEach(session => {
      const key = format(parseISO(session.completedAt), 'yyyy-MM')
      const m = months.find(m => m.key === key)
      if (!m) return
      m.sessions++
      session.exercises?.forEach(ex => {
        ex.setsCompleted?.filter(s => s.done).forEach(s => {
          m.volume += (s.weight || 0) * (s.reps || 0)
        })
      })
    })
    return months
  }, [history])

  // ── Per-exercise stats ──
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
            history: [],
          }
        }

        const stat = map[ex.name]
        stat.sessions++
        stat.lastDate = session.completedAt

        if (ex.type === 'cardio') {
          stat.history.push({
            date: format(parseISO(session.completedAt), 'dd/MM'),
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
            maxWeight: sessionMax,
            volume: sessionVol,
          })
        }
      })
    })
    return Object.values(map).sort((a, b) => b.sessions - a.sessions)
  }, [history, allExercises])

  const filtered = useMemo(() => {
    return exerciseStats.filter(ex => {
      const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase())
      const matchMuscle = muscleFilter === 'all' || ex.muscle === muscleFilter
      return matchSearch && matchMuscle
    })
  }, [exerciseStats, search, muscleFilter])

  const usedMuscles = useMemo(() => {
    const ids = new Set(exerciseStats.map(e => e.muscle))
    return allMuscleGroups.filter(g => ids.has(g.id))
  }, [exerciseStats, allMuscleGroups])

  const fmtVolume = (v) => v >= 1000 ? (v / 1000).toFixed(1) + ' t' : v + ' kg'
  const maxMonthlyVol = Math.max(...monthlyData.map(m => m.volume), 1)

  return (
    <div className="page">
      <h1 className="page-title">Statistiques</h1>

      {history.length === 0 && (
        <div className="empty-state">
          <BarChart2 size={48} />
          <p className="mt-8">Aucune donnée</p>
          <p className="text-xs mt-8 text-muted">Lance des entraînements pour voir tes stats ici</p>
        </div>
      )}

      {history.length > 0 && (
        <>
          {/* ── Cette semaine ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            <div className="card text-center" style={{ padding: 16 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)' }}>
                {fmtVolume(globalStats.weekVolume)}
              </div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>Poids soulevé cette semaine</div>
            </div>
            <div className="card text-center" style={{ padding: 16 }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{globalStats.weekSessions}</div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>Séance{globalStats.weekSessions !== 1 ? 's' : ''} cette semaine</div>
            </div>
          </div>

          {/* ── Muscles les plus travaillés ── */}
          {globalStats.topMuscles.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="font-bold text-sm" style={{ marginBottom: 14 }}>🏆 Muscles les plus travaillés</div>
              {globalStats.topMuscles.map((m, i) => {
                const pct = Math.round((m.count / globalStats.topMuscles[0].count) * 100)
                return (
                  <div key={m.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="text-sm">{m.emoji} {m.label}</span>
                      <span className="text-xs text-muted">{m.count} fois</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-input)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 3,
                        background: i === 0 ? 'var(--accent)' : i === 1 ? 'var(--success)' : 'var(--text-muted)',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Progression mensuelle ── */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="font-bold text-sm" style={{ marginBottom: 4 }}>📅 Progression mensuelle</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[['sessions', '🔥 Séances'], ['volume', '⚖️ Volume']].map(([key, label]) => (
                <button key={key} onClick={() => setChartMetric(key === chartMetric ? chartMetric : key)}
                  style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12,
                    background: chartMetric === key ? 'var(--accent)' : 'var(--bg-input)',
                    color: chartMetric === key ? '#fff' : 'var(--text)',
                    border: 'none', cursor: 'pointer'
                  }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}
                    formatter={v => [chartMetric === 'sessions' ? `${v} séances` : fmtVolume(v), '']}
                    labelFormatter={() => ''}
                  />
                  <Bar dataKey={chartMetric} radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry, i) => (
                      <Cell key={i}
                        fill={i === monthlyData.length - 1 ? 'var(--accent)' : 'var(--accent-light)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Par exercice ── */}
          <div className="font-bold text-sm" style={{ marginBottom: 12 }}>Par exercice</div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un exercice..." style={{ paddingLeft: 38 }} />
          </div>

          {/* Muscle chips */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 16 }}>
            <button className={`chip ${muscleFilter === 'all' ? 'active' : ''}`} onClick={() => setMuscleFilter('all')}>Tous</button>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  onClick={() => setExpandedEx(isOpen ? null : ex.name)}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: ex.type === 'cardio' ? 'rgba(239,68,68,0.12)' : 'var(--accent-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                  }}>
                    {muscleGroup?.emoji || '💪'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="font-bold text-sm">{ex.name}</div>
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

                {isOpen && (
                  <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    {ex.type !== 'cardio' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                        {[
                          { value: `${ex.maxWeight} kg`, label: 'Record' },
                          { value: ex.sessions, label: 'Séances' },
                          { value: fmtVolume(ex.totalVolume), label: 'Volume total' },
                        ].map(({ value, label }) => (
                          <div key={label} style={{ textAlign: 'center', background: 'var(--bg)', borderRadius: 8, padding: '10px 6px' }}>
                            <div style={{ fontSize: 16, fontWeight: 800 }}>{value}</div>
                            <div className="text-xs text-muted">{label}</div>
                          </div>
                        ))}
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

                    {hasChart && (
                      <>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                          {[['maxWeight', '🏋️ Poids max'], ['volume', '📦 Volume']].map(([key, label]) => (
                            <button key={key} onClick={() => setChartMetric(key)}
                              style={{
                                padding: '5px 12px', borderRadius: 20, fontSize: 12,
                                background: chartMetric === key ? 'var(--accent)' : 'var(--bg-input)',
                                color: chartMetric === key ? '#fff' : 'var(--text)',
                                border: 'none', cursor: 'pointer'
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
