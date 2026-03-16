import { useState, useMemo } from 'react'
import { Search, Plus, Check, X } from 'lucide-react'
import { DEFAULT_EXERCISES, MUSCLE_GROUPS } from '../data/exercises'
import { getCustomExercises, addCustomExercise, getCustomMuscleGroups, addCustomMuscleGroup } from '../data/store'
import { useApp } from '../context/AppContext'

export default function ExercisePicker({ onSelect, onClose, selectedIds = [], initialCreating = false }) {
  const { profileId } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [creating, setCreating] = useState(initialCreating)
  const [newMuscle, setNewMuscle] = useState('poitrine')
  const [newType, setNewType] = useState('musculation')
  const [showNewMuscleForm, setShowNewMuscleForm] = useState(false)
  const [newMuscleLabel, setNewMuscleLabel] = useState('')
  const [newMuscleEmoji, setNewMuscleEmoji] = useState('💪')
  const [customMuscles, setCustomMuscles] = useState(() => getCustomMuscleGroups(profileId))

  const customExercises = getCustomExercises(profileId)
  const allMuscleGroups = useMemo(() => [...MUSCLE_GROUPS, ...customMuscles], [customMuscles])
  const allExercises = useMemo(() => [...DEFAULT_EXERCISES, ...customExercises], [customExercises])

  const filtered = useMemo(() => {
    return allExercises.filter(ex => {
      const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' || ex.muscle === filter
      return matchSearch && matchFilter
    })
  }, [allExercises, search, filter])

  const handleCreate = () => {
    if (!search.trim()) return
    const created = addCustomExercise(profileId, { name: search.trim(), muscle: newMuscle, type: newType, description: '' })
    onSelect(created)
  }

  const handleCreateMuscle = () => {
    if (!newMuscleLabel.trim()) return
    const id = newMuscleLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const created = addCustomMuscleGroup(profileId, { id, label: newMuscleLabel.trim(), emoji: newMuscleEmoji || '💪' })
    setCustomMuscles(prev => [...prev, created])
    setNewMuscle(created.id)
    setShowNewMuscleForm(false)
    setNewMuscleLabel('')
    setNewMuscleEmoji('💪')
  }

  const showCreatePanel = creating || (search.trim() && filtered.length === 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ height: '85vh' }}>
        <div className="modal-header">
          <h2>Ajouter un exercice</h2>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setCreating(false) }}
            placeholder="Rechercher ou créer un exercice..."
            style={{ paddingLeft: 40 }}
          />
        </div>

        {/* Muscle group filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 8 }}>
          <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tous</button>
          {allMuscleGroups.map(g => (
            <button key={g.id} className={`chip ${filter === g.id ? 'active' : ''}`}
              onClick={() => setFilter(g.id)} style={{ whiteSpace: 'nowrap' }}>
              {g.emoji} {g.label}
            </button>
          ))}
        </div>

        {/* Exercise list */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
          {filtered.map(ex => {
            const isSelected = selectedIds.includes(ex.id)
            return (
              <button key={ex.id} onClick={() => !isSelected && onSelect(ex)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '12px 8px',
                  background: isSelected ? 'var(--accent-light)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text)', textAlign: 'left',
                  opacity: isSelected ? 0.6 : 1,
                  cursor: isSelected ? 'default' : 'pointer'
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: ex.type === 'cardio' ? 'rgba(239,68,68,0.15)' : 'var(--accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0
                }}>
                  {allMuscleGroups.find(g => g.id === ex.muscle)?.emoji || '💪'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-bold text-sm truncate">{ex.name}</div>
                  <div className="text-xs text-muted">{allMuscleGroups.find(g => g.id === ex.muscle)?.label} · {ex.type}</div>
                </div>
                {isSelected && <Check size={18} color="var(--accent)" />}
                {ex.custom && <span className="badge" style={{ background: 'var(--warning)', color: '#000', fontSize: 10 }}>Custom</span>}
              </button>
            )
          })}

          {/* Suggest create when no results */}
          {filtered.length === 0 && search.trim() && !creating && (
            <div style={{ padding: '20px 8px', textAlign: 'center' }}>
              <p className="text-sm text-muted" style={{ marginBottom: 12 }}>Aucun exercice trouvé</p>
              <button className="btn btn-primary" onClick={() => setCreating(true)}>
                <Plus size={16} /> Créer "{search}"
              </button>
            </div>
          )}

          {filtered.length === 0 && !search.trim() && (
            <div className="empty-state"><p>Aucun exercice trouvé</p></div>
          )}
        </div>

        {/* Create panel */}
        {showCreatePanel ? (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div className="font-bold text-sm" style={{ marginBottom: 10 }}>
              Créer "{search}"
            </div>

            {/* Muscle chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {allMuscleGroups.filter(g => g.id !== 'cardio').map(g => (
                <button key={g.id}
                  onClick={() => setNewMuscle(g.id)}
                  style={{
                    padding: '5px 10px', borderRadius: 20, fontSize: 12,
                    background: newMuscle === g.id ? 'var(--accent)' : 'var(--bg-input)',
                    color: newMuscle === g.id ? '#fff' : 'var(--text)',
                    border: 'none', cursor: 'pointer'
                  }}>
                  {g.emoji} {g.label}
                </button>
              ))}
              <button
                onClick={() => setShowNewMuscleForm(v => !v)}
                style={{
                  padding: '5px 10px', borderRadius: 20, fontSize: 12,
                  background: 'var(--bg-input)', color: 'var(--text-muted)',
                  border: '1px dashed var(--border)', cursor: 'pointer'
                }}>
                ➕ Nouveau
              </button>
            </div>

            {/* Inline new muscle form */}
            {showNewMuscleForm && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                <input value={newMuscleEmoji} onChange={e => setNewMuscleEmoji(e.target.value)}
                  style={{ width: 48, textAlign: 'center', fontSize: 18, padding: '6px 4px' }} placeholder="💪" />
                <input value={newMuscleLabel} onChange={e => setNewMuscleLabel(e.target.value)}
                  placeholder="Nom du muscle" style={{ flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateMuscle()} />
                <button className="btn btn-primary btn-small" onClick={handleCreateMuscle}>OK</button>
              </div>
            )}

            {/* Type toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {['musculation', 'cardio'].map(t => (
                <button key={t} onClick={() => { setNewType(t); if (t === 'cardio') setNewMuscle('cardio') }}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, fontSize: 13,
                    background: newType === t ? 'var(--accent)' : 'var(--bg-input)',
                    color: newType === t ? '#fff' : 'var(--text)',
                    border: 'none', cursor: 'pointer', fontWeight: newType === t ? 700 : 400
                  }}>
                  {t === 'musculation' ? '🏋️ Musculation' : '❤️ Cardio'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreate}>
                <Plus size={16} /> Ajouter l'exercice
              </button>
              <button className="btn btn-secondary" onClick={() => { setCreating(false); setShowNewMuscleForm(false) }}>
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-secondary" onClick={() => setCreating(true)}>
            <Plus size={18} /> Créer un exercice
          </button>
        )}
      </div>
    </div>
  )
}
