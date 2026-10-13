
export function MessageAvatar({ initials, status, size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm';
  const statusColors = {
    urgent: 'ring-2 ring-red-400 ring-offset-2',
    pending: 'ring-2 ring-amber-400 ring-offset-2',
    replied: 'ring-2 ring-emerald-400 ring-offset-2',
    quoted: 'ring-2 ring-indigo-400 ring-offset-2',
    reserved: 'ring-2 ring-purple-400 ring-offset-2',
    completed: 'ring-2 ring-green-400 ring-offset-2',
    rejected: 'ring-2 ring-red-400 ring-offset-2',
    bill_generated: 'ring-2 ring-blue-400 ring-offset-2',
    paid: 'ring-2 ring-emerald-400 ring-offset-2',
    pending_pickup: 'ring-2 ring-cyan-400 ring-offset-2'};

  return (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-[#1A73E8] to-[#1557B0] flex items-center justify-center text-white font-bold shrink-0 ${statusColors[status] || ''}`}>
      {initials}
    </div>
  );
}

export default function MessageListItem({
  id,
  initials,
  status,
  name,
  time,
  orderId,
  snippet,
  unreadCount,
  statusStyle,
  statusLabel,
  isActive,
  onClick
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 cursor-pointer border ${
        isActive
          ? 'border-[#1A73E8] bg-blue-50/50 shadow-sm'
          : 'border-transparent hover:bg-gray-50 hover:border-gray-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <MessageAvatar initials={initials} status={status} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className={`text-sm ${unreadCount > 0 ? 'font-bold' : 'font-medium'} text-[#0F172A] truncate`}>{name}</span>
            <span className="text-[10px] text-[#94A3B8] whitespace-nowrap">{time}</span>
          </div>
          <div className="text-[11px] text-[#64748B] mb-1">Reservation #{orderId}</div>
          <div className="flex items-center justify-between">
            <p className={`text-xs truncate mr-2 ${unreadCount > 0 ? 'text-[#475569] font-medium' : 'text-[#64748B]'}`}>
              {snippet}
            </p>
            {unreadCount > 0 ? (
              <span className="flex items-center justify-center h-5 px-2 rounded-full bg-[#DC2626] text-white text-[10px] font-bold shrink-0 shadow-sm">
                {unreadCount} New
              </span>
            ) : (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${statusStyle}`}>
                {statusLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
