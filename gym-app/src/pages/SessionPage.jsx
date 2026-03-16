import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Check, Plus, Timer, RefreshCw, Minus, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getWorkouts, addSessionToHistory } from '../data/store'
import ExercisePicker from '../components/ExercisePicker'

const SESSION_KEY = 'gym_active_session'
const REST_END_KEY = 'gym_rest_end'

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

function parseWeight(val) {
  if (typeof val === 'number') return val
  return parseFloat(String(val).replace(',', '.')) || 0
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
  localStorage.removeItem(REST_END_KEY)
}

// Request notification permission
async function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

function scheduleNotification(secondsLeft, exerciseName) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return null
  const endTime = Date.now() + secondsLeft * 1000
  localStorage.setItem(REST_END_KEY, endTime.toString())
  const t = setTimeout(() => {
    new Notification('GymTracker — Repos terminé !', {
      body: `Exercice suivant : ${exerciseName}`,
      icon: '/icon.svg',
    })
  }, secondsLeft * 1000)
  return t
}

function cancelNotification(t) {
  if (t) clearTimeout(t)
  localStorage.removeItem(REST_END_KEY)
}

export default function SessionPage() {
  const { profileId, refresh } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const workoutIdFromNav = location.state?.workoutId

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
  const [showChangePicker, setShowChangePicker] = useState(false)

  const restInterval = useRef(null)
  const restEndRef = useRef(null)   // absolute timestamp when rest ends
  const notifTimer = useRef(null)
  const initialized = useRef(false)
  const finishing = useRef(false)

  // Request notification permission on mount
  useEffect(() => { requestNotifPermission() }, [])

  // Start rest helper — uses absolute time so it works when page is in background
  const startRest = useCallback((seconds, nextExName) => {
    clearInterval(restInterval.current)
    cancelNotification(notifTimer.current)
    const endTime = Date.now() + seconds * 1000
    restEndRef.current = endTime
    localStorage.setItem(REST_END_KEY, endTime.toString())
    notifTimer.current = scheduleNotification(seconds, nextExName || 'prochain exercice')
    setRestTotal(seconds)
    setRestTime(seconds)
    setShowRest(true)   // ce changement déclenche le useEffect du timer
  }, []) // eslint-disable-line

  // Load workout
  useEffect(() => {
    if (finished) return
    if (!workoutId) { navigate('/', { replace: true }); return }
    const workouts = getWorkouts(profileId)
    const w = workouts.find(ww => ww.id === workoutId)
    if (!w) { navigate('/', { replace: true }); return }
    setWorkout(w)

    if (!initialized.current) {
      initialized.current = true
      if (isResume && saved?.setsData) {
        setSetsData(saved.setsData)
        setCurrentExIdx(saved.currentExIdx || 0)

        // Restore rest timer if still active
        const restEnd = localStorage.getItem(REST_END_KEY)
        if (restEnd) {
          const endTime = parseInt(restEnd)
          const remaining = Math.round((endTime - Date.now()) / 1000)
          if (remaining > 0) {
            restEndRef.current = endTime
            setRestTotal(remaining)
            setRestTime(remaining)
            setShowRest(true)
          } else {
            localStorage.removeItem(REST_END_KEY)
          }
        }
      } else {
        setSetsData(w.exercises.map(ex => {
          if (ex.type === 'cardio') {
            return [{ duration: ex.duration, distance: ex.distance, calories: ex.calories, done: false }]
          }
          return Array.from({ length: ex.sets }, () => ({
            weight: '',
            reps: ex.timeMode ? 0 : ex.reps,
            duration: ex.timeMode ? (ex.duration || 30) : 0,
            done: false,
          }))
        }))
      }
    }
  }, [workoutId, profileId, navigate, isResume, saved, finished])

  // Persist session
  useEffect(() => {
    if (workout && setsData.length > 0 && !finished) {
      saveSession({ profileId, workoutId, currentExIdx, setsData, sessionStart })
    }
  }, [profileId, workoutId, currentExIdx, setsData, sessionStart, workout, finished])

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000)
    return () => clearInterval(t)
  }, [sessionStart])

  // Rest timer — calcule le temps restant à partir de l'heure absolue
  // Fonctionne même si la page était en arrière-plan
  useEffect(() => {
    if (!showRest) return

    const tick = () => {
      if (!restEndRef.current) return
      const remaining = Math.max(0, Math.round((restEndRef.current - Date.now()) / 1000))
      setRestTime(remaining)
      if (remaining <= 0) {
        clearInterval(restInterval.current)
        localStorage.removeItem(REST_END_KEY)
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      }
    }

    tick() // tick immédiat au cas où la page était en arrière-plan
    restInterval.current = setInterval(tick, 1000)
    return () => clearInterval(restInterval.current)
  }, [showRest])

  // Quand la page redevient visible, recalcule immédiatement le temps restant
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && restEndRef.current) {
        const remaining = Math.max(0, Math.round((restEndRef.current - Date.now()) / 1000))
        setRestTime(remaining)
        if (remaining <= 0) {
          setShowRest(false)
          localStorage.removeItem(REST_END_KEY)
          if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        }
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const currentEx = workout?.exercises?.[currentExIdx]
  const currentSets = setsData[currentExIdx] || []

  const updateSet = useCallback((setIdx, field, value) => {
    setSetsData(prev => {
      const copy = prev.map(arr => arr.map(s => ({ ...s })))
      copy[currentExIdx][setIdx][field] = value
      return copy
    })
  }, [currentExIdx])

  const validateSet = useCallback((setIdx) => {
    setSetsData(prev => {
      const copy = prev.map(arr => arr.map(s => ({ ...s })))
      const currentWeight = copy[currentExIdx][setIdx].weight
      copy[currentExIdx][setIdx].done = true

      // Auto-copy weight to next undone sets
      for (let i = setIdx + 1; i < copy[currentExIdx].length; i++) {
        if (!copy[currentExIdx][i].done) {
          copy[currentExIdx][i].weight = currentWeight
        }
      }
      return copy
    })

    // Start rest timer after EVERY set (not just when all are done)
    // Exception: supersets — repos seulement après le dernier exercice du superset
    const ex = workout?.exercises?.[currentExIdx]
    if (!ex?.superset && ex?.type !== 'cardio' && ex?.rest) {
      const nextEx = workout?.exercises?.[currentExIdx + 1]
      startRest(ex.rest, nextEx?.name)
    }
  }, [currentExIdx, workout, startRest])

  const addSet = () => {
    setSetsData(prev => {
      const copy = prev.map(arr => arr.map(s => ({ ...s })))
      const last = copy[currentExIdx][copy[currentExIdx].length - 1]
      copy[currentExIdx].push({
        weight: last?.weight || '',
        reps: currentEx?.timeMode ? 0 : (currentEx?.reps || 10),
        duration: currentEx?.timeMode ? (currentEx?.duration || 30) : 0,
        done: false
      })
      return copy
    })
  }

  const removeSet = (setIdx) => {
    setSetsData(prev => {
      const copy = prev.map(arr => arr.map(s => ({ ...s })))
      if (copy[currentExIdx].length <= 1) return prev
      copy[currentExIdx].splice(setIdx, 1)
      return copy
    })
  }

  const nextExercise = () => {
    if (currentExIdx < workout.exercises.length - 1) setCurrentExIdx(currentExIdx + 1)
  }

  const prevExercise = () => {
    if (currentExIdx > 0) setCurrentExIdx(currentExIdx - 1)
  }

  const changeExercise = (newEx) => {
    const updated = { ...workout }
    updated.exercises = [...workout.exercises]
    updated.exercises[currentExIdx] = {
      ...updated.exercises[currentExIdx],
      exerciseId: newEx.id,
      name: newEx.name,
      muscle: newEx.muscle,
      type: newEx.type,
    }
    setWorkout(updated)

    // Reset sets for this exercise
    setSetsData(prev => {
      const copy = prev.map(arr => arr.map(s => ({ ...s })))
      const ex = updated.exercises[currentExIdx]
      if (ex.type === 'cardio') {
        copy[currentExIdx] = [{ duration: ex.duration, distance: ex.distance, calories: ex.calories, done: false }]
      } else {
        copy[currentExIdx] = Array.from({ length: ex.sets || 3 }, () => ({
          weight: '', reps: ex.reps || 10, duration: ex.duration || 30, done: false
        }))
      }
      return copy
    })
    setShowChangePicker(false)
  }

  const stopRest = () => {
    setShowRest(false)
    clearInterval(restInterval.current)
    cancelNotification(notifTimer.current)
  }

  const finishSession = useCallback(() => {
    if (finishing.current) return
    finishing.current = true

    const allDone = setsData.every(sets => sets.every(s => s.done))
    if (!allDone) {
      const ok = window.confirm('Tous les exercices ne sont pas terminés. Arrêter la séance quand même ?')
      if (!ok) { finishing.current = false; return }
    }

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
    cancelNotification(notifTimer.current)
    refresh()
    setFinished(true)
  }, [finishing, setsData, sessionStart, profileId, workoutId, workout, refresh])

  const abandonSession = () => {
    if (confirm('Abandonner la séance ? Ta progression sera perdue.')) {
      clearSession()
      cancelNotification(notifTimer.current)
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
        <button className="btn btn-primary mt-16" onClick={() => navigate('/', { replace: true })}>
          Retour à l'accueil
        </button>
      </div>
    )
  }

  const allExDone = currentSets.every(s => s.done)
  const isLastEx = currentExIdx === workout.exercises.length - 1
  const totalSetsCompleted = setsData.reduce((sum, sets) => sum + sets.filter(s => s.done).length, 0)
  const totalSets = setsData.reduce((sum, sets) => sum + sets.length, 0)

  // Superset: is this exercise chained with next?
  const isSuperset = currentEx?.superset

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
          Fin de séance
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
      <div className="flex items-center justify-between mb-8">
        <button onClick={prevExercise} disabled={currentExIdx === 0}
          style={{ background: 'none', color: currentExIdx === 0 ? 'var(--text-muted)' : 'var(--text)', padding: 8 }}>
          ◀
        </button>
        <div className="text-center" style={{ flex: 1 }}>
          <div className="text-xs text-muted">Exercice {currentExIdx + 1}/{workout.exercises.length}</div>
          <div className="font-bold" style={{ fontSize: 20 }}>{currentEx?.name}</div>
          {isSuperset && (
            <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
              🔗 SUPERSET → {workout.exercises[currentExIdx + 1]?.name}
            </div>
          )}
        </div>
        <button onClick={nextExercise} disabled={isLastEx}
          style={{ background: 'none', color: isLastEx ? 'var(--text-muted)' : 'var(--text)', padding: 8 }}>
          ▶
        </button>
      </div>

      {/* Change exercise button */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <button
          onClick={() => setShowChangePicker(true)}
          style={{ background: 'none', color: 'var(--text-muted)', fontSize: 12, textDecoration: 'underline' }}
        >
          <RefreshCw size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Changer cet exercice
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
            <div style={{ flex: 1, textAlign: 'center' }}>{currentEx?.timeMode ? 'Durée (s)' : 'Reps'}</div>
            <div style={{ width: 44 }}></div>
            <div style={{ width: 32 }}></div>
          </div>

          {currentSets.map((set, setIdx) => (
            <div key={setIdx} className="flex items-center gap-6 mb-8"
              style={{
                background: set.done ? 'var(--success-light)' : 'var(--bg-card)',
                borderRadius: 'var(--radius-sm)', padding: '10px 6px'
              }}>
              <div style={{ width: 36, textAlign: 'center', fontWeight: 700, fontSize: 14, color: 'var(--text-muted)' }}>
                {setIdx + 1}
              </div>

              {/* Weight — text input to allow comma (7,5) */}
              <input
                type="text"
                inputMode="decimal"
                value={set.weight}
                onChange={e => updateSet(setIdx, 'weight', e.target.value)}
                style={{
                  flex: 1, textAlign: 'center', padding: '10px 4px',
                  fontSize: 18, fontWeight: 700,
                  background: set.done ? 'transparent' : 'var(--bg-input)',
                  borderRadius: 8
                }}
                placeholder="0"
              />

              {/* Reps or Duration */}
              {currentEx?.timeMode ? (
                <input
                  type="number"
                  value={set.duration}
                  onChange={e => updateSet(setIdx, 'duration', Number(e.target.value))}
                  style={{
                    flex: 1, textAlign: 'center', padding: '10px 4px',
                    fontSize: 18, fontWeight: 700,
                    background: set.done ? 'transparent' : 'var(--bg-input)',
                    borderRadius: 8
                  }}
                />
              ) : (
                <input
                  type="number"
                  value={set.reps}
                  onChange={e => updateSet(setIdx, 'reps', Number(e.target.value))}
                  style={{
                    flex: 1, textAlign: 'center', padding: '10px 4px',
                    fontSize: 18, fontWeight: 700,
                    background: set.done ? 'transparent' : 'var(--bg-input)',
                    borderRadius: 8
                  }}
                />
              )}

              {/* Validate */}
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

              {/* Remove set */}
              <button
                onClick={() => removeSet(setIdx)}
                style={{
                  width: 28, height: 44, borderRadius: 8,
                  background: 'none', color: 'var(--danger)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, opacity: currentSets.length <= 1 ? 0.2 : 1
                }}
                disabled={currentSets.length <= 1}
              >
                <Minus size={16} />
              </button>
            </div>
          ))}

          <button className="btn btn-secondary mt-8" onClick={addSet}>
            <Plus size={16} /> Ajouter une série
          </button>
        </>
      )}

      {/* Next exercise / superset button */}
      {allExDone && !isLastEx && (
        <button className="btn btn-primary mt-16" onClick={nextExercise}>
          {isSuperset ? `🔗 Superset → ${workout.exercises[currentExIdx + 1]?.name}` : 'Exercice suivant ▶'}
        </button>
      )}
      {allExDone && isLastEx && (
        <button className="btn btn-success mt-16" onClick={finishSession}>
          <Check size={18} /> Fin de séance
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
            <button className="btn btn-secondary btn-small" onClick={() => setRestTime(r => Math.max(0, r - 15))}>-15s</button>
            <button className="btn btn-primary btn-small" onClick={stopRest}>
              {restTime === 0 ? 'OK' : 'Passer'}
            </button>
            <button className="btn btn-secondary btn-small" onClick={() => setRestTime(r => r + 15)}>+15s</button>
          </div>
          {restTime > 0 && (
            <div className="text-xs text-muted mt-8" style={{ textAlign: 'center' }}>
              Une notification vous alertera si vous quittez l'app
            </div>
          )}
        </div>
      )}

      {/* Change exercise picker */}
      {showChangePicker && (
        <ExercisePicker
          onSelect={changeExercise}
          onClose={() => setShowChangePicker(false)}
          selectedIds={[]}
        />
      )}
    </div>
  )
}
