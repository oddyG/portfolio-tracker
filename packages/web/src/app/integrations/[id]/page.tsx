'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';
import type { Integration, SyncRun } from '@/lib/api';

export default function IntegrationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  useEffect(() => {
    fetch(`${apiBase}/api/integrations/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Ikke funnet'))))
      .then(setIntegration)
      .catch((err) => setError(err.message));
  }, [id, apiBase]);

  async function handleSync() {
    await fetch(`${apiBase}/api/integrations/${id}/sync`, { method: 'POST' });
    // Reload
    const res = await fetch(`${apiBase}/api/integrations/${id}`);
    if (res.ok) setIntegration(await res.json());
  }

  async function toggleStatus() {
    if (!integration) return;
    const newStatus = integration.status === 'active' ? 'paused' : 'active';
    const res = await fetch(`${apiBase}/api/integrations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) setIntegration(await res.json());
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <Link href="/integrations" className="text-primary-600 text-sm mt-2 inline-block">
          Tilbake til integrasjoner
        </Link>
      </div>
    );
  }

  if (!integration) {
    return <div className="text-center py-12 text-gray-500">Laster...</div>;
  }

  const mappings = safeParseJson(integration.fieldMappings);
  const rules = safeParseJson(integration.transformRules);
  const syncRuns = integration.syncRuns ?? [];

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/integrations" className="hover:text-gray-700">Integrasjoner</Link>
        <span>/</span>
        <span className="text-gray-900">{integration.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{integration.name}</h1>
          <p className="text-gray-500 mt-1">
            {integration.sourceConnector?.name} → {integration.destinationConnector?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={integration.status} />
          <button
            onClick={toggleStatus}
            className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-medium"
          >
            {integration.status === 'active' ? 'Pause' : 'Aktiver'}
          </button>
          <button
            onClick={handleSync}
            className="text-sm bg-primary-600 text-white px-4 py-1.5 rounded-lg hover:bg-primary-700 font-medium"
          >
            Kjør synkronisering
          </button>
        </div>
      </div>

      {/* Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-3">Konfigurasjon</h2>
          <dl className="space-y-2">
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Tidsplan</dt>
              <dd className="font-medium">{integration.schedule === 'manual' ? 'Manuell' : integration.schedule}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Feilhåndtering</dt>
              <dd className="font-medium capitalize">{integration.errorHandling}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-gray-500">Opprettet</dt>
              <dd className="font-medium">{new Date(integration.createdAt).toLocaleDateString('nb-NO')}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-3">Feltmapping</h2>
          {mappings.length === 0 ? (
            <p className="text-sm text-gray-500">Ingen feltmapping konfigurert.</p>
          ) : (
            <div className="space-y-1">
              {mappings.map((m: Record<string, string>, i: number) => (
                <div key={i} className="text-sm flex items-center gap-2">
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                    {m.sourceField ?? m.source}
                  </code>
                  <span className="text-gray-400">→</span>
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                    {m.destinationField ?? m.dest}
                  </code>
                </div>
              ))}
            </div>
          )}

          {rules.length > 0 && (
            <>
              <h3 className="text-sm font-medium mt-4 mb-2">Transformasjonsregler</h3>
              <div className="space-y-1">
                {rules.map((r: Record<string, string>, i: number) => (
                  <div key={i} className="text-xs bg-gray-50 p-2 rounded">
                    <span className="text-gray-500">Hvis</span>{' '}
                    <code>{r.condition}</code>{' '}
                    <span className="text-gray-500">→</span>{' '}
                    <code>{r.action}</code>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sync runs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Kjøringshistorikk</h2>
        </div>
        {syncRuns.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            Ingen kjøringer registrert ennå.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-3">Startet</th>
                <th className="px-6 py-3">Fullført</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Prosessert</th>
                <th className="px-6 py-3">Opprettet</th>
                <th className="px-6 py-3">Feilet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {syncRuns.map((run: SyncRun) => (
                <tr key={run.id}>
                  <td className="px-6 py-3 text-sm">{new Date(run.startedAt).toLocaleString('nb-NO')}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {run.completedAt ? new Date(run.completedAt).toLocaleString('nb-NO') : '—'}
                  </td>
                  <td className="px-6 py-3"><StatusBadge status={run.status} /></td>
                  <td className="px-6 py-3 text-sm">{run.recordsProcessed}</td>
                  <td className="px-6 py-3 text-sm">{run.recordsCreated}</td>
                  <td className="px-6 py-3 text-sm text-red-600">{run.recordsFailed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function safeParseJson(str: string): Record<string, string>[] {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
