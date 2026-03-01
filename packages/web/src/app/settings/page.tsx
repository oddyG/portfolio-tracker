'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  );
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Innstillinger</h1>

      <div className="space-y-6">
        {/* API Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">API-konfigurasjon</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API-endepunkt
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => { setApiUrl(e.target.value); setSaved(false); }}
                className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL til backend API-serveren. Standard: http://localhost:3001
              </p>
            </div>
            <button
              onClick={() => setSaved(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              Lagre
            </button>
            {saved && (
              <span className="text-sm text-green-600 ml-3">Lagret (krever omstart av frontend)</span>
            )}
          </div>
        </div>

        {/* Schedule templates */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Tidsplanmaler</h2>
          <p className="text-sm text-gray-500 mb-4">
            Vanlige cron-uttrykk som kan brukes i integrasjoner:
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
                  { label: 'Månedlig (1. dag kl. 03:00)', cron: '0 3 1 * *' },
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

        {/* Error handling info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Feilhåndtering</h2>
          <div className="space-y-3">
            {[
              {
                mode: 'skip',
                title: 'Hopp over (skip)',
                desc: 'Poster som feiler hoppes over, resten synkroniseres.',
              },
              {
                mode: 'retry',
                title: 'Prøv på nytt (retry)',
                desc: 'Poster som feiler forsøkes på nytt opptil 3 ganger.',
              },
              {
                mode: 'halt',
                title: 'Stopp (halt)',
                desc: 'Synkroniseringen stopper helt ved første feil.',
              },
            ].map((item) => (
              <div key={item.mode} className="flex gap-3">
                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs h-fit mt-0.5">
                  {item.mode}
                </code>
                <div>
                  <p className="text-sm font-medium text-gray-700">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
