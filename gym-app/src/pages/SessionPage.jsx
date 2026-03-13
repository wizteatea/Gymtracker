import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Check, Plus, SkipForward, Timer } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getWorkouts, addSessionToHistory } from '../data/store'

const SESSION_KEY = 'gym_active_session'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`
  return `${m} min`
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveSession(data) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data))
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export default function SessionPage() {
  const { profileId, refresh } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const workoutIdFromNav = location.state?.workoutId

  // Try to restore a saved session, or start a new one
  const saved = loadSession()
  const isResume = !workoutIdFromNav && saved && saved.profileId === profileId
  const workoutId = workoutIdFromNav || saved?.workoutId

  const [workout, setWorkout] = useState(null)
  const [currentExIdx, setCurrentExIdx] = useState(saved?.currentExIdx || 0)
  const [setsData, setSetsData] = useState(saved?.setsData || [])
  const [showRest, setShowRest] = useState(false)
  const [restTime, setRestTime] = useState(0)
  const [restTotal, setRestTotal] = useState(0)
  const [sessionStart] = useState(() => saved?.sessionStart || Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const restInterval = useRef(null)
  const initialized = useRef(false)

  // Load workout
  useEffect(() => {
    if (!workoutId) { navigate('/'); return }
    const workouts = getWorkouts(profileId)
    const w = workouts.find(ww => ww.id === workoutId)
    if (!w) { navigate('/'); return }
    setWorkout(w)

    // Only init setsData if fresh start (not resumed)
    if (!initialized.current) {
      initialized.current = true
      if (isResume && saved?.setsData) {
        setSetsData(saved.setsData)
        setCurrentExIdx(saved.currentExIdx || 0)
      } else {
        setSetsData(w.exercises.map(ex => {
          if (ex.type === 'cardio') {
            return [{ duration: ex.duration, distance: ex.distance, calories: ex.calories, done: false }]
          }
          return Array.from({ length: ex.sets }, () => ({
            weight: 0,
            reps: ex.reps,
            done: false,
          }))
        }))
      }
    }
  }, [workoutId, profileId, navigate, isResume, saved])

  // Persist session to localStorage on every change
  useEffect(() => {
    if (workout && setsData.length > 0 && !finished) {
      saveSession({
        profileId,
        workoutId,
        currentExIdx,
        setsData,
        sessionStart,
      })
    }
  }, [profileId, workoutId, currentExIdx, setsData, sessionStart, workout, finished])

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000)
    return () => clearInterval(t)
  }, [sessionStart])

  // Rest timer
  useEffect(() => {
    if (showRest && restTime > 0) {
      restInterval.current = setInterval(() => {
        setRestTime(prev => {
          if (prev <= 1) {
            clearInterval(restInterval.current)
            if (navigator.vibrate) navigator.vibrate([200, 100, 200])
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(restInterval.current)
    }
  }, [showRest, restTime])

  const currentEx = workout?.exercises?.[currentExIdx]
  const currentSets = setsData[currentExIdx] || []

  const updateSet = (setIdx, field, value) => {
    setSetsData(prev => {
      const copy = prev.map(arr => [...arr.map(s => ({ ...s }))])
      copy[currentExIdx][setIdx][field] = value
      return copy
    })
  }

  const validateSet = (setIdx) => {
    updateSet(setIdx, 'done', true)
    if (currentEx?.type !== 'cardio' && currentEx?.rest) {
      setRestTime(currentEx.rest)
      setRestTotal(currentEx.rest)
      setShowRest(true)
    }
  }

  const addSet = () => {
    setSetsData(prev => {
      const copy = prev.map(arr => [...arr.map(s => ({ ...s }))])
      const lastSet = copy[currentExIdx][copy[currentExIdx].length - 1]
      copy[currentExIdx].push({ weight: lastSet?.weight || 0, reps: currentEx?.reps || 10, done: false })
      return copy
    })
  }

  const nextExercise = () => {
    if (currentExIdx < workout.exercises.length - 1) setCurrentExIdx(currentExIdx + 1)
  }

  const prevExercise = () => {
    if (currentExIdx > 0) setCurrentExIdx(currentExIdx - 1)
  }

  const finishSession = () => {
    const durationSec = Math.floor((Date.now() - sessionStart) / 1000)
    addSessionToHistory(profileId, {
      workoutId,
      workoutTitle: workout.title,
      exercises: workout.exercises.map((ex, i) => ({
        ...ex,
        setsCompleted: setsData[i],
      })),
      duration: formatDuration(durationSec),
      durationSeconds: durationSec,
    })
    clearSession()
    refresh()
    setFinished(true)
  }

  const abandonSession = () => {
    if (confirm('Abandonner la séance ? Ta progression sera perdue.')) {
      clearSession()
      navigate('/')
    }
  }

  if (!workout) return null

  if (finished) {
    const durationSec = Math.floor((Date.now() - sessionStart) / 1000)
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Séance terminée !</h1>
        <p className="text-secondary mb-16">{workout.title}</p>
        <div className="card w-full" style={{ display: 'flex', justifyContent: 'space-around', padding: 20 }}>
          <div className="text-center">
            <div style={{ fontSize: 24, fontWeight: 700 }}>{formatDuration(durationSec)}</div>
            <div className="text-xs text-muted">Durée</div>
          </div>
          <div className="text-center">
            <div style={{ fontSize: 24, fontWeight: 700 }}>{workout.exercises.length}</div>
            <div className="text-xs text-muted">Exercices</div>
          </div>
          <div className="text-center">
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {setsData.reduce((sum, sets) => sum + sets.filter(s => s.done).length, 0)}
            </div>
            <div className="text-xs text-muted">Séries</div>
          </div>
        </div>
        <button className="btn btn-primary mt-16" onClick={() => navigate('/')}>
          Retour à l'accueil
        </button>
      </div>
    )
  }

  const allExDone = currentSets.every(s => s.done)
  const isLastEx = currentExIdx === workout.exercises.length - 1
  const totalSetsCompleted = setsData.reduce((sum, sets) => sum + sets.filter(s => s.done).length, 0)
  const totalSets = setsData.reduce((sum, sets) => sum + sets.length, 0)

  return (
    <div className="page" style={{ paddingBottom: 16 }}>
      {/* Header */}
      <div className="flex items-center gap-12 mb-8">
        <button onClick={abandonSession} style={{ background: 'none', color: 'var(--text)' }}>
          <ArrowLeft size={24} />
        </button>
        <div style={{ flex: 1 }}>
          <div className="font-bold" style={{ fontSize: 16 }}>{workout.title}</div>
          <div className="text-xs text-muted">
            <Timer size={12} style={{ verticalAlign: 'middle' }} /> {formatTime(elapsed)}
          </div>
        </div>
        <button className="btn btn-success btn-small" onClick={finishSession}>
          <Check size={16} /> Terminer
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ background: 'var(--bg-input)', borderRadius: 4, height: 4, marginBottom: 16 }}>
        <div style={{
          background: 'var(--accent)', borderRadius: 4, height: '100%',
          width: `${totalSets > 0 ? (totalSetsCompleted / totalSets) * 100 : 0}%`,
          transition: 'width 0.3s'
        }} />
      </div>

      {/* Exercise navigation */}
      <div className="flex items-center justify-between mb-16">
        <button onClick={prevExercise} disabled={currentExIdx === 0}
          style={{ background: 'none', color: currentExIdx === 0 ? 'var(--text-muted)' : 'var(--text)', padding: 8 }}>
          ◀
        </button>
        <div className="text-center">
          <div className="text-xs text-muted">Exercice {currentExIdx + 1}/{workout.exercises.length}</div>
          <div className="font-bold" style={{ fontSize: 20 }}>{currentEx?.name}</div>
        </div>
        <button onClick={nextExercise} disabled={isLastEx}
          style={{ background: 'none', color: isLastEx ? 'var(--text-muted)' : 'var(--text)', padding: 8 }}>
          ▶
        </button>
      </div>

      {/* Sets */}
      {currentEx?.type === 'cardio' ? (
        <div className="card">
          <div className="form-row mb-8">
            <div className="form-group">
              <label className="form-label">Durée (min)</label>
              <input type="number" value={currentSets[0]?.duration || 0}
                onChange={e => updateSet(0, 'duration', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label className="form-label">Distance</label>
              <input type="number" step="0.1" value={currentSets[0]?.distance || 0}
                onChange={e => updateSet(0, 'distance', Number(e.target.value))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Calories</label>
            <input type="number" value={currentSets[0]?.calories || 0}
              onChange={e => updateSet(0, 'calories', Number(e.target.value))} />
          </div>
          <button
            className={`btn ${currentSets[0]?.done ? 'btn-secondary' : 'btn-success'}`}
            onClick={() => updateSet(0, 'done', !currentSets[0]?.done)}
          >
            <Check size={18} /> {currentSets[0]?.done ? 'Fait ✓' : 'Valider'}
          </button>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div className="flex items-center text-xs text-muted" style={{ padding: '0 4px', marginBottom: 8 }}>
            <div style={{ width: 36, textAlign: 'center' }}>Série</div>
            <div style={{ flex: 1, textAlign: 'center' }}>Poids (kg)</div>
            <div style={{ flex: 1, textAlign: 'center' }}>Reps</div>
            <div style={{ width: 52 }}></div>
          </div>

          {currentSets.map((set, setIdx) => (
            <div key={setIdx} className="flex items-center gap-8 mb-8"
              style={{
                background: set.done ? 'var(--success-light)' : 'var(--bg-card)',
                borderRadius: 'var(--radius-sm)', padding: '10px 8px'
              }}>
              <div style={{ width: 36, textAlign: 'center', fontWeight: 700, fontSize: 14, color: 'var(--text-muted)' }}>
                {setIdx + 1}
              </div>
              <input
                type="number"
                value={set.weight}
                onChange={e => updateSet(setIdx, 'weight', Number(e.target.value))}
                style={{
                  flex: 1, textAlign: 'center', padding: '10px 8px',
                  fontSize: 18, fontWeight: 700,
                  background: set.done ? 'transparent' : 'var(--bg-input)'
                }}
                step="0.5"
              />
              <input
                type="number"
                value={set.reps}
                onChange={e => updateSet(setIdx, 'reps', Number(e.target.value))}
                style={{
                  flex: 1, textAlign: 'center', padding: '10px 8px',
                  fontSize: 18, fontWeight: 700,
                  background: set.done ? 'transparent' : 'var(--bg-input)'
                }}
              />
              <button
                onClick={() => set.done ? updateSet(setIdx, 'done', false) : validateSet(setIdx)}
                style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: set.done ? 'var(--success)' : 'var(--bg-input)',
                  color: set.done ? 'white' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Check size={20} />
              </button>
            </div>
          ))}

          <button className="btn btn-secondary mt-8" onClick={addSet}>
            <Plus size={16} /> Ajouter une série
          </button>
        </>
      )}

      {/* Next exercise button */}
      {allExDone && !isLastEx && (
        <button className="btn btn-primary mt-16" onClick={nextExercise}>
          <SkipForward size={18} /> Exercice suivant
        </button>
      )}
      {allExDone && isLastEx && (
        <button className="btn btn-success mt-16" onClick={finishSession}>
          <Check size={18} /> Terminer la séance
        </button>
      )}

      {/* Rest timer overlay */}
      {showRest && (
        <div className="rest-timer-overlay">
          <div className="text-secondary text-sm">Temps de repos</div>
          <div className="rest-timer-time" style={{ color: restTime === 0 ? 'var(--success)' : 'var(--text)' }}>
            {formatTime(restTime)}
          </div>
          <div style={{ width: 120, height: 120, position: 'relative' }}>
            <svg viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--bg-input)" strokeWidth="6" />
              <circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent)" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - (restTotal > 0 ? restTime / restTotal : 0))}`}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
          </div>
          <div className="flex gap-12">
            <button className="btn btn-secondary btn-small" onClick={() => setRestTime(r => Math.max(0, r - 15))}>
              -15s
            </button>
            <button className="btn btn-primary btn-small" onClick={() => { setShowRest(false); clearInterval(restInterval.current) }}>
              {restTime === 0 ? 'OK' : 'Passer'}
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => setRestTime(r => r + 15)}>
              +15s
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
