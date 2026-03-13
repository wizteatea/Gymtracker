import {
  fsUpsertWorkout, fsDeleteWorkout,
  fsUpsertSchedule, fsDeleteSchedule,
  fsAddHistory, fsDeleteHistory,
  fsUpsertCustomExercise,
  pullProfileFromFirestore,
  pushProfileToFirestore,
} from './firestore'

// ── localStorage wrapper ──
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

// ── Profiles (local only — lightweight) ──
export function getProfiles() { return ls.get('gym_profiles', []) }
export function saveProfiles(profiles) { ls.set('gym_profiles', profiles) }
export function getActiveProfileId() { return ls.get('gym_active_profile', null) }
export function setActiveProfileId(id) { ls.set('gym_active_profile', id) }

export function createProfile(data) {
  const profiles = getProfiles()
  const profile = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() }
  profiles.push(profile)
  saveProfiles(profiles)
  pushProfileToFirestore(profile.id, profile)
  return profile
}

export function updateProfile(id, data) {
  const profiles = getProfiles()
  const idx = profiles.findIndex(p => p.id === id)
  if (idx !== -1) {
    profiles[idx] = { ...profiles[idx], ...data }
    saveProfiles(profiles)
    pushProfileToFirestore(id, profiles[idx])
  }
  return profiles[idx]
}

export function deleteProfile(id) {
  saveProfiles(getProfiles().filter(p => p.id !== id))
  if (getActiveProfileId() === id) ls.remove('gym_active_profile')
}

// ── Sync: pull from Firestore and write to localStorage ──
export async function syncFromFirestore(profileId) {
  const remote = await pullProfileFromFirestore(profileId)
  if (!remote) return false

  ls.set(`gym_workouts_${profileId}`, remote.workouts)
  ls.set(`gym_schedule_${profileId}`, remote.schedule)
  ls.set(`gym_history_${profileId}`, remote.history)
  ls.set(`gym_custom_exercises_${profileId}`, remote.customExercises)
  return true
}

// ── Workouts ──
export function getWorkouts(profileId) { return ls.get(`gym_workouts_${profileId}`, []) }

export function createWorkout(profileId, data) {
  const workouts = getWorkouts(profileId)
  const workout = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() }
  workouts.push(workout)
  ls.set(`gym_workouts_${profileId}`, workouts)
  fsUpsertWorkout(profileId, workout)
  return workout
}

export function updateWorkout(profileId, workoutId, data) {
  const workouts = getWorkouts(profileId)
  const idx = workouts.findIndex(w => w.id === workoutId)
  if (idx !== -1) {
    workouts[idx] = { ...workouts[idx], ...data }
    ls.set(`gym_workouts_${profileId}`, workouts)
    fsUpsertWorkout(profileId, workouts[idx])
  }
}

export function deleteWorkout(profileId, workoutId) {
  ls.set(`gym_workouts_${profileId}`, getWorkouts(profileId).filter(w => w.id !== workoutId))
  fsDeleteWorkout(profileId, workoutId)
}

export function duplicateWorkout(profileId, workoutId) {
  const workouts = getWorkouts(profileId)
  const original = workouts.find(w => w.id === workoutId)
  if (!original) return null
  const copy = {
    ...JSON.parse(JSON.stringify(original)),
    id: crypto.randomUUID(),
    title: original.title + ' (copie)',
    createdAt: new Date().toISOString(),
  }
  workouts.push(copy)
  ls.set(`gym_workouts_${profileId}`, workouts)
  fsUpsertWorkout(profileId, copy)
  return copy
}

// ── Schedule ──
export function getSchedule(profileId) { return ls.get(`gym_schedule_${profileId}`, []) }

export function scheduleWorkout(profileId, workoutId, date) {
  const schedule = getSchedule(profileId)
  const entry = { id: crypto.randomUUID(), workoutId, date, completed: false }
  schedule.push(entry)
  ls.set(`gym_schedule_${profileId}`, schedule)
  fsUpsertSchedule(profileId, entry)
}

export function removeScheduledWorkout(profileId, scheduleId) {
  ls.set(`gym_schedule_${profileId}`, getSchedule(profileId).filter(s => s.id !== scheduleId))
  fsDeleteSchedule(profileId, scheduleId)
}

// ── History ──
export function getHistory(profileId) { return ls.get(`gym_history_${profileId}`, []) }

export function saveHistory(profileId, history) {
  ls.set(`gym_history_${profileId}`, history)
}

export function addSessionToHistory(profileId, session) {
  const history = getHistory(profileId)
  const entry = { id: crypto.randomUUID(), ...session, completedAt: new Date().toISOString() }
  history.unshift(entry)
  ls.set(`gym_history_${profileId}`, history)
  fsAddHistory(profileId, entry)
}

export function deleteHistoryEntry(profileId, id) {
  saveHistory(profileId, getHistory(profileId).filter(h => h.id !== id))
  fsDeleteHistory(profileId, id)
}

// ── Custom exercises ──
export function getCustomExercises(profileId) { return ls.get(`gym_custom_exercises_${profileId}`, []) }

export function addCustomExercise(profileId, exercise) {
  const exercises = getCustomExercises(profileId)
  const newEx = { id: crypto.randomUUID(), custom: true, ...exercise }
  exercises.push(newEx)
  ls.set(`gym_custom_exercises_${profileId}`, exercises)
  fsUpsertCustomExercise(profileId, newEx)
  return newEx
}
