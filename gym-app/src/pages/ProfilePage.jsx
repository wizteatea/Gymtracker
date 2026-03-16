import { useState, useMemo } from 'react'
import { LogOut, Save, User, Plus, Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { updateProfile, getWeightHistory, addWeightEntry, deleteWeightEntry } from '../data/store'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ProfilePage() {
  const { profile, profileId, user, logout, refresh } = useApp()

  const [form, setForm] = useState({
    nom: profile?.nom || '',
    prenom: profile?.prenom || '',
    age: String(profile?.age || ''),
    taille: String(profile?.taille || ''),
  })
  const [saved, setSaved] = useState(false)

  const [weightHistory, setWeightHistory] = useState(() => getWeightHistory(profileId))
  const [newWeight, setNewWeight] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10))
  const [showAllWeights, setShowAllWeights] = useState(false)

  const handleSave = async () => {
    await updateProfile(profileId, {
      ...profile,
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      age: Number(form.age) || 0,
      taille: Number(form.taille) || 0,
    })
    refresh()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddWeight = () => {
    const w = parseFloat(newWeight.replace(',', '.'))
    if (!w || w <= 0) return
    const entry = addWeightEntry(profileId, w, newDate)
    setWeightHistory(prev => {
      const updated = [entry, ...prev]
      updated.sort((a, b) => b.date.localeCompare(a.date))
      return updated
    })
    setNewWeight('')
  }

  const handleDeleteWeight = (id) => {
    deleteWeightEntry(profileId, id)
    setWeightHistory(prev => prev.filter(e => e.id !== id))
  }

  // Stats
  const currentWeight = weightHistory[0]?.weight || null
  const firstWeight = weightHistory.length > 1 ? weightHistory[weightHistory.length - 1].weight : null
  const diff = currentWeight && firstWeight ? (currentWeight - firstWeight).toFixed(1) : null
  const bmi = currentWeight && profile?.taille
    ? (currentWeight / Math.pow(profile.taille / 100, 2)).toFixed(1)
    : null

  // Chart data (oldest → newest, max 20 points)
  const chartData = useMemo(() => {
    return [...weightHistory].reverse().slice(-20).map(e => ({
      date: format(parseISO(e.date), 'dd/MM'),
      poids: e.weight,
    }))
  }, [weightHistory])

  const displayed = showAllWeights ? weightHistory : weightHistory.slice(0, 5)

  return (
    <div className="page">
      {/* Avatar */}
      <div className="text-center" style={{ marginBottom: 24 }}>
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 10px' }} />
        ) : (
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px'
          }}>
            <User size={36} color="var(--accent)" />
          </div>
        )}
        <div className="font-bold" style={{ fontSize: 20 }}>{profile?.prenom} {profile?.nom}</div>
        <div className="text-xs text-muted">{user?.email}</div>
        <div className="text-xs text-muted" style={{ marginTop: 4 }}>
          Membre depuis {profile?.createdAt
            ? new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
            : '–'}
        </div>
      </div>

      {/* Weight stats bar */}
      {currentWeight && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          <div className="card text-center" style={{ padding: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{currentWeight}</div>
            <div className="text-xs text-muted">kg actuels</div>
          </div>
          <div className="card text-center" style={{ padding: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: diff == null ? undefined : diff > 0 ? 'var(--danger)' : diff < 0 ? 'var(--success)' : 'var(--text)' }}>
              {diff != null ? (diff > 0 ? '+' : '') + diff : '–'}
            </div>
            <div className="text-xs text-muted">évolution (kg)</div>
          </div>
          <div className="card text-center" style={{ padding: 12 }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{bmi || '–'}</div>
            <div className="text-xs text-muted">IMC</div>
          </div>
        </div>
      )}

      {/* Weight tracking */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="font-bold text-sm" style={{ marginBottom: 12 }}>⚖️ Suivi du poids</div>

        {/* Add entry */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            style={{ width: 140, fontSize: 13 }}
          />
          <input
            type="text"
            inputMode="decimal"
            value={newWeight}
            onChange={e => setNewWeight(e.target.value)}
            placeholder="kg"
            style={{ width: 70, textAlign: 'center' }}
            onKeyDown={e => e.key === 'Enter' && handleAddWeight()}
          />
          <button className="btn btn-primary btn-small" onClick={handleAddWeight} style={{ flexShrink: 0 }}>
            <Plus size={16} /> Ajouter
          </button>
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <div style={{ height: 180, marginBottom: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickFormatter={v => `${v}`}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  formatter={v => [`${v} kg`, 'Poids']}
                />
                <Line type="monotone" dataKey="poids" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History list */}
        {weightHistory.length === 0 && (
          <p className="text-xs text-muted text-center" style={{ padding: '12px 0' }}>
            Aucune mesure enregistrée
          </p>
        )}
        {displayed.map((e, i) => {
          const prev = weightHistory[i + 1]
          const delta = prev ? (e.weight - prev.weight).toFixed(1) : null
          return (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ flex: 1 }}>
                <span className="font-bold text-sm">{e.weight} kg</span>
                <span className="text-xs text-muted" style={{ marginLeft: 8 }}>
                  {format(parseISO(e.date), 'EEEE d MMM yyyy', { locale: fr })}
                </span>
              </div>
              {delta != null && (
                <span className="text-xs" style={{
                  color: delta > 0 ? 'var(--danger)' : delta < 0 ? 'var(--success)' : 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: 2
                }}>
                  {delta > 0 ? <TrendingUp size={12} /> : delta < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                  {delta > 0 ? '+' : ''}{delta}
                </span>
              )}
              <button onClick={() => handleDeleteWeight(e.id)}
                style={{ background: 'none', color: 'var(--danger)', padding: 4 }}>
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}

        {weightHistory.length > 5 && (
          <button className="text-xs text-accent" style={{ background: 'none', marginTop: 8, width: '100%', textAlign: 'center' }}
            onClick={() => setShowAllWeights(v => !v)}>
            {showAllWeights ? 'Voir moins' : `Voir tout (${weightHistory.length})`}
          </button>
        )}
      </div>

      {/* Profile form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="font-bold text-sm" style={{ marginBottom: 12 }}>👤 Informations</div>
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
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={16} /> {saved ? 'Enregistré ✓' : 'Enregistrer'}
        </button>
      </div>

      <button className="btn btn-secondary" onClick={logout}>
        <LogOut size={16} /> Se déconnecter
      </button>
    </div>
  )
}
