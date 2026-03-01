'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/status-badge';
import type { WorkflowRun } from '@/lib/api';

export default function LogsPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const accountId = process.env.NEXT_PUBLIC_ACCOUNT_ID ?? 'demo-account';

  useEffect(() => {
    const query = filter ? `?status=${filter}` : '';
    fetch(`${apiBase}/api/accounts/${accountId}/runs${query}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRuns)
      .catch(() => {});
  }, [filter, apiBase, accountId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kjoringslogg</h1>
        <div className="flex gap-2">
          {['', 'success', 'failed', 'partial', 'running'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === '' ? 'Alle' : status === 'success' ? 'Vellykkede' : status === 'failed' ? 'Feilede' : status === 'partial' ? 'Delvise' : 'Kjorende'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {runs.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            Ingen kjoringer funnet.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-3">Arbeidsflyt</th>
                <th className="px-6 py-3">Startet</th>
                <th className="px-6 py-3">Varighet</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Feil</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {runs.map((run) => {
                const duration = run.endTime
                  ? Math.round(
                      (new Date(run.endTime).getTime() - new Date(run.startTime).getTime()) / 1000,
                    )
                  : null;

                return (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium">
                      {run.accountWorkflow?.workflow?.name ?? run.accountWorkflowId}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {new Date(run.startTime).toLocaleString('nb-NO')}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {duration !== null ? `${duration}s` : '\u2014'}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-6 py-3 text-sm text-red-600 max-w-xs truncate">
                      {run.errorMessage || '\u2014'}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => setSelectedRun(run)}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Detaljer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selectedRun && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Kjoringsdetaljer</h2>
              <button
                onClick={() => setSelectedRun(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                Lukk
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <StatusBadge status={selectedRun.status} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Arbeidsflyt</p>
                  <p className="font-medium text-sm">{selectedRun.accountWorkflow?.workflow?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Startet</p>
                  <p className="text-sm">{new Date(selectedRun.startTime).toLocaleString('nb-NO')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fullfort</p>
                  <p className="text-sm">{selectedRun.endTime ? new Date(selectedRun.endTime).toLocaleString('nb-NO') : '\u2014'}</p>
                </div>
              </div>

              {selectedRun.logOutput && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Kjoringslogg</p>
                  <pre className="bg-gray-50 text-gray-800 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                    {selectedRun.logOutput}
                  </pre>
                </div>
              )}

              {selectedRun.errorMessage && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Feilmelding</p>
                  <pre className="bg-red-50 text-red-800 text-xs p-3 rounded-lg overflow-x-auto">
                    {selectedRun.errorMessage}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
