import { FileText, Clock, CheckCircle } from 'lucide-react';

export default function SummaryCards({ stats }) {
  const cards = [
    {
      label: 'Total Prescriptions Today',
      valueKey: 'totalToday',
      icon: FileText,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-l-blue-500',
    },
    {
      label: 'Pending Verification',
      valueKey: 'pendingVerification',
      icon: Clock,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      borderColor: 'border-l-amber-500',
    },
    {
      label: 'Approved & Ready',
      valueKey: 'approvedReady',
      icon: CheckCircle,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      borderColor: 'border-l-emerald-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = stats[card.valueKey] ?? 0;

        return (
          <div
            key={card.valueKey}
            className={`bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${card.borderColor} p-5`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {String(value).padStart(2, '0')}
                </p>
                <p className="text-sm text-gray-500 mt-1">{card.label}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.iconBg}`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
