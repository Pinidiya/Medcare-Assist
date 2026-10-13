import { useState } from 'react';
import { Bell, Menu, X, BadgeCheck } from 'lucide-react';
import logo from '../../assets/logo.png';

export default function Header({ sidebarCollapsed, mobileOpen, isDesktop = true, onToggleSidebar, onProfileClick, user, roleLabels = {}, headerBadge, notifications = [], onSearch }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  
  const renderToggleIcon = () => {
    if (isDesktop) return sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />;
    return mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />;
  };

  return (
    <header className="bg-[#EDF5FF] px-4 md:px-6 relative rounded-2xl overflow-visible shadow-sm" style={{ height: 73 }}>
      {/* Mobile Search Overlay Removed */}

      <div className="flex items-center justify-between h-full">
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-[#111C2D] hover:bg-black/5 rounded-full cursor-pointer transition-colors"
            title="Toggle sidebar"
          >
            {renderToggleIcon()}
          </button>

          <div 
            className="relative shrink-0 transition-all duration-300" 
            style={{ width: isDesktop ? 105 : 80, height: isDesktop ? 105 : 80, marginTop: isDesktop ? -8 : -2 }}
          >
            <img
              src={logo}
              alt="MedCare Assist"
              className="object-contain w-full h-full"
            />
          </div>
        </div>

        <div className="flex-1"></div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            {headerBadge && <div>{headerBadge}</div>}
          </div>

          {user?.role !== 'stock_manager' && (
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-[#111C2D] hover:bg-black/5 rounded-full cursor-pointer transition-colors"
              >
                <Bell className="w-4.5 h-4.5" strokeWidth={1.8} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1.5 w-2.5 h-2.5 bg-[#DC2626] rounded-full border-2 border-[#EDF5FF]" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
                    {notifications.length > 0 && (
                      <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {notifications.length} New
                      </span>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? notifications.map((notif, idx) => (
                      <div key={idx} className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                          <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                        </div>
                        <p className="text-xs text-gray-500 ml-4">{notif.body}</p>
                      </div>
                    )) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm font-semibold text-gray-400">No new notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="w-px h-8 bg-[#E2E8F0] hidden sm:block" />

          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-[13px] text-[#111C2D] font-bold">
                {user?.full_name?.split(' ')[0] || 'User'}
              </p>
              <p className="text-[11px] text-[#64748B]">
                {roleLabels[user?.role] || 'Patient'}
              </p>
            </div>
            <div
              className="w-10 h-10 bg-[#1A73E8] rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 border-2"
              style={{ borderColor: '#DBE1FF' }}
            >
              {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
