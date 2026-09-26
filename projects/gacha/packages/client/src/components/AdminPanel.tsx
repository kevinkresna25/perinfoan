import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, Lock, ShieldCheck } from 'lucide-react';
import {
  loginAdmin,
  fetchRates,
  fetchCards,
  createCardApi,
  deleteCardApi,
  saveRarityApi,
  deleteRarityApi,
} from '../services/api';
import type { Card, Rarity } from '../types';

export const AdminPanel: React.FC = () => {
  const [token, setToken] = useState<string>(() => localStorage.getItem('gacha_admin_token') || '');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'cards' | 'rarities'>('cards');
  const [cards, setCards] = useState<Card[]>([]);
  const [rarities, setRarities] = useState<Rarity[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Form states for uploading card
  const [cardName, setCardName] = useState('');
  const [cardRarity, setCardRarity] = useState('');
  const [cardDesc, setCardDesc] = useState('');
  const [cardFile, setCardFile] = useState<File | null>(null);

  // Form states for new rarity
  const [rarityName, setRarityName] = useState('');
  const [rarityColor, setRarityColor] = useState('#a855f7');
  const [rarityRate, setRarityRate] = useState(10);
  const [raritySort, setRaritySort] = useState(1);

  const loadData = () => {
    fetchCards().then((res) => setCards(res.cards));
    fetchRates().then((res) => {
      setRarities(res.rarities);
      if (res.rarities.length > 0 && !cardRarity) {
        setCardRarity(res.rarities[0].id);
      }
    });
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const jwt = await loginAdmin(password);
      setToken(jwt);
      localStorage.setItem('gacha_admin_token', jwt);
      setStatusMessage(null);
    } catch (err: any) {
      setStatusMessage(err.message || 'Login failed.');
    }
  };

  const handleUploadCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardFile || !cardName || !cardRarity) return;

    const fd = new FormData();
    fd.append('name', cardName);
    fd.append('rarity_id', cardRarity);
    fd.append('description', cardDesc);
    fd.append('image', cardFile);

    try {
      await createCardApi(fd, token);
      setCardName('');
      setCardDesc('');
      setCardFile(null);
      loadData();
      setStatusMessage('Card uploaded successfully!');
    } catch (err: any) {
      setStatusMessage(err.message);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this card?')) return;
    try {
      await deleteCardApi(id, token);
      loadData();
    } catch (err: any) {
      setStatusMessage(err.message);
    }
  };

  const handleCreateRarity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveRarityApi(
        {
          name: rarityName,
          color: rarityColor,
          drop_rate: rarityRate,
          sort_order: raritySort,
        },
        token
      );
      setRarityName('');
      loadData();
      setStatusMessage('Rarity tier created!');
    } catch (err: any) {
      setStatusMessage(err.message);
    }
  };

  const handleDeleteRarity = async (id: string) => {
    if (!window.confirm('Delete this rarity tier?')) return;
    try {
      await deleteRarityApi(id, token);
      loadData();
    } catch (err: any) {
      setStatusMessage(err.message);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <Lock className="w-10 h-10 text-purple-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Admin Authentication</h2>
          <p className="text-xs text-slate-400 mb-6">Enter admin password to manage gacha pool and drop rates.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
            />
            {statusMessage && <p className="text-xs text-rose-400">{statusMessage}</p>}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-sm"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalRate = rarities.reduce((sum, r) => sum + (Number(r.drop_rate) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h2 className="text-2xl font-bold text-slate-100">Admin Dashboard</h2>
        </div>
        <button
          onClick={() => {
            setToken('');
            localStorage.removeItem('gacha_admin_token');
          }}
          className="text-xs text-slate-400 hover:text-white"
        >
          Logout
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 bg-purple-900/30 border border-purple-500/30 text-purple-200 text-xs rounded-xl mb-6">
          {statusMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('cards')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'cards' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400'
          }`}
        >
          Manage Cards ({cards.length})
        </button>
        <button
          onClick={() => setActiveTab('rarities')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'rarities' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400'
          }`}
        >
          Manage Rarities ({rarities.length})
        </button>
      </div>

      {activeTab === 'cards' ? (
        <div className="space-y-8">
          {/* Upload Card Form */}
          <form onSubmit={handleUploadCard} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Upload New Card</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Card Name"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                required
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
              />
              <select
                value={cardRarity}
                onChange={(e) => setCardRarity(e.target.value)}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
              >
                {rarities.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.drop_rate}%)
                  </option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Lore / Description (optional)"
              value={cardDesc}
              onChange={(e) => setCardDesc(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
            />
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setCardFile(e.target.files?.[0] || null)}
                required
                className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
              />
              <button
                type="submit"
                className="ml-auto px-6 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-sm flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> Save Card
              </button>
            </div>
          </form>

          {/* Cards List */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {cards.map((c) => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative">
                <button
                  onClick={() => handleDeleteCard(c.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-500 z-10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="aspect-[4/5] bg-slate-950">
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: c.rarity.color, color: '#0f172a' }}>
                    {c.rarity.name}
                  </span>
                  <p className="font-bold text-xs text-slate-100 truncate mt-1">{c.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Rarity creator */}
          <form onSubmit={handleCreateRarity} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Add Custom Rarity Tier</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Rarity Name (e.g. UR)"
                value={rarityName}
                onChange={(e) => setRarityName(e.target.value)}
                required
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={rarityColor}
                  onChange={(e) => setRarityColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
                />
                <span className="text-xs font-mono text-slate-300">{rarityColor}</span>
              </div>
              <input
                type="number"
                step="0.01"
                placeholder="Drop Rate %"
                value={rarityRate}
                onChange={(e) => setRarityRate(parseFloat(e.target.value))}
                required
                className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100"
              />
              <button
                type="submit"
                className="py-2 px-4 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white text-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Tier
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Total configured rates: <strong className={totalRate === 100 ? 'text-emerald-400' : 'text-amber-400'}>{totalRate}%</strong> (Rates are normalized automatically if not 100%).
            </p>
          </form>

          {/* Rarity Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs text-slate-400 uppercase">
                <tr>
                  <th className="px-6 py-3">Tier</th>
                  <th className="px-6 py-3">Color</th>
                  <th className="px-6 py-3">Drop Rate</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rarities.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 font-bold text-slate-100">{r.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block w-4 h-4 rounded-full mr-2 align-middle" style={{ backgroundColor: r.color }} />
                      <span className="font-mono text-xs">{r.color}</span>
                    </td>
                    <td className="px-6 py-4 font-mono">{r.drop_rate}%</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDeleteRarity(r.id)}
                        className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
