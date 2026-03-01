'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';
import type { AccountWorkflow } from '@/lib/api';

export default function MyWorkflowsPage() {
  const [workflows, setWorkflows] = useState<AccountWorkflow[]>([]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
  const accountId = process.env.NEXT_PUBLIC_ACCOUNT_ID ?? 'demo-account';

  useEffect(() => {
    fetch(`${apiBase}/api/accounts/${accountId}/workflows`)
      .then((r) => r.ok ? r.json() : [])
      .then(setWorkflows)
      .catch(() => {});
  }, [apiBase, accountId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mine arbeidsflyter</h1>
          <p className="text-gray-500 mt-1">Administrer dine aktive integrasjoner.</p>
        </div>
        <Link
          href="/workflows"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Legg til ny
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {workflows.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <p className="mb-2">Du har ingen aktive arbeidsflyter enna.</p>
            <Link
              href="/workflows"
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Utforsk tilgjengelige arbeidsflyter
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {workflows.map((aw) => (
              <Link
                key={aw.id}
                href={`/my-workflows/${aw.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{aw.workflow?.name}</p>
                  <p className="text-sm text-gray-500">
                    {aw.workflow?.sourceIntegration?.name} &rarr; {aw.workflow?.targetIntegration?.name}
                    {' \u00b7 '}
                    {aw.scheduleCronExpression === 'manual' ? 'Manuell' : aw.scheduleCronExpression}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={aw.isActive ? 'active' : 'paused'} />
                  {aw.lastRunAt && (
                    <span className="text-xs text-gray-400">
                      Sist: {new Date(aw.lastRunAt).toLocaleString('nb-NO')}
                    </span>
                  )}
                  {aw.workflowRuns && aw.workflowRuns.length > 0 && (
                    <StatusBadge status={aw.workflowRuns[0].status} />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
