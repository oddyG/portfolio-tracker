'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';
import type { Integration, ConnectorSummary } from '@/lib/api';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sourceConnectorId: '',
    destinationConnectorId: '',
    schedule: 'manual',
    errorHandling: 'skip',
  });

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [intRes, connRes] = await Promise.all([
        fetch(`${apiBase}/api/integrations`),
        fetch(`${apiBase}/api/connectors`),
      ]);
      if (intRes.ok) setIntegrations(await intRes.json());
      if (connRes.ok) setConnectors(await connRes.json());
    } catch { /* ignore */ }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBase}/api/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: '', sourceConnectorId: '', destinationConnectorId: '', schedule: 'manual', errorHandling: 'skip' });
        loadData();
      }
    } catch { /* ignore */ }
  }

  async function handleSync(id: string) {
    try {
      await fetch(`${apiBase}/api/integrations/${id}/sync`, { method: 'POST' });
      loadData();
    } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integrasjoner</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          {showForm ? 'Avbryt' : 'Ny integrasjon'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6"
        >
          <h2 className="text-lg font-semibold mb-4">Opprett ny integrasjon</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Navn</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="F.eks. Shopify → Tripletex ordresynk"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kilde</label>
              <select
                value={form.sourceConnectorId}
                onChange={(e) => setForm({ ...form, sourceConnectorId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Velg kilde...</option>
                {connectors
                  .filter((c) => c.type === 'source' || c.type === 'both')
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mål</label>
              <select
                value={form.destinationConnectorId}
                onChange={(e) => setForm({ ...form, destinationConnectorId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                required
              >
                <option value="">Velg mål...</option>
                {connectors
                  .filter((c) => c.type === 'destination' || c.type === 'both')
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tidsplan</label>
              <select
                value={form.schedule}
                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="manual">Manuell</option>
                <option value="0 */6 * * *">Hver 6. time</option>
                <option value="0 0 * * *">Daglig (midnatt)</option>
                <option value="0 8 * * *">Daglig (kl. 08:00)</option>
                <option value="0 0 * * 1">Ukentlig (mandag)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feilhåndtering</label>
              <select
                value={form.errorHandling}
                onChange={(e) => setForm({ ...form, errorHandling: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="skip">Hopp over feil</option>
                <option value="retry">Prøv på nytt</option>
                <option value="halt">Stopp ved feil</option>
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
        {integrations.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Ingen integrasjoner opprettet ennå. Opprett koblinger først, deretter lag en integrasjon.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <Link href={`/integrations/${integration.id}`} className="flex-1">
                  <p className="font-medium text-gray-900">{integration.name}</p>
                  <p className="text-sm text-gray-500">
                    {integration.sourceConnector?.name} → {integration.destinationConnector?.name}
                    {' · '}
                    {integration.schedule === 'manual' ? 'Manuell' : integration.schedule}
                  </p>
                </Link>
                <div className="flex items-center gap-3">
                  <StatusBadge status={integration.status} />
                  <button
                    onClick={() => handleSync(integration.id)}
                    className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-gray-700 font-medium transition-colors"
                  >
                    Kjør nå
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
