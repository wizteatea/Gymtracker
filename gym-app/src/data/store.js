// Simple localStorage wrapper with JSON support
const store = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key)
      return val ? JSON.parse(val) : fallback
    } catch {
      return fallback
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value))
  },
  remove(key) {
    localStorage.removeItem(key)
  }
}

// ── Profiles ──
export function getProfiles() {
  return store.get('gym_profiles', [])
}

export function saveProfiles(profiles) {
  store.set('gym_profiles', profiles)
}

export function getActiveProfileId() {
  return store.get('gym_active_profile', null)
}

export function setActiveProfileId(id) {
  store.set('gym_active_profile', id)
}

export function createProfile(data) {
  const profiles = getProfiles()
  const profile = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: new Date().toISOString()
  }
  profiles.push(profile)
  saveProfiles(profiles)
  return profile
}

export function updateProfile(id, data) {
  const profiles = getProfiles()
  const idx = profiles.findIndex(p => p.id === id)
  if (idx !== -1) {
    profiles[idx] = { ...profiles[idx], ...data }
    saveProfiles(profiles)
  }
  return profiles[idx]
}

export function deleteProfile(id) {
  saveProfiles(getProfiles().filter(p => p.id !== id))
  if (getActiveProfileId() === id) {
    store.remove('gym_active_profile')
  }
}

// ── Workouts (templates) ──
export function getWorkouts(profileId) {
  return store.get(`gym_workouts_${profileId}`, [])
}

export function saveWorkouts(profileId, workouts) {
  store.set(`gym_workouts_${profileId}`, workouts)
}

export function createWorkout(profileId, data) {
  const workouts = getWorkouts(profileId)
  const workout = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: new Date().toISOString()
  }
  workouts.push(workout)
  saveWorkouts(profileId, workouts)
  return workout
}

export function updateWorkout(profileId, workoutId, data) {
  const workouts = getWorkouts(profileId)
  const idx = workouts.findIndex(w => w.id === workoutId)
  if (idx !== -1) {
    workouts[idx] = { ...workouts[idx], ...data }
    saveWorkouts(profileId, workouts)
  }
}

export function deleteWorkout(profileId, workoutId) {
  saveWorkouts(profileId, getWorkouts(profileId).filter(w => w.id !== workoutId))
}

export function duplicateWorkout(profileId, workoutId) {
  const workouts = getWorkouts(profileId)
  const original = workouts.find(w => w.id === workoutId)
  if (!original) return null
  const copy = {
    ...JSON.parse(JSON.stringify(original)),
    id: crypto.randomUUID(),
    title: original.title + ' (copie)',
    createdAt: new Date().toISOString()
  }
  workouts.push(copy)
  saveWorkouts(profileId, workouts)
  return copy
}

// ── Scheduled sessions (calendar) ──
export function getSchedule(profileId) {
  return store.get(`gym_schedule_${profileId}`, [])
}

export function saveSchedule(profileId, schedule) {
  store.set(`gym_schedule_${profileId}`, schedule)
}

export function scheduleWorkout(profileId, workoutId, date) {
  const schedule = getSchedule(profileId)
  schedule.push({
    id: crypto.randomUUID(),
    workoutId,
    date, // YYYY-MM-DD
    completed: false
  })
  saveSchedule(profileId, schedule)
}

export function removeScheduledWorkout(profileId, scheduleId) {
  saveSchedule(profileId, getSchedule(profileId).filter(s => s.id !== scheduleId))
}

// ── Session history (completed workouts) ──
export function getHistory(profileId) {
  return store.get(`gym_history_${profileId}`, [])
}

export function saveHistory(profileId, history) {
  store.set(`gym_history_${profileId}`, history)
}

export function addSessionToHistory(profileId, session) {
  const history = getHistory(profileId)
  history.unshift({
    id: crypto.randomUUID(),
    ...session,
    completedAt: new Date().toISOString()
  })
  saveHistory(profileId, history)
}

// ── Custom exercises ──
export function getCustomExercises(profileId) {
  return store.get(`gym_custom_exercises_${profileId}`, [])
}

export function saveCustomExercises(profileId, exercises) {
  store.set(`gym_custom_exercises_${profileId}`, exercises)
}

export function addCustomExercise(profileId, exercise) {
  const exercises = getCustomExercises(profileId)
  const newEx = { id: crypto.randomUUID(), custom: true, ...exercise }
  exercises.push(newEx)
  saveCustomExercises(profileId, exercises)
  return newEx
}
