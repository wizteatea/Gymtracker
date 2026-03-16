import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Check, Plus, Timer, RefreshCw, Minus } from 'lucide-react'
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

async function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

// Envoie le timer au Service Worker (plus fiable en arrière-plan)
async function scheduleSwNotification(secondsLeft, exerciseName) {
  if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.ready
  reg.active?.postMessage({ type: 'SCHEDULE_REST', delayMs: secondsLeft * 1000, nextExercise: exerciseName })
}

async function cancelSwNotification() {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  reg.active?.postMessage({ type: 'CANCEL_REST' })
}

// Bip sonore via Web Audio API (pas de fichier externe)
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const times = [0, 0.35, 0.7]
    times.forEach(t => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.6, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.25)
    })
  } catch (_) {}
}

// Bip court unique (alerte 15 secondes)
function playWarningBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch (_) {}
}

// ─── Wake Lock : garde l'écran allumé pendant le repos ───
async function acquireWakeLock(ref) {
  if (!('wakeLock' in navigator)) return
  try {
    if (ref.current) { ref.current.release().catch(() => {}) }
    ref.current = await navigator.wakeLock.request('screen')
    ref.current.addEventListener('release', () => { ref.current = null })
  } catch (_) {}
}
function releaseWakeLock(ref) {
  if (ref.current) {
    ref.current.release().catch(() => {})
    ref.current = null
  }
}

// ─── Timer d'élapsed séparé pour éviter de re-rendre toute la page chaque seconde ───
const ElapsedTimer = memo(function ElapsedTimer({ sessionStart }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - sessionStart) / 1000))
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000)
    return () => clearInterval(t)
  }, [sessionStart])
  return (
    <div className="text-xs text-muted">
      <Timer size={12} style={{ verticalAlign: 'middle' }} /> {formatTime(elapsed)}
    </div>
  )
})

// ─── Ligne de série mémoïsée — ne re-rend que si SES données changent ───
const SetRow = memo(function SetRow({ set, setIdx, timeMode, canRemove, onUpdate, onValidate, onRemove }) {
  return (
    <div className="flex items-center gap-6 mb-8"
      style={{
        background: set.done ? 'var(--success-light)' : 'var(--bg-card)',
        borderRadius: 'var(--radius-sm)', padding: '10px 6px',
        transition: 'background 0.2s'
      }}>
      <div style={{ width: 36, textAlign: 'center', fontWeight: 700, fontSize: 14, color: 'var(--text-muted)' }}>
        {setIdx + 1}
      </div>

      <input
        type="text"
        inputMode="decimal"
        value={set.weight}
        onChange={e => onUpdate(setIdx, 'weight', e.target.value)}
        style={{
          flex: 1, textAlign: 'center', padding: '10px 4px',
          fontSize: 18, fontWeight: 700,
          background: set.done ? 'transparent' : 'var(--bg-input)',
          borderRadius: 8
        }}
        placeholder="0"
      />

      {timeMode ? (
        <input
          type="number"
          value={set.duration}
          onChange={e => onUpdate(setIdx, 'duration', Number(e.target.value))}
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
          onChange={e => onUpdate(setIdx, 'reps', Number(e.target.value))}
          style={{
            flex: 1, textAlign: 'center', padding: '10px 4px',
            fontSize: 18, fontWeight: 700,
            background: set.done ? 'transparent' : 'var(--bg-input)',
            borderRadius: 8
          }}
        />
      )}

      <button
        onClick={() => set.done ? onUpdate(setIdx, 'done', false) : onValidate(setIdx)}
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

      <button
        onClick={() => onRemove(setIdx)}
        style={{
          width: 28, height: 44, borderRadius: 8,
          background: 'none', color: 'var(--danger)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, opacity: canRemove ? 1 : 0.2
        }}
        disabled={!canRemove}
      >
        <Minus size={16} />
      </button>
    </div>
  )
})

// ─── Composant principal ───
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
  const [finished, setFinished] = useState(false)
  const [showChangePicker, setShowChangePicker] = useState(false)
  // Remplacement temporaire d'exercice (session uniquement, ne modifie pas le workout)
  const [sessionOverrides, setSessionOverrides] = useState({})

  // Refs — pas de re-render quand ils changent
  const restInterval = useRef(null)
  const restEndRef = useRef(null)
  const restNextExRef = useRef('')
  const wakeLockRef = useRef(null)

  const initialized = useRef(false)
  const finishing = useRef(false)
  const saveDebounce = useRef(null)    // debounce localStorage writes
  const setsDataRef = useRef(setsData) // accès sans dépendance dans les callbacks
  const didFinish = useRef(false)      // bloque toute sauvegarde après fin/abandon

  // Sync ref with state
  useEffect(() => { setsDataRef.current = setsData }, [setsData])

  useEffect(() => { requestNotifPermission() }, [])

  // ── Sauvegarde en localStorage avec debounce (max 1 fois / 2s) ──
  const scheduleSave = useCallback((data) => {
    if (didFinish.current) return   // ne jamais sauvegarder après fin/abandon
    clearTimeout(saveDebounce.current)
    saveDebounce.current = setTimeout(() => {
      if (!didFinish.current) saveSession(data)
    }, 2000)
  }, [])

  // ── Helper : démarrer le chrono de repos ──
  const startRest = useCallback((seconds, nextExName) => {
    clearInterval(restInterval.current)
    cancelSwNotification()
    const endTime = Date.now() + seconds * 1000
    restEndRef.current = endTime
    restNextExRef.current = nextExName || ''
    localStorage.setItem(REST_END_KEY, endTime.toString())
    scheduleSwNotification(seconds, nextExName)
    acquireWakeLock(wakeLockRef)   // garde l'écran allumé
    setRestTotal(seconds)
    setRestTime(seconds)
    setShowRest(true)
  }, [])

  // ── Chargement du workout ──
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

  // ── Persistance avec debounce ──
  useEffect(() => {
    if (workout && setsData.length > 0 && !finished) {
      scheduleSave({ profileId, workoutId, currentExIdx, setsData, sessionStart })
    }
    // Cleanup : annule le timeout si le composant se démonte
    return () => { clearTimeout(saveDebounce.current) }
  }, [profileId, workoutId, currentExIdx, setsData, sessionStart, workout, finished, scheduleSave])

  // ── Chrono de repos (basé sur timestamp absolu) ──
  useEffect(() => {
    if (!showRest) {
      document.title = 'GymTracker'
      return
    }
    const tick = () => {
      if (!restEndRef.current) return
      const remaining = Math.max(0, Math.round((restEndRef.current - Date.now()) / 1000))
      setRestTime(remaining)
      document.title = remaining > 0 ? `⏱ ${formatTime(remaining)} — GymTracker` : '✅ Repos terminé !'
      if (remaining === 15) {
        playWarningBeep()
        if (navigator.vibrate) navigator.vibrate(100)
      }
      if (remaining <= 0) {
        clearInterval(restInterval.current)
        localStorage.removeItem(REST_END_KEY)
        releaseWakeLock(wakeLockRef)
        playBeep()
        if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
      }
    }
    tick()
    restInterval.current = setInterval(tick, 1000)
    return () => {
      clearInterval(restInterval.current)
      document.title = 'GymTracker'
    }
  }, [showRest])

  // ── Recalcul immédiat quand la page redevient visible ──
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && restEndRef.current) {
        acquireWakeLock(wakeLockRef)  // ré-acquiert après retour en premier plan
        const remaining = Math.max(0, Math.round((restEndRef.current - Date.now()) / 1000))
        setRestTime(remaining)
        if (remaining <= 0) {
          setShowRest(false)
          restEndRef.current = null
          localStorage.removeItem(REST_END_KEY)
          playBeep()
          if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
        }
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // ── Callbacks stables (useRef pour éviter les dépendances cycliques) ──
  const workoutRef = useRef(workout)
  useEffect(() => { workoutRef.current = workout }, [workout])
  const currentExIdxRef = useRef(currentExIdx)
  useEffect(() => { currentExIdxRef.current = currentExIdx }, [currentExIdx])

  const updateSet = useCallback((setIdx, field, value) => {
    const idx = currentExIdxRef.current
    setSetsData(prev => {
      const copy = prev.map((arr, i) =>
        i === idx ? arr.map((s, j) => j === setIdx ? { ...s, [field]: value } : s) : arr
      )
      return copy
    })
  }, [])

  const validateSet = useCallback((setIdx) => {
    const idx = currentExIdxRef.current
    const w = workoutRef.current
    setSetsData(prev => {
      const copy = prev.map((arr, i) =>
        i === idx ? arr.map((s, j) => {
          if (j === setIdx) return { ...s, done: true }
          if (j > setIdx && !s.done) return { ...s, weight: prev[idx][setIdx].weight }
          return s
        }) : arr
      )
      return copy
    })
    const ex = w?.exercises?.[idx]
    if (!ex?.superset && ex?.type !== 'cardio' && ex?.rest) {
      startRest(ex.rest, sessionOverrides[idx + 1]?.name || w?.exercises?.[idx + 1]?.name)
    }
  }, [startRest, sessionOverrides])

  const addSet = useCallback(() => {
    const idx = currentExIdxRef.current
    const ex = workoutRef.current?.exercises?.[idx]
    setSetsData(prev => {
      const last = prev[idx][prev[idx].length - 1]
      return prev.map((arr, i) =>
        i === idx ? [...arr, {
          weight: last?.weight || '',
          reps: ex?.timeMode ? 0 : (ex?.reps || 10),
          duration: ex?.timeMode ? (ex?.duration || 30) : 0,
          done: false
        }] : arr
      )
    })
  }, [])

  const removeSet = useCallback((setIdx) => {
    const idx = currentExIdxRef.current
    setSetsData(prev => {
      if (prev[idx].length <= 1) return prev
      return prev.map((arr, i) =>
        i === idx ? arr.filter((_, j) => j !== setIdx) : arr
      )
    })
  }, [])

  const stopRest = useCallback(() => {
    setShowRest(false)
    clearInterval(restInterval.current)
    cancelSwNotification()
    releaseWakeLock(wakeLockRef)   // libère le wake lock
    restEndRef.current = null
    localStorage.removeItem(REST_END_KEY)
    document.title = 'GymTracker'
  }, [])

  const finishSession = useCallback(() => {
    if (finishing.current) return
    finishing.current = true
    didFinish.current = true
    clearTimeout(saveDebounce.current)
    const currentSets = setsDataRef.current
    const allDone = currentSets.every(sets => sets.every(s => s.done))
    if (!allDone) {
      const ok = window.confirm('Tous les exercices ne sont pas terminés. Arrêter quand même ?')
      if (!ok) { finishing.current = false; return }
    }
    const w = workoutRef.current
    const durationSec = Math.floor((Date.now() - sessionStart) / 1000)
    addSessionToHistory(profileId, {
      workoutId,
      workoutTitle: w.title,
      exercises: w.exercises.map((ex, i) => ({ ...ex, setsCompleted: currentSets[i] })),
      duration: formatDuration(durationSec),
      durationSeconds: durationSec,
    })
    clearTimeout(saveDebounce.current)
    clearSession()
    cancelSwNotification()
    releaseWakeLock(wakeLockRef)
    refresh()
    setFinished(true)
  }, [profileId, workoutId, sessionStart, refresh])

  const abandonSession = useCallback(() => {
    if (confirm('Abandonner la séance ? Ta progression sera perdue.')) {
      didFinish.current = true
      clearTimeout(saveDebounce.current)
      clearSession()
      cancelSwNotification()
      releaseWakeLock(wakeLockRef)
      navigate('/')
    }
  }, [navigate])

  const changeExercise = useCallback((newEx) => {
    const idx = currentExIdxRef.current
    // Enregistre le remplacement temporaire (ne touche pas au workout original)
    setSessionOverrides(prev => ({ ...prev, [idx]: { exerciseId: newEx.id, name: newEx.name, muscle: newEx.muscle, type: newEx.type } }))
    // Remet les séries à zéro pour cet exercice
    setSetsData(prev => prev.map((arr, i) =>
      i === idx ? Array.from({ length: arr.length }, () => ({ weight: '', reps: arr[0]?.reps || 10, duration: arr[0]?.duration || 30, done: false })) : arr
    ))
    setShowChangePicker(false)
  }, [])

  if (!workout) return null

  // Fusionne l'exercice du workout avec l'override de session si présent
  const currentEx = sessionOverrides[currentExIdx]
    ? { ...workout.exercises[currentExIdx], ...sessionOverrides[currentExIdx] }
    : workout.exercises[currentExIdx]
  const currentSets = setsData[currentExIdx] || []
  const allExDone = currentSets.every(s => s.done)
  const isLastEx = currentExIdx === workout.exercises.length - 1
  const isSuperset = currentEx?.superset
  const nextExName = sessionOverrides[currentExIdx + 1]?.name || workout.exercises[currentExIdx + 1]?.name
  const totalSetsCompleted = setsData.reduce((sum, sets) => sum + sets.filter(s => s.done).length, 0)
  const totalSets = setsData.reduce((sum, sets) => sum + sets.length, 0)

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

  return (
    <div className="page" style={{ paddingBottom: 16 }}>
      {/* Header */}
      <div className="flex items-center gap-12 mb-8">
        <button onClick={abandonSession} style={{ background: 'none', color: 'var(--text)' }}>
          <ArrowLeft size={24} />
        </button>
        <div style={{ flex: 1 }}>
          <div className="font-bold" style={{ fontSize: 16 }}>{workout.title}</div>
          <ElapsedTimer sessionStart={sessionStart} />
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
        <button onClick={() => setCurrentExIdx(i => Math.max(0, i - 1))} disabled={currentExIdx === 0}
          style={{ background: 'none', color: currentExIdx === 0 ? 'var(--text-muted)' : 'var(--text)', padding: 8 }}>◀</button>
        <div className="text-center" style={{ flex: 1 }}>
          <div className="text-xs text-muted">Exercice {currentExIdx + 1}/{workout.exercises.length}</div>
          <div className="font-bold" style={{ fontSize: 20 }}>{currentEx?.name}</div>
          {isSuperset && (
            <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>
              🔗 SUPERSET → {nextExName}
            </div>
          )}
        </div>
        <button onClick={() => setCurrentExIdx(i => Math.min(workout.exercises.length - 1, i + 1))} disabled={isLastEx}
          style={{ background: 'none', color: isLastEx ? 'var(--text-muted)' : 'var(--text)', padding: 8 }}>▶</button>
      </div>

      {/* Change exercise */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <button onClick={() => setShowChangePicker(true)}
          style={{ background: 'none', color: 'var(--text-muted)', fontSize: 12, textDecoration: 'underline' }}>
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
          <button className={`btn ${currentSets[0]?.done ? 'btn-secondary' : 'btn-success'}`}
            onClick={() => updateSet(0, 'done', !currentSets[0]?.done)}>
            <Check size={18} /> {currentSets[0]?.done ? 'Fait ✓' : 'Valider'}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center text-xs text-muted" style={{ padding: '0 4px', marginBottom: 8 }}>
            <div style={{ width: 36, textAlign: 'center' }}>Série</div>
            <div style={{ flex: 1, textAlign: 'center' }}>Poids (kg)</div>
            <div style={{ flex: 1, textAlign: 'center' }}>{currentEx?.timeMode ? 'Durée (s)' : 'Reps'}</div>
            <div style={{ width: 44 }} /><div style={{ width: 28 }} />
          </div>
          {currentSets.map((set, setIdx) => (
            <SetRow
              key={setIdx}
              set={set}
              setIdx={setIdx}
              timeMode={currentEx?.timeMode}
              canRemove={currentSets.length > 1}
              onUpdate={updateSet}
              onValidate={validateSet}
              onRemove={removeSet}
            />
          ))}
          <button className="btn btn-secondary mt-8" onClick={addSet}>
            <Plus size={16} /> Ajouter une série
          </button>
        </>
      )}

      {allExDone && !isLastEx && (
        <button className="btn btn-primary mt-16" onClick={() => setCurrentExIdx(i => i + 1)}>
          {isSuperset ? `🔗 Superset → ${nextExName}` : 'Exercice suivant ▶'}
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
          <div style={{ width: 120, height: 120 }}>
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
            <button className="btn btn-secondary btn-small"
              onClick={() => {
                const t = Math.max(0, restTime - 15)
                const endTime = Date.now() + t * 1000
                restEndRef.current = endTime
                localStorage.setItem(REST_END_KEY, endTime.toString())
                cancelSwNotification()
                if (t > 0) scheduleSwNotification(t, restNextExRef.current)
                setRestTime(t)
              }}>-15s</button>
            <button className="btn btn-primary btn-small" onClick={stopRest}>
              {restTime === 0 ? 'OK' : 'Passer'}
            </button>
            <button className="btn btn-secondary btn-small"
              onClick={() => {
                const t = restTime + 15
                const endTime = Date.now() + t * 1000
                restEndRef.current = endTime
                localStorage.setItem(REST_END_KEY, endTime.toString())
                cancelSwNotification()
                scheduleSwNotification(t, restNextExRef.current)
                setRestTime(t)
              }}>+15s</button>
          </div>
        </div>
      )}

      {showChangePicker && (
        <ExercisePicker onSelect={changeExercise} onClose={() => setShowChangePicker(false)} selectedIds={[]} />
      )}
    </div>
  )
}
