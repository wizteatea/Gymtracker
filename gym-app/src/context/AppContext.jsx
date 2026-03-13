import { createContext, useContext, useState, useCallback } from 'react'
import { getActiveProfileId, setActiveProfileId, getProfiles } from '../data/store'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [profileId, setProfileId] = useState(() => getActiveProfileId())
  const [refreshKey, setRefreshKey] = useState(0)

  const profiles = getProfiles()
  const profile = profiles.find(p => p.id === profileId) || null

  const selectProfile = useCallback((id) => {
    setActiveProfileId(id)
    setProfileId(id)
  }, [])

  const logout = useCallback(() => {
    setActiveProfileId(null)
    setProfileId(null)
  }, [])

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <AppContext.Provider value={{ profileId, profile, profiles, selectProfile, logout, refresh, refreshKey }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
