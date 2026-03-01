interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Aktiv' },
  success: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Vellykket' },
  running: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Kjører' },
  paused: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Pauset' },
  partial: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Delvis' },
  error: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Feil' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Feilet' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
