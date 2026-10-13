import { usePharmacyData } from '../../hooks/usePharmacyData';
import { Users, Pill, Calendar, TrendingUp } from 'lucide-react';
import Card from '../../../../components/common/Card';

export default function StatsWidgets() {
  const { stats, navigateTo } = usePharmacyData();

  const handleCardClick = (key) => {
    if (!navigateTo) return;
    if (key === 'pendingReview') navigateTo('prescriptions');
    else if (key === 'unreadChats') navigateTo('messages');
    else if (key === 'todayTotal') navigateTo('order-history');
    else if (key === 'todayRevenue') navigateTo('order-history');
  };

  // Format rupees with commas
  const formatRs = (amount) => {
    const num = parseFloat(amount || 0);
    if (num >= 1000000) return `Rs. ${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `Rs. ${(num / 1000).toFixed(1)}K`;
    return `Rs. ${num.toFixed(2)}`;
  };

  const cards = [
    {
      key: 'pendingReview',
      label: 'Pending verification requests',
      value: String(stats.pendingReview ?? 0).padStart(2, '0'),
      icon: Users,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-500',
      borderColor: 'border-l-rose-400',
      isRevenue: false,
    },
    {
      key: 'readyForPickup',
      label: 'Ready for pickup',
      value: String(stats.readyForPickup ?? 0).padStart(2, '0'),
      icon: Pill,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      borderColor: 'border-l-emerald-400',
      isRevenue: false,
    },
    {
      key: 'todayTotal',
      label: 'Total today',
      value: String(stats.todayTotal ?? 0).padStart(2, '0'),
      icon: Calendar,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-500',
      borderColor: 'border-l-sky-400',
      isRevenue: false,
    },
    {
      key: 'todayRevenue',
      label: "Today's revenue",
      sublabel: stats.todayOrderCount > 0
        ? `${stats.todayOrderCount} order${stats.todayOrderCount > 1 ? 's' : ''} completed`
        : 'No completed orders yet',
      value: formatRs(stats.todayRevenue),
      icon: TrendingUp,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      borderColor: 'border-l-amber-400',
      isRevenue: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            onClick={() => handleCardClick(card.key)}
            className="cursor-pointer transition-all duration-300 hover:shadow-md hover:translate-y-[-2px]"
          >
            <Card className={`border-l-4 ${card.borderColor} h-full`} padding={false}>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    {card.isRevenue ? (
                      <>
                        <p className="text-2xl font-black text-gray-900 tracking-tight truncate">
                          {card.value}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 font-medium">{card.label}</p>
                        {card.sublabel && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{card.sublabel}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                      </>
                    )}
                  </div>
                  <div className={`p-2.5 rounded-xl ${card.iconBg} shrink-0 ml-2`}>
                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
