import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { MUSCLE_GROUPS } from '../data/exercises'
import { addCustomExercise, getCustomMuscleGroups, addCustomMuscleGroup } from '../data/store'
import { useApp } from '../context/AppContext'

export default function ExerciseCreate() {
  const { profileId, refresh } = useApp()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [muscle, setMuscle] = useState('poitrine')
  const [type, setType] = useState('musculation')
  const [showNewMuscle, setShowNewMuscle] = useState(false)
  const [newMuscleLabel, setNewMuscleLabel] = useState('')
  const [newMuscleEmoji, setNewMuscleEmoji] = useState('💪')
  const [customMuscles, setCustomMuscles] = useState(() => getCustomMuscleGroups(profileId))
  const [saved, setSaved] = useState(false)

  const allMuscleGroups = useMemo(() => [...MUSCLE_GROUPS, ...customMuscles], [customMuscles])

  const handleCreateMuscle = () => {
    if (!newMuscleLabel.trim()) return
    const id = newMuscleLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const created = addCustomMuscleGroup(profileId, { id, label: newMuscleLabel.trim(), emoji: newMuscleEmoji || '💪' })
    setCustomMuscles(prev => [...prev, created])
    setMuscle(created.id)
    setShowNewMuscle(false)
    setNewMuscleLabel('')
    setNewMuscleEmoji('💪')
  }

  const handleSave = () => {
    if (!name.trim()) return
    addCustomExercise(profileId, { name: name.trim(), muscle, type, description: '' })
    refresh()
    setSaved(true)
    setTimeout(() => navigate(-1), 800)
  }

  return (
    <div className="page">
      <div className="flex items-center gap-12 mb-24">
        <button onClick={() => navigate(-1)} style={{ background: 'none', color: 'var(--text)' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="page-title" style={{ marginBottom: 0, flex: 1 }}>Créer un exercice</h1>
      </div>

      {/* Name */}
      <div className="form-group">
        <label className="form-label">Nom de l'exercice</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Curl barre EZ, Fentes avec haltères..."
          style={{ fontSize: 16 }}
        />
      </div>

      {/* Type toggle */}
      <div className="form-group">
        <label className="form-label">Type</label>
        <div style={{ display: 'flex', gap: 10 }}>
          {['musculation', 'cardio'].map(t => (
            <button
              key={t}
              onClick={() => { setType(t); if (t === 'cardio') setMuscle('cardio') }}
              style={{
                flex: 1, padding: '12px', borderRadius: 10, fontSize: 14,
                background: type === t ? 'var(--accent)' : 'var(--bg-input)',
                color: type === t ? '#fff' : 'var(--text)',
                border: type === t ? 'none' : '1px solid var(--border)',
                cursor: 'pointer', fontWeight: type === t ? 700 : 400,
                transition: 'all 0.15s'
              }}>
              {t === 'musculation' ? '🏋️ Musculation' : '❤️ Cardio'}
            </button>
          ))}
        </div>
      </div>

      {/* Muscle group */}
      {type === 'musculation' && (
        <div className="form-group">
          <label className="form-label">Groupe musculaire</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {allMuscleGroups.filter(g => g.id !== 'cardio').map(g => (
              <button
                key={g.id}
                onClick={() => setMuscle(g.id)}
                style={{
                  padding: '8px 14px', borderRadius: 20, fontSize: 13,
                  background: muscle === g.id ? 'var(--accent)' : 'var(--bg-input)',
                  color: muscle === g.id ? '#fff' : 'var(--text)',
                  border: muscle === g.id ? 'none' : '1px solid var(--border)',
                  cursor: 'pointer', fontWeight: muscle === g.id ? 700 : 400,
                  transition: 'all 0.15s'
                }}>
                {g.emoji} {g.label}
              </button>
            ))}
            <button
              onClick={() => setShowNewMuscle(v => !v)}
              style={{
                padding: '8px 14px', borderRadius: 20, fontSize: 13,
                background: 'var(--bg-input)', color: 'var(--text-muted)',
                border: '1px dashed var(--border)', cursor: 'pointer'
              }}>
              ➕ Nouveau muscle
            </button>
          </div>

          {/* Inline new muscle form */}
          {showNewMuscle && (
            <div className="card" style={{ marginTop: 12, padding: 14 }}>
              <div className="font-bold text-sm" style={{ marginBottom: 10, color: 'var(--accent)' }}>
                Nouveau groupe musculaire
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input
                  value={newMuscleEmoji}
                  onChange={e => setNewMuscleEmoji(e.target.value)}
                  style={{ width: 52, textAlign: 'center', fontSize: 20, padding: '8px 4px' }}
                  placeholder="💪"
                />
                <input
                  value={newMuscleLabel}
                  onChange={e => setNewMuscleLabel(e.target.value)}
                  placeholder="Nom du muscle"
                  style={{ flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateMuscle()}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-small" onClick={handleCreateMuscle}>Créer</button>
                <button className="btn btn-secondary btn-small" onClick={() => setShowNewMuscle(false)}>Annuler</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save */}
      <button
        className="btn btn-primary mt-16"
        onClick={handleSave}
        disabled={!name.trim() || saved}
        style={{ opacity: !name.trim() ? 0.5 : 1 }}
      >
        {saved ? <><Check size={18} /> Exercice créé !</> : 'Créer l\'exercice'}
      </button>
    </div>
  )
}
