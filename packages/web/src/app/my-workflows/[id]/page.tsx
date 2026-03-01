'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';
import type { AccountWorkflow, WorkflowRun, WorkflowRunResult } from '@/lib/api';

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [aw, setAw] = useState<AccountWorkflow | null>(null);
  const [jsCode, setJsCode] = useState('');
  const [schedule, setSchedule] = useState('manual');
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<WorkflowRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'logs'>('editor');

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const accountId = process.env.NEXT_PUBLIC_ACCOUNT_ID ?? 'demo-account';

  const loadData = useCallback(() => {
    fetch(`${apiBase}/api/accounts/${accountId}/workflows/${id}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('Ikke funnet')))
      .then((data: AccountWorkflow) => {
        setAw(data);
        setJsCode(data.customJsLogic ?? data.workflow?.defaultJsLogic ?? '');
        setSchedule(data.scheduleCronExpression);
      })
      .catch((err: Error) => setError(err.message));
  }, [apiBase, accountId, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/api/accounts/${accountId}/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customJsLogic: jsCode,
          scheduleCronExpression: schedule,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAw(data);
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handleToggle() {
    if (!aw) return;
    const res = await fetch(`${apiBase}/api/accounts/${accountId}/workflows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !aw.isActive }),
    });
    if (res.ok) setAw(await res.json());
  }

  async function handleRun() {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch(`${apiBase}/api/accounts/${accountId}/workflows/${id}/run`, {
        method: 'POST',
      });
      if (res.ok) {
        const result: WorkflowRunResult = await res.json();
        setRunResult(result);
        loadData(); // Refresh to get new run in logs
      }
    } catch { /* ignore */ }
    setRunning(false);
  }

  async function handleDelete() {
    if (!confirm('Er du sikker pa at du vil slette denne arbeidsflyten?')) return;
    await fetch(`${apiBase}/api/accounts/${accountId}/workflows/${id}`, { method: 'DELETE' });
    router.push('/my-workflows');
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <Link href="/my-workflows" className="text-primary-600 text-sm mt-2 inline-block">
          Tilbake til mine arbeidsflyter
        </Link>
      </div>
    );
  }

  if (!aw) {
    return <div className="text-center py-12 text-gray-500">Laster...</div>;
  }

  const runs = aw.workflowRuns ?? [];

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/my-workflows" className="hover:text-gray-700">Mine arbeidsflyter</Link>
        <span>/</span>
        <span className="text-gray-900">{aw.workflow?.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{aw.workflow?.name}</h1>
          <p className="text-gray-500 mt-1">
            {aw.workflow?.sourceIntegration?.name} &rarr; {aw.workflow?.targetIntegration?.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={aw.isActive ? 'active' : 'paused'} />
          <button
            onClick={handleToggle}
            className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 font-medium"
          >
            {aw.isActive ? 'Deaktiver' : 'Aktiver'}
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="text-sm bg-primary-600 text-white px-4 py-1.5 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
          >
            {running ? 'Kjorer...' : 'Kjor na'}
          </button>
          <button
            onClick={handleDelete}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Slett
          </button>
        </div>
      </div>

      {/* Run result */}
      {runResult && (
        <div className={`mb-6 rounded-lg border p-4 ${runResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">
              {runResult.success ? 'Kjoring vellykket' : 'Kjoring feilet'}
            </h3>
            <button onClick={() => setRunResult(null)} className="text-xs text-gray-500 hover:text-gray-700">
              Lukk
            </button>
          </div>
          {runResult.logs.length > 0 && (
            <pre className="text-xs bg-white/50 p-2 rounded mt-2 overflow-x-auto">
              {runResult.logs.join('\n')}
            </pre>
          )}
          {runResult.error && (
            <pre className="text-xs text-red-700 bg-white/50 p-2 rounded mt-2">{runResult.error}</pre>
          )}
          {runResult.returnValue != null && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Returverdi:</p>
              <pre className="text-xs bg-white/50 p-2 rounded overflow-x-auto">
                {JSON.stringify(runResult.returnValue, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Schedule config */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Tidsplan:</label>
          <select
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="manual">Manuell</option>
            <option value="*/15 * * * *">Hvert 15. minutt</option>
            <option value="0 * * * *">Hver time</option>
            <option value="0 */6 * * *">Hver 6. time</option>
            <option value="0 0 * * *">Daglig (midnatt)</option>
            <option value="0 8 * * *">Daglig (kl. 08:00)</option>
            <option value="0 0 * * 1">Ukentlig (mandag)</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
            activeTab === 'editor'
              ? 'bg-white border border-b-white border-gray-200 text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          JavaScript-logikk
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
            activeTab === 'logs'
              ? 'bg-white border border-b-white border-gray-200 text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Kjoringer ({runs.length})
        </button>
      </div>

      {/* Code editor */}
      {activeTab === 'editor' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Rediger JavaScript-logikken for denne arbeidsflyten.
              Bruk <code className="bg-gray-100 px-1 rounded">$v</code> for variabler og <code className="bg-gray-100 px-1 rounded">$u</code> for hjelpefunksjoner.
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Lagrer...' : 'Lagre'}
            </button>
          </div>
          <textarea
            value={jsCode}
            onChange={(e) => setJsCode(e.target.value)}
            className="w-full h-96 p-4 font-mono text-sm border-0 focus:ring-0 resize-none bg-gray-50"
            spellCheck={false}
            placeholder="// Skriv din JavaScript-logikk her..."
          />
          <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-400">
            Tilgjengelige objekter: $v (globale variabler), $u (hjelpefunksjoner: ShortDate, AddDays, FormatNumber, Now, UUID, Round, Upper, Lower, Trim, ParseJSON, ToJSON)
          </div>
        </div>
      )}

      {/* Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {runs.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              Ingen kjoringer registrert enna.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-3">Startet</th>
                  <th className="px-6 py-3">Fullfort</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Logg</th>
                  <th className="px-6 py-3">Feil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {runs.map((run: WorkflowRun) => (
                  <tr key={run.id}>
                    <td className="px-6 py-3 text-sm">{new Date(run.startTime).toLocaleString('nb-NO')}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {run.endTime ? new Date(run.endTime).toLocaleString('nb-NO') : '\u2014'}
                    </td>
                    <td className="px-6 py-3"><StatusBadge status={run.status} /></td>
                    <td className="px-6 py-3 text-xs text-gray-600 max-w-xs truncate">
                      {run.logOutput || '\u2014'}
                    </td>
                    <td className="px-6 py-3 text-xs text-red-600 max-w-xs truncate">
                      {run.errorMessage || '\u2014'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
