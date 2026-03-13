import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, GripVertical, Trash2, Save } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getWorkouts, createWorkout, updateWorkout } from '../data/store'
import ExercisePicker from '../components/ExercisePicker'

export default function WorkoutEdit() {
  const { id } = useParams()
  const isNew = !id
  const { profileId, refresh } = useApp()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [exercises, setExercises] = useState([])
  const [notes, setNotes] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)

  useEffect(() => {
    if (!isNew) {
      const workouts = getWorkouts(profileId)
      const w = workouts.find(w => w.id === id)
      if (w) {
        setTitle(w.title)
        setExercises(w.exercises || [])
        setNotes(w.notes || '')
      }
    }
  }, [id, profileId, isNew])

  const addExercise = (ex) => {
    setExercises(prev => [...prev, {
      exerciseId: ex.id,
      name: ex.name,
      muscle: ex.muscle,
      type: ex.type,
      sets: 3,
      reps: ex.type === 'cardio' ? 0 : 10,
      rest: 90,
      duration: ex.type === 'cardio' ? 20 : 0,
      distance: 0,
      calories: 0,
    }])
    setShowPicker(false)
  }

  const updateExercise = (idx, field, value) => {
    setExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex))
  }

  const removeExercise = (idx) => {
    setExercises(prev => prev.filter((_, i) => i !== idx))
  }

  const moveExercise = (from, to) => {
    if (to < 0 || to >= exercises.length) return
    const arr = [...exercises]
    const [item] = arr.splice(from, 1)
    arr.splice(to, 0, item)
    setExercises(arr)
  }

  const handleSave = () => {
    if (!title.trim()) {
      alert('Donne un titre à ton entraînement')
      return
    }
    const data = { title: title.trim(), exercises, notes: notes.trim() }
    if (isNew) {
      createWorkout(profileId, data)
    } else {
      updateWorkout(profileId, id, data)
    }
    refresh()
    navigate('/workouts')
  }

  return (
    <div className="page">
      <div className="flex items-center gap-12 mb-16">
        <button onClick={() => navigate(-1)} style={{ background: 'none', color: 'var(--text)' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="page-title" style={{ marginBottom: 0, flex: 1 }}>
          {isNew ? 'Nouvel entraînement' : 'Modifier'}
        </h1>
        <button className="btn btn-primary btn-small" onClick={handleSave}>
          <Save size={16} /> Sauver
        </button>
      </div>

      {/* Title */}
      <div className="form-group">
        <label className="form-label">Titre</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ex: Push day, Leg day..."
          autoFocus
        />
      </div>

      {/* Exercises */}
      <div className="flex items-center justify-between mb-8 mt-16">
        <label className="form-label" style={{ margin: 0 }}>Exercices ({exercises.length})</label>
        <button className="btn btn-primary btn-small" onClick={() => setShowPicker(true)}>
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {exercises.length === 0 && (
        <div className="card text-center" style={{ padding: 24 }}>
          <p className="text-muted text-sm">Ajoute des exercices à ton entraînement</p>
        </div>
      )}

      {exercises.map((ex, idx) => (
        <div key={idx} className="card" style={{ position: 'relative' }}>
          <div className="flex items-center gap-8 mb-8">
            {/* Drag / reorder buttons */}
            <div className="flex flex-col" style={{ gap: 2 }}>
              <button onClick={() => moveExercise(idx, idx - 1)}
                style={{ background: 'none', color: 'var(--text-muted)', padding: 2, fontSize: 12 }}
                disabled={idx === 0}>▲</button>
              <button onClick={() => moveExercise(idx, idx + 1)}
                style={{ background: 'none', color: 'var(--text-muted)', padding: 2, fontSize: 12 }}
                disabled={idx === exercises.length - 1}>▼</button>
            </div>
            <div style={{ flex: 1 }}>
              <div className="font-bold text-sm">{ex.name}</div>
              <div className="text-xs text-muted">{ex.muscle}</div>
            </div>
            <button onClick={() => removeExercise(idx)}
              style={{ background: 'none', color: 'var(--danger)', padding: 4 }}>
              <Trash2 size={16} />
            </button>
          </div>

          {ex.type === 'cardio' ? (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Durée (min)</label>
                <input type="number" value={ex.duration}
                  onChange={e => updateExercise(idx, 'duration', Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Distance (km)</label>
                <input type="number" value={ex.distance} step="0.1"
                  onChange={e => updateExercise(idx, 'distance', Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Calories</label>
                <input type="number" value={ex.calories}
                  onChange={e => updateExercise(idx, 'calories', Number(e.target.value))} />
              </div>
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Séries</label>
                <input type="number" value={ex.sets} min="1"
                  onChange={e => updateExercise(idx, 'sets', Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Reps</label>
                <input type="number" value={ex.reps} min="1"
                  onChange={e => updateExercise(idx, 'reps', Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Repos (s)</label>
                <input type="number" value={ex.rest} step="5"
                  onChange={e => updateExercise(idx, 'rest', Number(e.target.value))} />
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Notes */}
      <div className="form-group mt-16">
        <label className="form-label">Notes (optionnel)</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes, rappels..." />
      </div>

      {/* Save button bottom */}
      <button className="btn btn-primary mt-16" onClick={handleSave}>
        <Save size={18} /> {isNew ? 'Créer l\'entraînement' : 'Enregistrer les modifications'}
      </button>

      {showPicker && (
        <ExercisePicker
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
          selectedIds={exercises.map(e => e.exerciseId)}
        />
      )}
    </div>
  )
}
