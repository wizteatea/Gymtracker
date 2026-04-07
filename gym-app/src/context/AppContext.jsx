import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth'
import { auth } from '../firebase'
import { syncFromFirestore, getProfileFromFirestore, createProfile } from '../data/store'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = not logged in
  const [profile, setProfile] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [needsProfile, setNeedsProfile] = useState(false)

  // Handle redirect result on page load (fallback for popup-blocked)
  useEffect(() => {
    getRedirectResult(auth).catch(() => {})
  }, [])

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setProfile(null)
        setNeedsProfile(false)
        return
      }

      setUser(firebaseUser)
      setSyncing(true)

      const uid = firebaseUser.uid

      // Check localStorage first (works offline or if Firestore rules block)
      const localProfile = (() => {
        try { return JSON.parse(localStorage.getItem(`gym_profile_${uid}`) || 'null') } catch { return null }
      })()

      // Try to load profile from Firestore
      const firestoreProfile = await getProfileFromFirestore(uid)
      const existingProfile = firestoreProfile || localProfile

      if (existingProfile) {
        // Cache profile in localStorage for resilience
        if (firestoreProfile) localStorage.setItem(`gym_profile_${uid}`, JSON.stringify(firestoreProfile))
        setProfile(existingProfile)
        setNeedsProfile(false)
        // Sync all data
        await syncFromFirestore(uid).catch(() => {})
        setRefreshKey(k => k + 1)
      } else {
        // First login — need to create profile
        setNeedsProfile(true)
      }

      setSyncing(false)
    })
    return unsub
  }, [])

  const profileId = user?.uid || null

  const logout = useCallback(async () => {
    await signOut(auth)
    setUser(null)
    setProfile(null)
    setNeedsProfile(false)
  }, [])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  const onProfileCreated = useCallback((p) => {
    if (p?.id) localStorage.setItem(`gym_profile_${p.id}`, JSON.stringify(p))
    setProfile(p)
    setNeedsProfile(false)
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <AppContext.Provider value={{
      user,
      profileId,
      profile,
      needsProfile,
      onProfileCreated,
      logout,
      refresh,
      refreshKey,
      syncing,
      authLoading: user === undefined,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
