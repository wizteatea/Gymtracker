import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Check, Plus, Timer, RefreshCw, Minus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getWorkouts, addSessionToHistory, completeScheduledWorkout } from '../data/store'
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

// Groupe les exercices en blocs : un bloc = exercices liés en superset
function computeBlocks(exercises) {
  const blocks = []
  let i = 0
  while (i < exercises.length) {
    const block = [i]
    while (exercises[i]?.superset && i + 1 < exercises.length) {
      i++
      block.push(i)
    }
    blocks.push(block)
    i++
  }
  return blocks
}

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null }
}
function saveSession(data) { localStorage.setItem(SESSION_KEY, JSON.stringify(data)) }
function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(REST_END_KEY)
}

async function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default')
    await Notification.requestPermission()
}

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

let _audioCtx = null
function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume()
  return _audioCtx
}

function playBeep() {
  try {
    const ctx = getAudioCtx()
    ;[0, 0.35, 0.7].forEach(t => {
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 880; osc.type = 'sine'
      gain.gain.setValueAtTime(0.6, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25)
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.25)
    })
  } catch (_) {}
}

function playWarningBeep() {
  try {
    const ctx = getAudioCtx()
    const osc = ctx.createOscillator(), gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = 660; osc.type = 'sine'
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2)
  } catch (_) {}
}

async function acquireWakeLock(ref) {
  if (!('wakeLock' in navigator)) return
  try {
    if (ref.current) ref.current.release().catch(() => {})
    ref.current = await navigator.wakeLock.request('screen')
    ref.current.addEventListener('release', () => { ref.current = null })
  } catch (_) {}
}
function releaseWakeLock(ref) {
  if (ref.current) { ref.current.release().catch(() => {}); ref.current = null }
}

// ─── Timer élapsed isolé (ne re-rend pas les séries) ───
const ElapsedTimer = memo(function ElapsedTimer({ sessionStart }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - sessionStart) / 1000))
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart) / 1000)), 1000)
    return () => clearInterval(t)
  }, [sessionStart])
  return <div className="text-xs text-muted"><Timer size={12} style={{ verticalAlign: 'middle' }} /> {formatTime(elapsed)}</div>
})

// ─── Ligne de série mémoïsée ───
const SetRow = memo(function SetRow({ exIdx, set, setIdx, timeMode, canRemove, onUpdate, onValidate, onRemove }) {
  return (
    <div className="flex items-center gap-6 mb-6"
      style={{
        background: set.done ? 'var(--success-light)' : 'var(--bg-card)',
        borderRadius: 'var(--radius-sm)', padding: '10px 6px',
        transition: 'background 0.2s'
      }}>
      <div style={{ width: 32, textAlign: 'center', fontWeight: 700, fontSize: 13, color: 'var(--text-muted)' }}>
        {setIdx + 1}
      </div>
      <input type="text" inputMode="decimal" value={set.weight}
        onChange={e => onUpdate(exIdx, setIdx, 'weight', e.target.value)}
        style={{ flex: 1, textAlign: 'center', padding: '10px 4px', fontSize: 18, fontWeight: 700,
          background: set.done ? 'transparent' : 'var(--bg-input)', borderRadius: 8 }}
        placeholder="0" />
      {timeMode ? (
        <input type="number" value={set.duration}
          onChange={e => onUpdate(exIdx, setIdx, 'duration', Number(e.target.value))}
          style={{ flex: 1, textAlign: 'center', padding: '10px 4px', fontSize: 18, fontWeight: 700,
            background: set.done ? 'transparent' : 'var(--bg-input)', borderRadius: 8 }} />
      ) : (
        <input type="number" value={set.reps}
          onChange={e => onUpdate(exIdx, setIdx, 'reps', Number(e.target.value))}
          style={{ flex: 1, textAlign: 'center', padding: '10px 4px', fontSize: 18, fontWeight: 700,
            background: set.done ? 'transparent' : 'var(--bg-input)', borderRadius: 8 }} />
      )}
      <button onClick={() => set.done ? onUpdate(exIdx, setIdx, 'done', false) : onValidate(exIdx, setIdx)}
        style={{ width: 44, height: 44, borderRadius: 10,
          background: set.done ? 'var(--success)' : 'var(--bg-input)',
          color: set.done ? 'white' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Check size={20} />
      </button>
      <button onClick={() => onRemove(exIdx, setIdx)} disabled={!canRemove}
        style={{ width: 28, height: 44, borderRadius: 8, background: 'none', color: 'var(--danger)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          opacity: canRemove ? 1 : 0.2 }}>
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
  const scheduleIdFromNav = location.state?.scheduleId

  const saved = loadSession()
  const isResume = !workoutIdFromNav && saved && saved.profileId === profileId
  const workoutId = workoutIdFromNav || saved?.workoutId
  const scheduleId = scheduleIdFromNav || saved?.scheduleId || null

  const [workout, setWorkout] = useState(null)
  const [currentBlockIdx, setCurrentBlockIdx] = useState(saved?.currentBlockIdx || 0)
  const [setsData, setSetsData] = useState(saved?.setsData || [])
  const [showRest, setShowRest] = useState(false)
  const [restTime, setRestTime] = useState(0)
  const [restTotal, setRestTotal] = useState(0)
  const [sessionStart] = useState(() => saved?.sessionStart || Date.now())
  const [finished, setFinished] = useState(false)
  const [changePickerForIdx, setChangePickerForIdx] = useState(null) // exIdx ou null
  const [sessionOverrides, setSessionOverrides] = useState({})
  const [showAddPicker, setShowAddPicker] = useState(false)

  const restInterval = useRef(null)
  const restEndRef = useRef(null)
  const restNextExRef = useRef('')
  const wakeLockRef = useRef(null)
  const initialized = useRef(false)
  const finishing = useRef(false)
  const saveDebounce = useRef(null)
  const setsDataRef = useRef(setsData)
  const didFinish = useRef(false)
  const workoutRef = useRef(workout)
  const blocksRef = useRef([])

  useEffect(() => { setsDataRef.current = setsData }, [setsData])
  useEffect(() => { workoutRef.current = workout }, [workout])

  useEffect(() => { requestNotifPermission() }, [])

  // ── Calcul des blocs ──
  const blocks = useMemo(() => {
    if (!workout) return []
    const b = computeBlocks(workout.exercises)
    blocksRef.current = b
    return b
  }, [workout])

  // ── Sauvegarde debounce ──
  const scheduleSave = useCallback((data) => {
    if (didFinish.current) return
    clearTimeout(saveDebounce.current)
    saveDebounce.current = setTimeout(() => {
      if (!didFinish.current) saveSession(data)
    }, 2000)
  }, [])

  // ── Démarrer le repos ──
  const startRest = useCallback((seconds, nextExName) => {
    clearInterval(restInterval.current)
    cancelSwNotification()
    const endTime = Date.now() + seconds * 1000
    restEndRef.current = endTime
    restNextExRef.current = nextExName || ''
    localStorage.setItem(REST_END_KEY, endTime.toString())
    scheduleSwNotification(seconds, nextExName)
    acquireWakeLock(wakeLockRef)
    setRestTotal(seconds)
    setRestTime(seconds)
    setShowRest(true)
  }, [])

  // ── Chargement du workout (une seule fois) ──
  useEffect(() => {
    if (finished || initialized.current) return
    if (!workoutId) { navigate('/', { replace: true }); return }
    const workouts = getWorkouts(profileId)
    const w = workouts.find(ww => ww.id === workoutId)
    if (!w) { navigate('/', { replace: true }); return }
    // Restore modified exercises if session was modified (add/delete), otherwise use original workout
    if (isResume && saved?.modifiedExercises) {
      setWorkout({ ...w, exercises: saved.modifiedExercises })
    } else {
      setWorkout(w)
    }
    if (isResume && saved?.sessionOverrides) {
      setSessionOverrides(saved.sessionOverrides)
    }
    initialized.current = true

    if (isResume && saved?.setsData) {
      setSetsData(saved.setsData)
      setCurrentBlockIdx(saved.currentBlockIdx || 0)
      const restEnd = localStorage.getItem(REST_END_KEY)
      if (restEnd) {
        const endTime = parseInt(restEnd)
        const remaining = Math.round((endTime - Date.now()) / 1000)
        if (remaining > 0) {
          restEndRef.current = endTime
          setRestTotal(remaining)
          setRestTime(remaining)
          setShowRest(true)
        } else localStorage.removeItem(REST_END_KEY)
      }
    } else {
      setSetsData(w.exercises.map(ex => {
        if (ex.type === 'cardio')
          return [{ duration: ex.duration, distance: ex.distance, calories: ex.calories, done: false }]
        return Array.from({ length: ex.sets }, () => ({
          weight: '', reps: ex.timeMode ? 0 : ex.reps,
          duration: ex.timeMode ? (ex.duration || 30) : 0, done: false,
        }))
      }))
    }
  }, [workoutId, profileId, navigate, isResume, saved, finished])

  // ── Persistance ──
  useEffect(() => {
    if (workout && setsData.length > 0 && !finished)
      scheduleSave({ profileId, workoutId, scheduleId, currentBlockIdx, setsData, sessionStart, modifiedExercises: workout.exercises, sessionOverrides })
    return () => clearTimeout(saveDebounce.current)
  }, [profileId, workoutId, currentBlockIdx, setsData, sessionStart, workout, finished, scheduleSave])

  // ── Chrono repos ──
  useEffect(() => {
    if (!showRest) { document.title = 'GymTracker'; return }
    const tick = () => {
      if (!restEndRef.current) return
      const remaining = Math.max(0, Math.round((restEndRef.current - Date.now()) / 1000))
      setRestTime(remaining)
      document.title = remaining > 0 ? `⏱ ${formatTime(remaining)} — GymTracker` : '✅ Repos terminé !'
      if (remaining === 15) { playWarningBeep(); if (navigator.vibrate) navigator.vibrate(100) }
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
    return () => { clearInterval(restInterval.current); document.title = 'GymTracker' }
  }, [showRest])

  // ── Recalcul au retour en premier plan ──
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && restEndRef.current) {
        acquireWakeLock(wakeLockRef)
        const remaining = Math.max(0, Math.round((restEndRef.current - Date.now()) / 1000))
        setRestTime(remaining)
        if (remaining <= 0) {
          setShowRest(false); restEndRef.current = null
          localStorage.removeItem(REST_END_KEY)
          playBeep()
          if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300])
        }
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // ── Callbacks ──
  const updateSet = useCallback((exIdx, setIdx, field, value) => {
    setSetsData(prev => prev.map((arr, i) =>
      i === exIdx ? arr.map((s, j) => j === setIdx ? { ...s, [field]: value } : s) : arr
    ))
  }, [])

  const validateSet = useCallback((exIdx, setIdx) => {
    setSetsData(prev => prev.map((arr, i) => {
      if (i !== exIdx) return arr
      const weight = arr[setIdx].weight
      return arr.map((s, j) => {
        if (j === setIdx) return { ...s, done: true }
        if (j > setIdx && !s.done) return { ...s, weight }
        return s
      })
    }))
    // Repos seulement après le DERNIER exercice du bloc
    const block = blocksRef.current.find(b => b.includes(exIdx))
    const isLastInBlock = block && exIdx === block[block.length - 1]
    if (isLastInBlock) {
      const w = workoutRef.current
      const ex = w?.exercises?.[exIdx]
      if (ex?.type !== 'cardio' && ex?.rest) {
        // Trouve le prochain bloc
        const blockIdx = blocksRef.current.indexOf(block)
        const nextBlock = blocksRef.current[blockIdx + 1]
        const nextExIdx = nextBlock?.[0]
        const nextExName = sessionOverrides[nextExIdx]?.name || w?.exercises?.[nextExIdx]?.name
        startRest(ex.rest, nextExName)
      }
    }
  }, [startRest, sessionOverrides])

  const addSet = useCallback((exIdx) => {
    const ex = workoutRef.current?.exercises?.[exIdx]
    setSetsData(prev => prev.map((arr, i) => {
      if (i !== exIdx) return arr
      const last = arr[arr.length - 1]
      return [...arr, { weight: last?.weight || '', reps: ex?.timeMode ? 0 : (ex?.reps || 10), duration: ex?.timeMode ? (ex?.duration || 30) : 0, done: false }]
    }))
  }, [])

  const removeSet = useCallback((exIdx, setIdx) => {
    setSetsData(prev => prev.map((arr, i) => {
      if (i !== exIdx || arr.length <= 1) return arr
      return arr.filter((_, j) => j !== setIdx)
    }))
  }, [])

  const stopRest = useCallback(() => {
    setShowRest(false)
    clearInterval(restInterval.current)
    cancelSwNotification()
    releaseWakeLock(wakeLockRef)
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
      if (!ok) { finishing.current = false; didFinish.current = false; return }
    }
    const w = workoutRef.current
    const durationSec = Math.floor((Date.now() - sessionStart) / 1000)
    addSessionToHistory(profileId, {
      workoutId, workoutTitle: w.title,
      exercises: w.exercises.map((ex, i) => ({ ...ex, ...sessionOverrides[i], setsCompleted: currentSets[i] })),
      duration: formatDuration(durationSec), durationSeconds: durationSec,
    })
    if (scheduleId) completeScheduledWorkout(profileId, scheduleId)
    clearSession(); cancelSwNotification(); releaseWakeLock(wakeLockRef)
    refresh(); setFinished(true)
  }, [profileId, workoutId, sessionStart, refresh, sessionOverrides, scheduleId])

  const abandonSession = useCallback(() => {
    if (confirm('Abandonner la séance ? Ta progression sera perdue.')) {
      didFinish.current = true
      clearTimeout(saveDebounce.current)
      clearSession(); cancelSwNotification(); releaseWakeLock(wakeLockRef)
      navigate('/')
    }
  }, [navigate])

  // ── Déplacer un bloc (superset ou exercice seul) vers le haut/bas ──
  const moveBlock = useCallback((blockIdx, direction) => {
    const targetIdx = blockIdx + direction
    if (targetIdx < 0 || targetIdx >= blocksRef.current.length) return
    const allBlocks = [...blocksRef.current]
    const tmp = allBlocks[blockIdx]
    allBlocks[blockIdx] = allBlocks[targetIdx]
    allBlocks[targetIdx] = tmp
    const newOrder = allBlocks.flat()
    setWorkout(prev => ({
      ...prev,
      exercises: newOrder.map(i => prev.exercises[i]),
    }))
    setSetsData(prev => newOrder.map(i => prev[i]))
    setSessionOverrides(prev => {
      const remapped = {}
      newOrder.forEach((oldIdx, newIdx) => {
        if (prev[oldIdx]) remapped[newIdx] = prev[oldIdx]
      })
      return remapped
    })
    setCurrentBlockIdx(targetIdx)
  }, [])

  // ── Supprimer le bloc courant (avec confirmation) ──
  const deleteBlock = useCallback(() => {
    const block = blocksRef.current[currentBlockIdx]
    if (!block || blocksRef.current.length <= 1) return
    if (!confirm('Supprimer ce bloc de la séance ?')) return
    const toRemove = new Set(block)
    setWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => !toRemove.has(i)),
    }))
    setSetsData(prev => prev.filter((_, i) => !toRemove.has(i)))
    setSessionOverrides(prev => {
      const remapped = {}
      let shift = 0
      for (let i = 0; i < (workoutRef.current?.exercises?.length || 0); i++) {
        if (toRemove.has(i)) { shift++; continue }
        if (prev[i]) remapped[i - shift] = prev[i]
      }
      return remapped
    })
    setCurrentBlockIdx(idx => Math.min(idx, blocksRef.current.length - 2))
  }, [currentBlockIdx])

  // ── Ajouter un exercice pendant la séance (nouveau bloc) ──
  const addNewExercise = useCallback((newEx) => {
    const isCardio = newEx.type === 'cardio'
    setWorkout(prev => {
      const updated = {
        ...prev,
        exercises: [...prev.exercises, {
          exerciseId: newEx.id, name: newEx.name, muscle: newEx.muscle,
          type: newEx.type, sets: 3, reps: 10, rest: 90, superset: false,
          timeMode: false,
        }],
      }
      // Navigate to the new block after state updates
      const newBlocks = computeBlocks(updated.exercises)
      setTimeout(() => setCurrentBlockIdx(newBlocks.length - 1), 0)
      return updated
    })
    setSetsData(prev => [
      ...prev,
      isCardio
        ? [{ duration: 0, distance: 0, calories: 0, done: false }]
        : Array.from({ length: 3 }, () => ({ weight: '', reps: 10, duration: 0, done: false })),
    ])
    setShowAddPicker(false)
  }, [])

  // ── Clamp currentBlockIdx si des blocs ont été supprimés ──
  useEffect(() => {
    if (blocks.length > 0 && currentBlockIdx >= blocks.length) {
      setCurrentBlockIdx(blocks.length - 1)
    }
  }, [blocks, currentBlockIdx])

  const changeExercise = useCallback((newEx) => {
    const idx = changePickerForIdx
    if (idx === null) return
    setSessionOverrides(prev => ({ ...prev, [idx]: { exerciseId: newEx.id, name: newEx.name, muscle: newEx.muscle, type: newEx.type } }))
    setSetsData(prev => prev.map((arr, i) =>
      i === idx ? Array.from({ length: arr.length }, () => ({ weight: '', reps: arr[0]?.reps || 10, duration: arr[0]?.duration || 30, done: false })) : arr
    ))
    setChangePickerForIdx(null)
  }, [changePickerForIdx])

  if (!workout || blocks.length === 0) return null

  const currentBlock = blocks[currentBlockIdx] || [0]
  const isLastBlock = currentBlockIdx === blocks.length - 1
  const allBlockDone = currentBlock.every(exIdx => setsData[exIdx]?.every(s => s.done))
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
          <div className="text-center"><div style={{ fontSize: 24, fontWeight: 700 }}>{formatDuration(durationSec)}</div><div className="text-xs text-muted">Durée</div></div>
          <div className="text-center"><div style={{ fontSize: 24, fontWeight: 700 }}>{workout.exercises.length}</div><div className="text-xs text-muted">Exercices</div></div>
          <div className="text-center"><div style={{ fontSize: 24, fontWeight: 700 }}>{setsData.reduce((sum, sets) => sum + sets.filter(s => s.done).length, 0)}</div><div className="text-xs text-muted">Séries</div></div>
        </div>
        <button className="btn btn-primary mt-16" onClick={() => navigate('/', { replace: true })}>Retour à l'accueil</button>
      </div>
    )
  }

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div className="flex items-center gap-12 mb-8">
        <button onClick={abandonSession} style={{ background: 'none', color: 'var(--text)' }}><ArrowLeft size={24} /></button>
        <div style={{ flex: 1 }}>
          <div className="font-bold" style={{ fontSize: 16 }}>{workout.title}</div>
          <ElapsedTimer sessionStart={sessionStart} />
        </div>
        <button className="btn btn-success btn-small" onClick={finishSession}>Fin de séance</button>
      </div>

      {/* Barre de progression */}
      <div style={{ background: 'var(--bg-input)', borderRadius: 4, height: 4, marginBottom: 16 }}>
        <div style={{ background: 'var(--accent)', borderRadius: 4, height: '100%',
          width: `${totalSets > 0 ? (totalSetsCompleted / totalSets) * 100 : 0}%`, transition: 'width 0.3s' }} />
      </div>

      {/* Navigation entre blocs */}
      <div className="flex items-center justify-between mb-12">
        <button onClick={() => setCurrentBlockIdx(i => Math.max(0, i - 1))} disabled={currentBlockIdx === 0}
          style={{ background: 'none', color: currentBlockIdx === 0 ? 'var(--text-muted)' : 'var(--text)', padding: 8, fontSize: 20 }}>◀</button>
        <div className="flex items-center gap-8">
          <button onClick={() => moveBlock(currentBlockIdx, -1)} disabled={currentBlockIdx === 0}
            style={{ background: 'none', padding: 4, color: currentBlockIdx === 0 ? 'var(--text-muted)' : 'var(--accent)', opacity: currentBlockIdx === 0 ? 0.3 : 1 }}>
            <ChevronUp size={18} />
          </button>
          <div className="text-center text-xs text-muted">
            Bloc {currentBlockIdx + 1} / {blocks.length}
            {currentBlock.length > 1 && <span style={{ color: 'var(--accent)', fontWeight: 700, marginLeft: 6 }}>🔗 SUPERSET</span>}
          </div>
          <button onClick={() => moveBlock(currentBlockIdx, 1)} disabled={isLastBlock}
            style={{ background: 'none', padding: 4, color: isLastBlock ? 'var(--text-muted)' : 'var(--accent)', opacity: isLastBlock ? 0.3 : 1 }}>
            <ChevronDown size={18} />
          </button>
          {blocks.length > 1 && (
            <button onClick={deleteBlock}
              style={{ background: 'none', padding: 4, color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <button onClick={() => setCurrentBlockIdx(i => Math.min(blocks.length - 1, i + 1))} disabled={isLastBlock}
          style={{ background: 'none', color: isLastBlock ? 'var(--text-muted)' : 'var(--text)', padding: 8, fontSize: 20 }}>▶</button>
      </div>

      {/* Exercices du bloc courant */}
      {currentBlock.map((exIdx, blockPos) => {
        const rawEx = workout.exercises[exIdx]
        const ex = sessionOverrides[exIdx] ? { ...rawEx, ...sessionOverrides[exIdx] } : rawEx
        const sets = setsData[exIdx] || []
        const isSuperset = blockPos < currentBlock.length - 1

        return (
          <div key={exIdx}>
            {/* Carte exercice */}
            <div className="card" style={{ marginBottom: 4, borderLeft: isSuperset ? '3px solid var(--accent)' : undefined }}>
              {/* Nom + boutons changer / supprimer */}
              <div className="flex items-center justify-between mb-10">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-bold" style={{ fontSize: 17 }}>{ex.name}</div>
                  <div className="text-xs text-muted">{ex.muscle}</div>
                </div>
                <button onClick={() => setChangePickerForIdx(exIdx)}
                  style={{ background: 'none', color: 'var(--text-muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RefreshCw size={11} /> Changer
                </button>
              </div>

              {ex.type === 'cardio' ? (
                <div>
                  <div className="form-row mb-8">
                    <div className="form-group"><label className="form-label">Durée (min)</label>
                      <input type="number" value={sets[0]?.duration || 0} onChange={e => updateSet(exIdx, 0, 'duration', Number(e.target.value))} /></div>
                    <div className="form-group"><label className="form-label">Distance</label>
                      <input type="number" step="0.1" value={sets[0]?.distance || 0} onChange={e => updateSet(exIdx, 0, 'distance', Number(e.target.value))} /></div>
                  </div>
                  <button className={`btn ${sets[0]?.done ? 'btn-secondary' : 'btn-success'}`}
                    onClick={() => updateSet(exIdx, 0, 'done', !sets[0]?.done)}>
                    <Check size={18} /> {sets[0]?.done ? 'Fait ✓' : 'Valider'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center text-xs text-muted" style={{ padding: '0 2px', marginBottom: 6 }}>
                    <div style={{ width: 32, textAlign: 'center' }}>S.</div>
                    <div style={{ flex: 1, textAlign: 'center' }}>Poids (kg)</div>
                    <div style={{ flex: 1, textAlign: 'center' }}>{ex.timeMode ? 'Durée (s)' : 'Reps'}</div>
                    <div style={{ width: 44 }} /><div style={{ width: 28 }} />
                  </div>
                  {sets.map((set, setIdx) => (
                    <SetRow key={setIdx} exIdx={exIdx} set={set} setIdx={setIdx}
                      timeMode={ex.timeMode} canRemove={sets.length > 1}
                      onUpdate={updateSet} onValidate={validateSet} onRemove={removeSet} />
                  ))}
                  <button className="btn btn-secondary mt-4" style={{ fontSize: 13 }} onClick={() => addSet(exIdx)}>
                    <Plus size={14} /> Ajouter une série
                  </button>
                </>
              )}
            </div>

            {/* Séparateur superset entre les exercices */}
            {isSuperset && (
              <div style={{ textAlign: 'center', padding: '6px 0', color: 'var(--accent)', fontWeight: 700, fontSize: 12, letterSpacing: 1 }}>
                ↕ SUPERSET ↕
              </div>
            )}
          </div>
        )
      })}

      {/* Ajouter un exercice */}
      <button className="btn btn-secondary mt-8" style={{ fontSize: 13 }} onClick={() => setShowAddPicker(true)}>
        <Plus size={14} /> Ajouter un exercice
      </button>

      {/* Bouton suivant */}
      {allBlockDone && !isLastBlock && (
        <button className="btn btn-primary mt-16" onClick={() => setCurrentBlockIdx(i => i + 1)}>
          Bloc suivant ▶
        </button>
      )}
      {allBlockDone && isLastBlock && (
        <button className="btn btn-success mt-16" onClick={finishSession}>
          <Check size={18} /> Fin de séance
        </button>
      )}

      {/* Overlay repos */}
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
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - (restTotal > 0 ? restTime / restTotal : 0))}`} />
            </svg>
          </div>
          <div className="flex gap-12">
            <button className="btn btn-secondary btn-small" onClick={() => {
              const t = Math.max(0, restTime - 15), endTime = Date.now() + t * 1000
              restEndRef.current = endTime; localStorage.setItem(REST_END_KEY, endTime.toString())
              cancelSwNotification(); if (t > 0) scheduleSwNotification(t, restNextExRef.current); setRestTime(t)
            }}>-15s</button>
            <button className="btn btn-primary btn-small" onClick={stopRest}>{restTime === 0 ? 'OK' : 'Passer'}</button>
            <button className="btn btn-secondary btn-small" onClick={() => {
              const t = restTime + 15, endTime = Date.now() + t * 1000
              restEndRef.current = endTime; localStorage.setItem(REST_END_KEY, endTime.toString())
              cancelSwNotification(); scheduleSwNotification(t, restNextExRef.current); setRestTime(t)
            }}>+15s</button>
          </div>
        </div>
      )}

      {changePickerForIdx !== null && (
        <ExercisePicker onSelect={changeExercise} onClose={() => setChangePickerForIdx(null)} selectedIds={[]} />
      )}

      {showAddPicker && (
        <ExercisePicker onSelect={addNewExercise} onClose={() => setShowAddPicker(false)} selectedIds={[]} />
      )}
    </div>
  )
}
