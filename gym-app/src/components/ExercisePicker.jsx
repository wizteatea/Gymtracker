import { useState, useMemo } from 'react'
import { Search, Plus, Check, X } from 'lucide-react'
import { DEFAULT_EXERCISES, MUSCLE_GROUPS } from '../data/exercises'
import { getCustomExercises, addCustomExercise } from '../data/store'
import { useApp } from '../context/AppContext'

export default function ExercisePicker({ onSelect, onClose, selectedIds = [] }) {
  const { profileId } = useApp()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [newEx, setNewEx] = useState({ name: '', muscle: 'poitrine', type: 'musculation', description: '' })

  const customExercises = getCustomExercises(profileId)
  const allExercises = useMemo(() => [...DEFAULT_EXERCISES, ...customExercises], [customExercises])

  const filtered = useMemo(() => {
    return allExercises.filter(ex => {
      const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' || ex.muscle === filter
      return matchSearch && matchFilter
    })
  }, [allExercises, search, filter])

  const handleCreateExercise = () => {
    if (!newEx.name.trim()) return
    const created = addCustomExercise(profileId, newEx)
    onSelect(created)
    setShowCreate(false)
    setNewEx({ name: '', muscle: 'poitrine', type: 'musculation', description: '' })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ height: '85vh' }}>
        <div className="modal-header">
          <h2>Ajouter un exercice</h2>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', fontSize: 24 }}>
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un exercice..."
            style={{ paddingLeft: 40 }}
          />
        </div>

        {/* Muscle group filter */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 8 }}>
          <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            Tous
          </button>
          {MUSCLE_GROUPS.map(g => (
            <button
              key={g.id}
              className={`chip ${filter === g.id ? 'active' : ''}`}
              onClick={() => setFilter(g.id)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>

        {/* Exercise list */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
          {filtered.map(ex => {
            const isSelected = selectedIds.includes(ex.id)
            return (
              <button
                key={ex.id}
                onClick={() => !isSelected && onSelect(ex)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', padding: '12px 8px',
                  background: isSelected ? 'var(--accent-light)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text)', textAlign: 'left',
                  opacity: isSelected ? 0.6 : 1,
                  cursor: isSelected ? 'default' : 'pointer'
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: ex.type === 'cardio' ? 'rgba(239,68,68,0.15)' : 'var(--accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0
                }}>
                  {MUSCLE_GROUPS.find(g => g.id === ex.muscle)?.emoji || '💪'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-bold text-sm truncate">{ex.name}</div>
                  <div className="text-xs text-muted">{MUSCLE_GROUPS.find(g => g.id === ex.muscle)?.label} · {ex.type}</div>
                </div>
                {isSelected && <Check size={18} color="var(--accent)" />}
                {ex.custom && <span className="badge" style={{ background: 'var(--warning)', color: '#000', fontSize: 10 }}>Custom</span>}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="empty-state">
              <p>Aucun exercice trouvé</p>
            </div>
          )}
        </div>

        {/* Create custom exercise */}
        {!showCreate ? (
          <button className="btn btn-secondary" onClick={() => setShowCreate(true)}>
            <Plus size={18} /> Créer un exercice
          </button>
        ) : (
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div className="form-group">
              <input value={newEx.name} onChange={e => setNewEx({ ...newEx, name: e.target.value })} placeholder="Nom de l'exercice" autoFocus />
            </div>
            <div className="form-row">
              <select value={newEx.muscle} onChange={e => setNewEx({ ...newEx, muscle: e.target.value })}>
                {MUSCLE_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
              <select value={newEx.type} onChange={e => setNewEx({ ...newEx, type: e.target.value })}>
                <option value="musculation">Musculation</option>
                <option value="cardio">Cardio</option>
              </select>
            </div>
            <div className="flex gap-8 mt-8">
              <button className="btn btn-primary btn-small" onClick={handleCreateExercise}>Ajouter</button>
              <button className="btn btn-secondary btn-small" onClick={() => setShowCreate(false)}>Annuler</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
