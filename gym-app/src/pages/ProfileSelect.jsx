import { useState } from 'react'
import { User, Plus, Edit3, Trash2, ChevronRight } from 'lucide-react'
import { getProfiles, createProfile, updateProfile, deleteProfile } from '../data/store'
import { useApp } from '../context/AppContext'

export default function ProfileSelect() {
  const { selectProfile, refresh } = useApp()
  const [profiles, setProfiles] = useState(() => getProfiles())
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ nom: '', prenom: '', age: '', taille: '', poids: '' })

  const reloadProfiles = () => setProfiles(getProfiles())

  const openCreate = () => {
    setForm({ nom: '', prenom: '', age: '', taille: '', poids: '' })
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (e, p) => {
    e.stopPropagation()
    setForm({ nom: p.nom, prenom: p.prenom, age: String(p.age), taille: String(p.taille), poids: String(p.poids) })
    setEditId(p.id)
    setShowForm(true)
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirm('Supprimer ce profil ?')) {
      deleteProfile(id)
      reloadProfiles()
      refresh()
    }
  }

  const handleSave = () => {
    if (!form.nom.trim() || !form.prenom.trim()) return
    if (editId) {
      updateProfile(editId, {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        age: Number(form.age) || 0,
        taille: Number(form.taille) || 0,
        poids: Number(form.poids) || 0,
      })
    } else {
      createProfile({
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        age: Number(form.age) || 0,
        taille: Number(form.taille) || 0,
        poids: Number(form.poids) || 0,
      })
    }
    setShowForm(false)
    reloadProfiles()
    refresh()
  }

  const handleSelect = (id) => {
    selectProfile(id)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '24px 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>💪</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>GymTracker</h1>
        <p className="text-secondary">Sélectionne ton profil</p>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {profiles.map(p => (
          <div
            key={p.id}
            className="card"
            onClick={() => handleSelect(p.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--accent-light)', display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={24} color="var(--accent)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{p.prenom} {p.nom}</div>
              <div className="text-sm text-muted">
                {p.age} ans · {p.taille} cm · {p.poids} kg
              </div>
            </div>
            <button className="btn-icon" onClick={(e) => openEdit(e, p)}
              style={{ background: 'var(--bg-input)', marginRight: 4 }}>
              <Edit3 size={16} color="var(--text-secondary)" />
            </button>
            <button className="btn-icon" onClick={(e) => handleDelete(e, p.id)}
              style={{ background: 'var(--danger-light)' }}>
              <Trash2 size={16} color="var(--danger)" />
            </button>
            <ChevronRight size={20} color="var(--text-muted)" />
          </div>
        ))}

        {profiles.length === 0 && (
          <div className="empty-state">
            <User size={48} />
            <p>Aucun profil créé</p>
            <p className="text-xs mt-8">Crée ton premier profil pour commencer</p>
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 20 }}>
        <Plus size={20} /> Nouveau profil
      </button>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? 'Modifier le profil' : 'Nouveau profil'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: 24 }}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Prénom</label>
              <input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} placeholder="Prénom" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Nom</label>
              <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Nom" />
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

            <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: 8 }}>
              {editId ? 'Enregistrer' : 'Créer le profil'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
