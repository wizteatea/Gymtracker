import {
  doc, getDoc, setDoc, collection, getDocs,
  deleteDoc, writeBatch, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'

// ── localStorage cache helpers ──
const ls = {
  get: (key, fallback = null) => {
    try {
      const val = localStorage.getItem(key)
      return val ? JSON.parse(val) : fallback
    } catch { return fallback }
  },
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  remove: (key) => localStorage.removeItem(key),
}

const subCol = (uid, name) => collection(db, 'profiles', uid, name)
const subDoc = (uid, name, id) => doc(db, 'profiles', uid, name, id)
const profileDoc = (uid) => doc(db, 'profiles', uid)

// ── Profile ──
export async function getProfileFromFirestore(uid) {
  try {
    const snap = await getDoc(profileDoc(uid))
    if (!snap.exists()) return null
    const data = { ...snap.data() }
    delete data.updatedAt
    return data
  } catch { return null }
}

export async function createProfile(uid, googleUser, extraData) {
  const profile = {
    id: uid,
    nom: extraData.nom || '',
    prenom: extraData.prenom || googleUser.displayName?.split(' ')[0] || '',
    age: Number(extraData.age) || 0,
    taille: Number(extraData.taille) || 0,
    poids: Number(extraData.poids) || 0,
    email: googleUser.email,
    photoURL: googleUser.photoURL || null,
    createdAt: new Date().toISOString(),
  }
  await setDoc(profileDoc(uid), { ...profile, updatedAt: serverTimestamp() })
  return profile
}

export async function updateProfile(uid, data) {
  await setDoc(profileDoc(uid), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

// ── Sync: pull everything from Firestore into localStorage ──
export async function syncFromFirestore(uid) {
  try {
    const [workoutsSnap, scheduleSnap, historySnap, customExSnap] = await Promise.all([
      getDocs(subCol(uid, 'workouts')),
      getDocs(subCol(uid, 'schedule')),
      getDocs(subCol(uid, 'history')),
      getDocs(subCol(uid, 'customExercises')),
    ])

    const clean = (snap) => snap.docs.map(d => {
      const data = { ...d.data() }
      delete data.updatedAt
      return data
    })

    ls.set(`gym_workouts_${uid}`, clean(workoutsSnap))
    ls.set(`gym_schedule_${uid}`, clean(scheduleSnap))
    ls.set(`gym_history_${uid}`, clean(historySnap))
    ls.set(`gym_custom_exercises_${uid}`, clean(customExSnap))
    return true
  } catch (e) {
    console.warn('syncFromFirestore error:', e)
    return false
  }
}

// ── Upsert / Delete helpers ──
async function upsert(uid, name, item) {
  try {
    await setDoc(subDoc(uid, name, item.id), { ...item, updatedAt: serverTimestamp() }, { merge: true })
  } catch (e) { console.warn(`upsert ${name} error:`, e) }
}

async function remove(uid, name, id) {
  try {
    await deleteDoc(subDoc(uid, name, id))
  } catch (e) { console.warn(`delete ${name} error:`, e) }
}

// ── Workouts ──
export function getWorkouts(uid) { return ls.get(`gym_workouts_${uid}`, []) }

export function createWorkout(uid, data) {
  const workouts = getWorkouts(uid)
  const workout = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() }
  workouts.push(workout)
  ls.set(`gym_workouts_${uid}`, workouts)
  upsert(uid, 'workouts', workout)
  return workout
}

export function updateWorkout(uid, workoutId, data) {
  const workouts = getWorkouts(uid)
  const idx = workouts.findIndex(w => w.id === workoutId)
  if (idx !== -1) {
    workouts[idx] = { ...workouts[idx], ...data }
    ls.set(`gym_workouts_${uid}`, workouts)
    upsert(uid, 'workouts', workouts[idx])
  }
}

export function deleteWorkout(uid, workoutId) {
  ls.set(`gym_workouts_${uid}`, getWorkouts(uid).filter(w => w.id !== workoutId))
  remove(uid, 'workouts', workoutId)
}

export function duplicateWorkout(uid, workoutId) {
  const workouts = getWorkouts(uid)
  const original = workouts.find(w => w.id === workoutId)
  if (!original) return null
  const copy = {
    ...JSON.parse(JSON.stringify(original)),
    id: crypto.randomUUID(),
    title: original.title + ' (copie)',
    createdAt: new Date().toISOString(),
  }
  workouts.push(copy)
  ls.set(`gym_workouts_${uid}`, workouts)
  upsert(uid, 'workouts', copy)
  return copy
}

// ── Schedule ──
export function getSchedule(uid) { return ls.get(`gym_schedule_${uid}`, []) }

export function scheduleWorkout(uid, workoutId, date) {
  const schedule = getSchedule(uid)
  const entry = { id: crypto.randomUUID(), workoutId, date, completed: false }
  schedule.push(entry)
  ls.set(`gym_schedule_${uid}`, schedule)
  upsert(uid, 'schedule', entry)
}

export function removeScheduledWorkout(uid, scheduleId) {
  ls.set(`gym_schedule_${uid}`, getSchedule(uid).filter(s => s.id !== scheduleId))
  remove(uid, 'schedule', scheduleId)
}

// ── History ──
export function getHistory(uid) { return ls.get(`gym_history_${uid}`, []) }

export function saveHistory(uid, history) {
  ls.set(`gym_history_${uid}`, history)
}

export function addSessionToHistory(uid, session) {
  const history = getHistory(uid)
  const entry = { id: crypto.randomUUID(), ...session, completedAt: new Date().toISOString() }
  history.unshift(entry)
  ls.set(`gym_history_${uid}`, history)
  upsert(uid, 'history', entry)
}

export function deleteHistoryEntry(uid, id) {
  saveHistory(uid, getHistory(uid).filter(h => h.id !== id))
  remove(uid, 'history', id)
}

// ── Custom exercises ──
export function getCustomExercises(uid) { return ls.get(`gym_custom_exercises_${uid}`, []) }

export function addCustomExercise(uid, exercise) {
  const exercises = getCustomExercises(uid)
  const newEx = { id: crypto.randomUUID(), custom: true, ...exercise }
  exercises.push(newEx)
  ls.set(`gym_custom_exercises_${uid}`, exercises)
  upsert(uid, 'customExercises', newEx)
  return newEx
}
