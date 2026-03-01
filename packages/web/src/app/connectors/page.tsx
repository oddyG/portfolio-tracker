'use client';

import { useEffect, useState } from 'react';
import type { IntegrationCatalog } from '@/lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  regnskap: 'Regnskap',
  nettbutikk: 'Nettbutikk',
  betaling: 'Betaling',
  crm: 'CRM',
  faktura: 'Faktura',
  frakt: 'Frakt',
  erp: 'ERP',
};

export default function IntegrationsCatalogPage() {
  const [integrations, setIntegrations] = useState<IntegrationCatalog[]>([]);

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

  useEffect(() => {
    fetch(`${apiBase}/api/integrations`)
      .then((r) => r.ok ? r.json() : [])
      .then(setIntegrations)
      .catch(() => {});
  }, [apiBase]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Tilgjengelige systemer</h1>
      <p className="text-gray-500 mb-6">
        Oversikt over alle systemer som kan integreres via plattformen.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((int) => (
          <div key={int.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg font-bold text-gray-500">
                {int.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{int.name}</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                  {CATEGORY_LABELS[int.category] ?? int.category}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500">{int.description || 'Ingen beskrivelse.'}</p>
          </div>
        ))}
      </div>

      {integrations.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Ingen systemer tilgjengelig enna. Kjor seed-scriptet for a laste demodata.
        </div>
      )}
    </div>
  );
}
