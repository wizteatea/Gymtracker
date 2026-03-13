import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Play, Copy, Trash2, Dumbbell, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getWorkouts, deleteWorkout, duplicateWorkout } from '../data/store'
import { MUSCLE_GROUPS } from '../data/exercises'

export default function WorkoutList() {
  const { profileId, refresh, refreshKey } = useApp()
  const navigate = useNavigate()
  const workouts = useMemo(() => getWorkouts(profileId), [profileId, refreshKey])

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

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-16">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Entraînements</h1>
        <button className="btn btn-primary btn-small" onClick={() => navigate('/workouts/new')}>
          <Plus size={16} /> Créer
        </button>
      </div>

      {workouts.length === 0 && (
        <div className="empty-state">
          <Dumbbell size={48} />
          <p className="mt-8">Aucun entraînement créé</p>
          <button className="btn btn-primary mt-16" onClick={() => navigate('/workouts/new')}>
            <Plus size={18} /> Créer mon premier entraînement
          </button>
        </div>
      )}

      {workouts.map(w => (
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
            <span className="text-xs text-muted">
              {w.exercises?.length || 0} exercice{(w.exercises?.length || 0) > 1 ? 's' : ''}
            </span>
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
      ))}
    </div>
  )
}
