import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { createProfile } from '../data/store'

export default function ProfileSetup() {
  const { user, onProfileCreated } = useApp()
  const [form, setForm] = useState({
    prenom: user?.displayName?.split(' ')[0] || '',
    nom: user?.displayName?.split(' ').slice(1).join(' ') || '',
    age: '',
    taille: '',
    poids: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!form.prenom.trim()) return
    setLoading(true)
    const profile = await createProfile(user.uid, user, form)
    onProfileCreated(profile)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      padding: '40px 16px 24px'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        {user?.photoURL && (
          <img src={user.photoURL} alt="" style={{
            width: 72, height: 72, borderRadius: '50%', marginBottom: 12
          }} />
        )}
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
          Bienvenue ! 👋
        </h1>
        <p className="text-secondary text-sm">Complète ton profil pour commencer</p>
      </div>

      <div style={{ flex: 1 }}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Prénom</label>
            <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} placeholder="Prénom" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Nom</label>
            <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Nom" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Âge</label>
            <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="25" />
          </div>
          <div className="form-group">
            <label className="form-label">Taille (cm)</label>
            <input type="number" value={form.taille} onChange={e => setForm({ ...form, taille: e.target.value })} placeholder="175" />
          </div>
          <div className="form-group">
            <label className="form-label">Poids (kg)</label>
            <input type="number" value={form.poids} onChange={e => setForm({ ...form, poids: e.target.value })} placeholder="70" />
          </div>
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={loading || !form.prenom.trim()}>
        {loading ? 'Création...' : "C'est parti ! 💪"}
      </button>
    </div>
  )
}
