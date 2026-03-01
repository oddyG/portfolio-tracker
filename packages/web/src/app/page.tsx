'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';
import type { Integration, SyncRunStats } from '@/lib/api';

export default function DashboardPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [stats, setStats] = useState<SyncRunStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

    Promise.all([
      fetch(`${apiBase}/api/integrations`).then((r) => r.ok ? r.json() : []),
      fetch(`${apiBase}/api/sync-runs/stats/overview`).then((r) => r.ok ? r.json() : null),
    ])
      .then(([intData, statsData]) => {
        setIntegrations(intData);
        setStats(statsData);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Oversikt</h1>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            Kunne ikke koble til API-serveren. Sjekk at backend kjører på port 3001.
          </p>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Aktive integrasjoner"
          value={integrations.filter((i) => i.status === 'active').length}
          color="blue"
        />
        <StatCard
          label="Vellykkede kjøringer"
          value={stats?.success ?? 0}
          color="green"
        />
        <StatCard
          label="Feilede kjøringer"
          value={stats?.failed ?? 0}
          color="red"
        />
        <StatCard
          label="Suksessrate"
          value={`${stats?.successRate ?? 0}%`}
          color="purple"
        />
      </div>

      {/* Integrations overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Integrasjoner</h2>
          <Link
            href="/integrations"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Se alle
          </Link>
        </div>

        {integrations.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p className="mb-2">Ingen integrasjoner konfigurert ennå.</p>
            <Link
              href="/integrations"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Opprett din første integrasjon
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {integrations.map((integration) => (
              <Link
                key={integration.id}
                href={`/integrations/${integration.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{integration.name}</p>
                    <p className="text-sm text-gray-500">
                      {integration.sourceConnector?.name} → {integration.destinationConnector?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={integration.status} />
                  {integration.lastRunAt && (
                    <span className="text-xs text-gray-400">
                      Sist kjørt: {new Date(integration.lastRunAt).toLocaleString('nb-NO')}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent runs */}
      {stats?.recentRuns && stats.recentRuns.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Siste kjøringer</h2>
            <Link
              href="/logs"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Se alle
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recentRuns.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between px-6 py-3"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {run.integration?.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-3">
                    {new Date(run.startedAt).toLocaleString('nb-NO')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {run.recordsProcessed} poster
                  </span>
                  <StatusBadge status={run.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: 'blue' | 'green' | 'red' | 'purple';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}
