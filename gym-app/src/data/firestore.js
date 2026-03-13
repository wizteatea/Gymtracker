import {
  collection, doc, getDocs, setDoc, deleteDoc,
  writeBatch, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase'

// ── Helpers ──
const profileRef = (profileId) => doc(db, 'profiles', profileId)
const subCol = (profileId, name) => collection(db, 'profiles', profileId, name)

// ── Push entire profile data to Firestore ──
export async function pushProfileToFirestore(profileId, data) {
  try {
    await setDoc(profileRef(profileId), {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  } catch (e) {
    console.warn('Firestore push profile error:', e)
  }
}

// ── Push a collection (workouts, schedule, history, customExercises) ──
async function pushCollection(profileId, name, items) {
  try {
    const batch = writeBatch(db)
    const col = subCol(profileId, name)

    // Delete all existing docs then re-write
    // For simplicity we use set with merge on each item
    items.forEach(item => {
      const ref = doc(col, item.id)
      batch.set(ref, { ...item, updatedAt: serverTimestamp() })
    })
    await batch.commit()
  } catch (e) {
    console.warn(`Firestore push ${name} error:`, e)
  }
}

async function deleteDoc_(profileId, name, id) {
  try {
    await deleteDoc(doc(subCol(profileId, name), id))
  } catch (e) {
    console.warn(`Firestore delete ${name}/${id} error:`, e)
  }
}

async function upsertDoc(profileId, name, item) {
  try {
    await setDoc(doc(subCol(profileId, name), item.id), {
      ...item,
      updatedAt: serverTimestamp(),
    }, { merge: true })
  } catch (e) {
    console.warn(`Firestore upsert ${name} error:`, e)
  }
}

// ── Pull all data from Firestore for a profile ──
export async function pullProfileFromFirestore(profileId) {
  try {
    const [workoutsSnap, scheduleSnap, historySnap, customExSnap] = await Promise.all([
      getDocs(subCol(profileId, 'workouts')),
      getDocs(subCol(profileId, 'schedule')),
      getDocs(subCol(profileId, 'history')),
      getDocs(subCol(profileId, 'customExercises')),
    ])

    const clean = (snap) => snap.docs.map(d => {
      const data = { ...d.data() }
      delete data.updatedAt
      return data
    })

    return {
      workouts: clean(workoutsSnap),
      schedule: clean(scheduleSnap),
      history: clean(historySnap),
      customExercises: clean(customExSnap),
    }
  } catch (e) {
    console.warn('Firestore pull error:', e)
    return null
  }
}

// ── Sync helpers used by store.js ──
export const fsUpsertWorkout = (pid, item) => upsertDoc(pid, 'workouts', item)
export const fsDeleteWorkout = (pid, id) => deleteDoc_(pid, 'workouts', id)

export const fsUpsertSchedule = (pid, item) => upsertDoc(pid, 'schedule', item)
export const fsDeleteSchedule = (pid, id) => deleteDoc_(pid, 'schedule', id)

export const fsAddHistory = (pid, item) => upsertDoc(pid, 'history', item)
export const fsDeleteHistory = (pid, id) => deleteDoc_(pid, 'history', id)

export const fsUpsertCustomExercise = (pid, item) => upsertDoc(pid, 'customExercises', item)

export const fsPushWorkouts = (pid, items) => pushCollection(pid, 'workouts', items)
export const fsPushHistory = (pid, items) => pushCollection(pid, 'history', items)
