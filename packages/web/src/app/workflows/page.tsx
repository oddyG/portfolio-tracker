'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { WorkflowTemplate } from '@/lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  regnskap: 'Regnskap',
  nettbutikk: 'Nettbutikk',
  betaling: 'Betaling',
  crm: 'CRM',
  erp: 'ERP',
  faktura: 'Faktura',
  frakt: 'Frakt',
  sync: 'Synkronisering',
  transform: 'Transformasjon',
  notification: 'Varsling',
};

export default function WorkflowMarketplacePage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [filter, setFilter] = useState('');
  const [activating, setActivating] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const accountId = process.env.NEXT_PUBLIC_ACCOUNT_ID ?? 'demo-account';

  useEffect(() => {
    fetch(`${apiBase}/api/workflows`)
      .then((r) => r.ok ? r.json() : [])
      .then(setWorkflows)
      .catch(() => {});
  }, [apiBase]);

  const filtered = filter
    ? workflows.filter((w) =>
        w.category === filter ||
        w.sourceIntegration?.category === filter ||
        w.targetIntegration?.category === filter
      )
    : workflows;

  const categories = [...new Set(workflows.flatMap((w) => [
    w.sourceIntegration?.category,
    w.targetIntegration?.category,
  ].filter(Boolean)))];

  async function handleActivate(workflowId: string) {
    setActivating(workflowId);
    try {
      const res = await fetch(`${apiBase}/api/accounts/${accountId}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, scheduleCronExpression: 'manual' }),
      });
      if (res.ok) {
        const aw = await res.json();
        router.push(`/my-workflows/${aw.id}`);
      } else if (res.status === 409) {
        alert('Denne arbeidsflyten er allerede aktivert.');
      }
    } catch {
      alert('Kunne ikke aktivere arbeidsflyten.');
    }
    setActivating(null);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Arbeidsflyter</h1>
        <p className="text-gray-500 mt-1">
          Utforsk nokkelferdige integrasjoner. Klikk &quot;Aktiver&quot; for a ta en i bruk.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === ''
              ? 'bg-primary-100 text-primary-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Alle
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat!)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === cat
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {CATEGORY_LABELS[cat!] ?? cat}
          </button>
        ))}
      </div>

      {/* Workflow grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((wf) => (
          <div
            key={wf.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                  {wf.sourceIntegration?.name ?? 'Kilde'}
                </span>
                <span className="text-gray-400">&rarr;</span>
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                  {wf.targetIntegration?.name ?? 'Mal'}
                </span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{wf.name}</h3>
            <p className="text-sm text-gray-500 mb-4 flex-1">{wf.description || 'Ingen beskrivelse.'}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {CATEGORY_LABELS[wf.category] ?? wf.category}
              </span>
              <button
                onClick={() => handleActivate(wf.id)}
                disabled={activating === wf.id}
                className="bg-primary-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {activating === wf.id ? 'Aktiverer...' : 'Aktiver'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Ingen arbeidsflyter funnet.
        </div>
      )}
    </div>
  );
}
