import { Clock, CheckCircle, XCircle } from 'lucide-react';

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-600/20',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-600/20',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-600/20',
  },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${config.bg} ${config.text} ${config.ring}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
