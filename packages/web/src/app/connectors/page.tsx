'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/status-badge';
import type { ConnectorSummary } from '@/lib/api';

const CATEGORIES = [
  { value: 'regnskap', label: 'Regnskap' },
  { value: 'nettbutikk', label: 'Nettbutikk' },
  { value: 'betaling', label: 'Betaling' },
  { value: 'crm', label: 'CRM' },
  { value: 'faktura', label: 'Faktura' },
  { value: 'frakt', label: 'Frakt' },
  { value: 'erp', label: 'ERP' },
];

const CONNECTOR_TYPES = [
  { value: 'source', label: 'Kilde' },
  { value: 'destination', label: 'Mål' },
  { value: 'both', label: 'Begge' },
];

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'both', category: 'regnskap' });
  const [testResult, setTestResult] = useState<Record<string, { connected: boolean; error?: string }>>({});

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  useEffect(() => {
    loadConnectors();
  }, []);

  async function loadConnectors() {
    try {
      const res = await fetch(`${apiBase}/api/connectors`);
      if (res.ok) setConnectors(await res.json());
    } catch { /* ignore */ }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/api/connectors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: '', type: 'both', category: 'regnskap' });
        loadConnectors();
      }
    } catch { /* ignore */ }
  }

  async function handleTest(id: string) {
    try {
      const res = await fetch(`${apiBase}/api/connectors/${id}/test`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setTestResult((prev) => ({ ...prev, [id]: result }));
      }
    } catch {
      setTestResult((prev) => ({ ...prev, [id]: { connected: false, error: 'Nettverksfeil' } }));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Koblinger</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {showForm ? 'Avbryt' : 'Ny kobling'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
        >
          <h2 className="text-lg font-semibold mb-4">Opprett ny kobling</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="F.eks. Min Tripletex-konto"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              >
                {CONNECTOR_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              Opprett
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {connectors.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Ingen koblinger konfigurert ennå. Klikk &quot;Ny kobling&quot; for å komme i gang.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {connectors.map((connector) => (
              <div
                key={connector.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <p className="font-medium text-gray-900">{connector.name}</p>
                  <p className="text-sm text-gray-500">
                    {CATEGORIES.find((c) => c.value === connector.category)?.label ?? connector.category}
                    {' · '}
                    {CONNECTOR_TYPES.find((t) => t.value === connector.type)?.label ?? connector.type}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={connector.isActive ? 'active' : 'paused'} />
                  <button
                    onClick={() => handleTest(connector.id)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Test tilkobling
                  </button>
                  {testResult[connector.id] && (
                    <span
                      className={`text-xs ${testResult[connector.id].connected ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {testResult[connector.id].connected ? 'Tilkoblet' : testResult[connector.id].error ?? 'Feilet'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
