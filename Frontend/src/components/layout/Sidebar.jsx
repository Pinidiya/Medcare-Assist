import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import logo from '../../assets/logo.png';

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, activePage, onNavigate, onProfileClick, onLogout, navItems = [], user, roleLabels = {} }) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-5 left-5 bottom-5 z-50 rounded-2xl bg-white
          shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all duration-300
          flex flex-col overflow-hidden
          ${collapsed ? 'w-20' : 'w-[260px]'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-[150%] lg:translate-x-0'}`}
      >
        <button
          onClick={onCloseMobile}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 lg:hidden transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className={`flex items-center ${collapsed ? 'justify-center pt-8 pb-6' : 'gap-3 px-5 pt-8 pb-6'}`}>
          <img src={logo} alt="Pharmasist" className="w-10 h-10 shrink-0 object-contain" />
          {!collapsed && (
            <div>
              <h2 style={{ fontFamily: '"Hanken Grotesk", sans-serif' }} className="text-[#0F172A] font-extrabold text-lg leading-tight">
                MedCare
              </h2>
              <p className="text-[#64748B] text-xs">{roleLabels[user?.role] || 'Dashboard'}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.pageKey;
            const isCollapsed = collapsed;
            return (
              <button
                key={item.label}
                onClick={() => {
                  onNavigate(item.pageKey);
                  if (mobileOpen) onCloseMobile();
                }}
                className={`w-full flex items-center rounded-xl text-sm font-medium
                  transition-all duration-300 relative group cursor-pointer
                  ${isActive
                    ? 'bg-[#1A73E8]/10 text-[#1A73E8]'
                    : 'text-[#64748B] hover:bg-gray-50 hover:text-[#0F172A]'
                  }
                  ${isCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'}`}
                title={isCollapsed ? item.label : undefined}
              >
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#1A73E8] rounded-r-full" />
                )}
                {isActive && isCollapsed && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#1A73E8] rounded-l-full" />
                )}
                <div className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : ''} group-hover:scale-110`}>
                  <Icon className="w-5 h-5" />
                </div>
                {!isCollapsed && (
                  <>
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto bg-[#DC2626] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {isCollapsed && item.badge && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#DC2626] border-2 border-white rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-5 pt-3 border-t border-gray-100">
          {collapsed ? (
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-10 h-10 rounded-full bg-[#1A73E8] flex items-center justify-center text-white font-bold text-sm"
                title="Profile"
              >
                {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
              </div>
              <button
                onClick={onLogout}
                className="w-full flex justify-center py-2.5 rounded-xl text-[#64748B] hover:bg-gray-50 hover:text-red-500 transition-all duration-300 cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <div
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left"
              >
                <div className="w-10 h-10 rounded-full bg-[#1A73E8] flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-[#0F172A] text-sm font-medium truncate">{user?.full_name || 'User'}</p>
                  <p className="text-[#64748B] text-xs truncate">{roleLabels[user?.role] || 'Patient'}</p>
                </div>
              </div>
              <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#64748B] hover:bg-gray-50 hover:text-red-500 transition-all duration-300 cursor-pointer">
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="truncate">Logout</span>
              </button>
            </>
          )}

          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center justify-center gap-2 py-2 mt-2 rounded-xl text-[#94A3B8] hover:bg-gray-50 hover:text-[#64748B] transition-all duration-300 text-xs cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
