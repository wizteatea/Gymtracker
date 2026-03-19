import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, Copy, Trash2, Dumbbell, ChevronRight, FolderPlus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getWorkouts, deleteWorkout, duplicateWorkout, getWorkoutCategories, addWorkoutCategory, deleteWorkoutCategory, updateWorkout } from '../data/store'

export default function WorkoutList() {
  const { profileId, refresh, refreshKey } = useApp()
  const navigate = useNavigate()
  const workouts = useMemo(() => getWorkouts(profileId), [profileId, refreshKey])
  const categories = useMemo(() => getWorkoutCategories(profileId), [profileId, refreshKey])
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [collapsedCats, setCollapsedCats] = useState({})

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirm('Supprimer cet entraînement ?')) {
      deleteWorkout(profileId, id)
      refresh()
    }
  }

  const handleDuplicate = (e, id) => {
    e.stopPropagation()
    duplicateWorkout(profileId, id)
    refresh()
  }

  const handleCreateCategory = () => {
    if (!newCatLabel.trim()) return
    addWorkoutCategory(profileId, newCatLabel)
    setNewCatLabel('')
    setShowNewCat(false)
    refresh()
  }

  const handleDeleteCategory = (e, catId) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette catégorie ? Les séances seront déplacées dans "Sans catégorie".')) return
    deleteWorkoutCategory(profileId, catId)
    refresh()
  }

  const handleMoveToCategory = (e, workoutId, categoryId) => {
    e.stopPropagation()
    updateWorkout(profileId, workoutId, { categoryId: categoryId || null })
    refresh()
  }

  const toggleCollapse = (catId) => {
    setCollapsedCats(prev => ({ ...prev, [catId]: !prev[catId] }))
  }

  // Group workouts by category
  const uncategorized = workouts.filter(w => !w.categoryId || !categories.find(c => c.id === w.categoryId))
  const grouped = categories.map(cat => ({
    ...cat,
    workouts: workouts.filter(w => w.categoryId === cat.id),
  }))

  const renderWorkout = (w) => (
    <div
      key={w.id}
      className="card"
      onClick={() => navigate(`/workouts/edit/${w.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="font-bold" style={{ fontSize: 17 }}>{w.title}</div>
        <ChevronRight size={18} color="var(--text-muted)" />
      </div>
      <div className="flex gap-8" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
        {w.exercises?.map((ex, i) => (
          <span key={i} className="text-xs" style={{
            background: 'var(--bg-input)', padding: '3px 8px',
            borderRadius: 6, color: 'var(--text-secondary)'
          }}>
            {ex.name}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="text-xs text-muted">
            {w.exercises?.length || 0} exercice{(w.exercises?.length || 0) > 1 ? 's' : ''}
          </span>
          {/* Category move dropdown */}
          {categories.length > 0 && (
            <select
              value={w.categoryId || ''}
              onClick={e => e.stopPropagation()}
              onChange={e => handleMoveToCategory(e, w.id, e.target.value)}
              style={{
                background: 'var(--bg-input)', border: 'none', borderRadius: 6,
                color: 'var(--text-muted)', fontSize: 11, padding: '2px 6px', cursor: 'pointer'
              }}
            >
              <option value="">Sans catégorie</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-8">
          <button onClick={(e) => handleDuplicate(e, w.id)}
            style={{ background: 'none', color: 'var(--text-muted)', padding: 4 }}>
            <Copy size={16} />
          </button>
          <button onClick={() => navigate('/session', { state: { workoutId: w.id } })}
            style={{ background: 'none', color: 'var(--success)', padding: 4 }}>
            <Play size={16} />
          </button>
          <button onClick={(e) => handleDelete(e, w.id)}
            style={{ background: 'none', color: 'var(--danger)', padding: 4 }}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-16">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Entraînements</h1>
        <div className="flex gap-8">
          <button className="btn btn-secondary btn-small" onClick={() => setShowNewCat(true)}>
            <FolderPlus size={16} />
          </button>
          <button className="btn btn-primary btn-small" onClick={() => navigate('/workouts/new')}>
            <Plus size={16} /> Créer
          </button>
        </div>
      </div>

      {/* New category form */}
      {showNewCat && (
        <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input
            value={newCatLabel}
            onChange={e => setNewCatLabel(e.target.value)}
            placeholder="Nom de la catégorie..."
            style={{ flex: 1 }}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
          />
          <button className="btn btn-primary btn-small" onClick={handleCreateCategory}>OK</button>
          <button onClick={() => { setShowNewCat(false); setNewCatLabel('') }}
            style={{ background: 'none', color: 'var(--text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
      )}

      {workouts.length === 0 && (
        <div className="empty-state">
          <Dumbbell size={48} />
          <p className="mt-8">Aucun entraînement créé</p>
          <button className="btn btn-primary mt-16" onClick={() => navigate('/workouts/new')}>
            <Plus size={18} /> Créer mon premier entraînement
          </button>
        </div>
      )}

      {/* Categorized workouts */}
      {grouped.map(cat => (
        <div key={cat.id} style={{ marginBottom: 16 }}>
          <button
            onClick={() => toggleCollapse(cat.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              background: 'none', color: 'var(--text)', padding: '8px 0',
              borderBottom: '1px solid var(--border)', cursor: 'pointer',
              marginBottom: 8
            }}
          >
            {collapsedCats[cat.id] ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            <span className="font-bold" style={{ flex: 1, textAlign: 'left', fontSize: 15 }}>
              {cat.label}
            </span>
            <span className="text-xs text-muted" style={{ marginRight: 8 }}>
              {cat.workouts.length} séance{cat.workouts.length !== 1 ? 's' : ''}
            </span>
            <span onClick={(e) => handleDeleteCategory(e, cat.id)}
              style={{ color: 'var(--danger)', padding: 4, display: 'flex', alignItems: 'center' }}>
              <Trash2 size={14} />
            </span>
          </button>
          {!collapsedCats[cat.id] && (
            cat.workouts.length > 0
              ? cat.workouts.map(renderWorkout)
              : <div className="text-xs text-muted" style={{ padding: '8px 0' }}>Aucune séance dans cette catégorie</div>
          )}
        </div>
      ))}

      {/* Uncategorized workouts */}
      {uncategorized.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {categories.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 0', borderBottom: '1px solid var(--border)',
              marginBottom: 8, color: 'var(--text-muted)', fontSize: 15
            }}>
              <span className="font-bold">Sans catégorie</span>
              <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>
                {uncategorized.length} séance{uncategorized.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {uncategorized.map(renderWorkout)}
        </div>
      )}
    </div>
  )
}
