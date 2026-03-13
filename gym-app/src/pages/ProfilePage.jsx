import { useState } from 'react'
import { User, LogOut, Save, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { updateProfile, deleteProfile } from '../data/store'

export default function ProfilePage() {
  const { profile, profileId, logout, refresh } = useApp()
  const [form, setForm] = useState({
    nom: profile?.nom || '',
    prenom: profile?.prenom || '',
    age: String(profile?.age || ''),
    taille: String(profile?.taille || ''),
    poids: String(profile?.poids || ''),
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    updateProfile(profileId, {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      age: Number(form.age) || 0,
      taille: Number(form.taille) || 0,
      poids: Number(form.poids) || 0,
    })
    refresh()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleDelete = () => {
    if (confirm('Supprimer définitivement ce profil et toutes ses données ?')) {
      deleteProfile(profileId)
      logout()
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Mon profil</h1>

      <div className="text-center mb-16">
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--accent-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px'
        }}>
          <User size={36} color="var(--accent)" />
        </div>
        <div className="font-bold" style={{ fontSize: 20 }}>{profile?.prenom} {profile?.nom}</div>
        <div className="text-xs text-muted">
          Membre depuis {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '–'}
        </div>
      </div>

      <div className="card">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Prénom</label>
            <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Nom</label>
            <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Âge</label>
            <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Taille (cm)</label>
            <input type="number" value={form.taille} onChange={e => setForm({ ...form, taille: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Poids (kg)</label>
            <input type="number" value={form.poids} onChange={e => setForm({ ...form, poids: e.target.value })} />
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={16} /> {saved ? 'Enregistré ✓' : 'Enregistrer'}
        </button>
      </div>

      <div style={{ marginTop: 32 }}>
        <button className="btn btn-secondary mb-8" onClick={logout}>
          <LogOut size={16} /> Changer de profil
        </button>
        <button className="btn btn-danger" onClick={handleDelete}>
          <Trash2 size={16} /> Supprimer le profil
        </button>
      </div>
    </div>
  )
}
