'use client';

import { useEffect, useState } from 'react';
import type { AccountVariable, AccountFunction } from '@/lib/api';

type Tab = 'variables' | 'functions' | 'account';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('variables');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Innstillinger</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          { key: 'variables' as Tab, label: 'Variabler ($v)' },
          { key: 'functions' as Tab, label: 'Funksjoner ($u)' },
          { key: 'account' as Tab, label: 'Konto' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'variables' && <VariablesTab />}
      {activeTab === 'functions' && <FunctionsTab />}
      {activeTab === 'account' && <AccountTab />}
    </div>
  );
}

// ── Variables Tab ──────────────────────────────────────

function VariablesTab() {
  const [variables, setVariables] = useState<AccountVariable[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ key: '', value: '', isSecret: false });

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const accountId = process.env.NEXT_PUBLIC_ACCOUNT_ID ?? 'demo-account';

  useEffect(() => {
    loadVars();
  }, []);

  async function loadVars() {
    try {
      const res = await fetch(`${apiBase}/api/accounts/${accountId}/variables`);
      if (res.ok) setVariables(await res.json());
    } catch { /* ignore */ }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(form.value);
      } catch {
        parsedValue = form.value;
      }
      const res = await fetch(`${apiBase}/api/accounts/${accountId}/variables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: form.key, valueJson: parsedValue, isSecret: form.isSecret }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ key: '', value: '', isSecret: false });
        loadVars();
      }
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    if (!confirm('Slett variabelen?')) return;
    await fetch(`${apiBase}/api/accounts/${accountId}/variables/${id}`, { method: 'DELETE' });
    loadVars();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Globale variabler ($v)</h2>
          <p className="text-sm text-gray-500">
            Variabler tilgjengelig i alle arbeidsflyter som <code className="bg-gray-100 px-1 rounded">$v.nokkel</code>
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          {showForm ? 'Avbryt' : 'Ny variabel'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nokkel</label>
              <input
                type="text"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                placeholder="f.eks. api_key"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verdi (JSON eller tekst)</label>
              <input
                type={form.isSecret ? 'password' : 'text'}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                placeholder='f.eks. "min-verdi" eller {"a": 1}'
                required
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isSecret}
                  onChange={(e) => setForm({ ...form, isSecret: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Hemmelighet
              </label>
              <button
                type="submit"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                Lagre
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {variables.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            Ingen variabler opprettet enna.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-3">Nokkel</th>
                <th className="px-6 py-3">Verdi</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {variables.map((v) => (
                <tr key={v.id}>
                  <td className="px-6 py-3 text-sm font-mono font-medium">{v.key}</td>
                  <td className="px-6 py-3 text-sm font-mono text-gray-600 max-w-xs truncate">
                    {v.valueJson}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {v.isSecret ? (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">Hemmelighet</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">Offentlig</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Slett
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Functions Tab ──────────────────────────────────────

function FunctionsTab() {
  const [functions, setFunctions] = useState<AccountFunction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ functionName: '', jsCode: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const accountId = process.env.NEXT_PUBLIC_ACCOUNT_ID ?? 'demo-account';

  useEffect(() => {
    loadFns();
  }, []);

  async function loadFns() {
    try {
      const res = await fetch(`${apiBase}/api/accounts/${accountId}/functions`);
      if (res.ok) setFunctions(await res.json());
    } catch { /* ignore */ }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const url = editingId
      ? `${apiBase}/api/accounts/${accountId}/functions/${editingId}`
      : `${apiBase}/api/accounts/${accountId}/functions`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        setForm({ functionName: '', jsCode: '', description: '' });
        loadFns();
      }
    } catch { /* ignore */ }
  }

  function handleEdit(fn: AccountFunction) {
    setForm({ functionName: fn.functionName, jsCode: fn.jsCode, description: fn.description });
    setEditingId(fn.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Slett funksjonen?')) return;
    await fetch(`${apiBase}/api/accounts/${accountId}/functions/${id}`, { method: 'DELETE' });
    loadFns();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Egendefinerte funksjoner ($u)</h2>
          <p className="text-sm text-gray-500">
            Gjenbrukbare JavaScript-funksjoner tilgjengelig som <code className="bg-gray-100 px-1 rounded">$u.funksjonsnavn()</code>
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setForm({ functionName: '', jsCode: '', description: '' });
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          {showForm ? 'Avbryt' : 'Ny funksjon'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Funksjonsnavn</label>
                <input
                  type="text"
                  value={form.functionName}
                  onChange={(e) => setForm({ ...form, functionName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="f.eks. calculateVat"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="Hva funksjonen gjor"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">JavaScript-kode</label>
              <textarea
                value={form.jsCode}
                onChange={(e) => setForm({ ...form, jsCode: e.target.value })}
                className="w-full h-40 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500 bg-gray-50"
                placeholder="return function(amount, rate) { return amount * rate / 100; }"
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                {editingId ? 'Oppdater' : 'Opprett'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {functions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            Ingen egendefinerte funksjoner opprettet enna.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {functions.map((fn) => (
              <div key={fn.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <code className="text-sm font-semibold text-primary-700">$u.{fn.functionName}()</code>
                    {fn.description && (
                      <span className="text-xs text-gray-500 ml-2">{fn.description}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(fn)}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Rediger
                    </button>
                    <button
                      onClick={() => handleDelete(fn.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Slett
                    </button>
                  </div>
                </div>
                <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">{fn.jsCode}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Account Tab ────────────────────────────────────────

function AccountTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Kontoinformasjon</h2>
        <p className="text-sm text-gray-500 mb-4">
          Administrer din organisasjon og teammedlemmer.
        </p>
        <dl className="space-y-3">
          <div className="flex justify-between text-sm">
            <dt className="text-gray-500">Konto-ID</dt>
            <dd className="font-mono text-gray-700">{process.env.NEXT_PUBLIC_ACCOUNT_ID ?? 'demo-account'}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Tidsplanmaler</h2>
        <p className="text-sm text-gray-500 mb-4">
          Vanlige cron-uttrykk som kan brukes i arbeidsflyter:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100">
                <th className="pb-2 font-medium text-gray-700">Beskrivelse</th>
                <th className="pb-2 font-medium text-gray-700">Cron-uttrykk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { label: 'Hvert 15. minutt', cron: '*/15 * * * *' },
                { label: 'Hver time', cron: '0 * * * *' },
                { label: 'Hver 6. time', cron: '0 */6 * * *' },
                { label: 'Daglig kl. 02:00', cron: '0 2 * * *' },
                { label: 'Daglig kl. 08:00', cron: '0 8 * * *' },
                { label: 'Ukentlig (mandag kl. 06:00)', cron: '0 6 * * 1' },
                { label: 'Manedlig (1. dag kl. 03:00)', cron: '0 3 1 * *' },
              ].map((t) => (
                <tr key={t.cron}>
                  <td className="py-2 text-gray-600">{t.label}</td>
                  <td className="py-2">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{t.cron}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
