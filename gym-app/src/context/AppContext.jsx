import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getActiveProfileId, setActiveProfileId, getProfiles, syncFromFirestore } from '../data/store'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [profileId, setProfileId] = useState(() => getActiveProfileId())
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)

  const profiles = getProfiles()
  const profile = profiles.find(p => p.id === profileId) || null

  // Sync from Firestore when profile is selected
  useEffect(() => {
    if (!profileId) { setSyncDone(true); return }
    setSyncing(true)
    setSyncDone(false)
    syncFromFirestore(profileId)
      .then(() => {
        setRefreshKey(k => k + 1)
      })
      .catch(() => {})
      .finally(() => {
        setSyncing(false)
        setSyncDone(true)
      })
  }, [profileId])

  const selectProfile = useCallback((id) => {
    setActiveProfileId(id)
    setProfileId(id)
    setSyncDone(false)
  }, [])

  const logout = useCallback(() => {
    setActiveProfileId(null)
    setProfileId(null)
    setSyncDone(false)
  }, [])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <AppContext.Provider value={{
      profileId, profile, profiles,
      selectProfile, logout, refresh, refreshKey,
      syncing, syncDone,
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
