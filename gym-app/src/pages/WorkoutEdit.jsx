import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, Link, Clock } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getWorkouts, createWorkout, updateWorkout, getWorkoutCategories } from '../data/store'
import ExercisePicker from '../components/ExercisePicker'

export default function WorkoutEdit() {
  const { id } = useParams()
  const isNew = !id
  const { profileId, refresh } = useApp()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [exercises, setExercises] = useState([])
  const [notes, setNotes] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const categories = getWorkoutCategories(profileId)

  useEffect(() => {
    if (!isNew) {
      const workouts = getWorkouts(profileId)
      const w = workouts.find(w => w.id === id)
      if (w) {
        setTitle(w.title)
        setExercises(w.exercises || [])
        setNotes(w.notes || '')
        setCategoryId(w.categoryId || '')
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
      timeMode: false,   // true = durée en secondes au lieu de reps
      superset: false,   // true = chaîné avec l'exercice suivant
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
    const data = { title: title.trim(), exercises, notes: notes.trim(), categoryId: categoryId || null }
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
        />
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div className="form-group">
          <label className="form-label">Catégorie</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}
          >
            <option value="">Sans catégorie</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Exercises */}
      <div className="flex items-center justify-between mb-8 mt-16">
        <label className="form-label" style={{ margin: 0 }}>Exercices ({exercises.length})</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-secondary btn-small" onClick={() => setShowPicker('create')}>
            <Plus size={14} /> Créer
          </button>
          <button className="btn btn-primary btn-small" onClick={() => setShowPicker('search')}>
            <Plus size={14} /> Ajouter
          </button>
        </div>
      </div>

      {exercises.length === 0 && (
        <div className="card text-center" style={{ padding: 24 }}>
          <p className="text-muted text-sm">Ajoute des exercices à ton entraînement</p>
        </div>
      )}

      {exercises.map((ex, idx) => (
        <div key={idx}>
          <div className="card" style={{ position: 'relative' }}>
            {/* Header */}
            <div className="flex items-center gap-8 mb-12">
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
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Séries</label>
                    <input type="number" value={ex.sets} min="1"
                      onChange={e => updateExercise(idx, 'sets', Number(e.target.value))} />
                  </div>

                  {/* Reps OR Temps */}
                  <div className="form-group">
                    <div className="flex items-center gap-6 mb-4">
                      <label className="form-label" style={{ margin: 0 }}>
                        {ex.timeMode ? 'Durée (s)' : 'Reps'}
                      </label>
                      <button
                        onClick={() => updateExercise(idx, 'timeMode', !ex.timeMode)}
                        style={{
                          background: ex.timeMode ? 'var(--accent)' : 'var(--bg-input)',
                          color: ex.timeMode ? 'white' : 'var(--text-muted)',
                          borderRadius: 6, padding: '2px 8px', fontSize: 11,
                          display: 'flex', alignItems: 'center', gap: 4
                        }}
                        title={ex.timeMode ? 'Passer en reps' : 'Passer en durée'}
                      >
                        <Clock size={12} /> {ex.timeMode ? 'Temps' : 'Reps'}
                      </button>
                    </div>
                    <input type="number"
                      value={ex.timeMode ? (ex.duration || 30) : ex.reps}
                      min="1"
                      onChange={e => updateExercise(idx, ex.timeMode ? 'duration' : 'reps', Number(e.target.value))} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Repos (s)</label>
                    <input type="number" value={ex.rest} step="5"
                      onChange={e => updateExercise(idx, 'rest', Number(e.target.value))} />
                  </div>
                </div>
              </>
            )}

            {/* Superset toggle (not for last exercise) */}
            {idx < exercises.length - 1 && ex.type !== 'cardio' && (
              <button
                onClick={() => updateExercise(idx, 'superset', !ex.superset)}
                style={{
                  marginTop: 8,
                  background: ex.superset ? 'var(--accent-light)' : 'var(--bg-input)',
                  color: ex.superset ? 'var(--accent)' : 'var(--text-muted)',
                  borderRadius: 8, padding: '6px 12px', fontSize: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                  border: ex.superset ? '1px solid var(--accent)' : '1px solid transparent'
                }}
              >
                <Link size={13} />
                {ex.superset ? 'Superset activé ↓' : 'Lier avec l\'exercice suivant (superset)'}
              </button>
            )}
          </div>

          {/* Superset connector */}
          {ex.superset && idx < exercises.length - 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 24, color: 'var(--accent)', fontSize: 12, fontWeight: 700
            }}>
              ⟵ SUPERSET ⟶
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
          initialCreating={showPicker === 'create'}
        />
      )}
    </div>
  )
}
