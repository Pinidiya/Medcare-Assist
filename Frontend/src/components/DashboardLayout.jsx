import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';
import Footer from './layout/Footer';
import { useAuth } from '../context/AuthContext';
import { useGlobalNotifications } from '../hooks/useGlobalNotifications';

export default function DashboardLayout({ children, sidebarItems = [], notifications = [], headerBadge, colorScheme = 'blue', isModern = true, title = 'Dashboard' }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const { user, logout } = useAuth();
  const { notifications: globalNotifs, unreadCount } = useGlobalNotifications();

  // merge notifications
  const allNotifications = [...notifications, ...globalNotifs];
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const roleLabels = {
    admin: 'Administrator',
    pharmacy_owner: 'Pharmacy Owner',
    pharmacist: 'Pharmacist',
    stock_manager: 'Stock Manager',
    patient: 'Patient',
    superadmin: 'Super Administrator',
  };

  const sidebarWidth = sidebarCollapsed ? 80 : 260;
  const desktopPaddingLeft = 20 + sidebarWidth + 20;

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const formattedNavItems = sidebarItems.map(item => {
    let base = {
      ...item,
      pageKey: item.pageKey || item.label.toLowerCase().replace(/\s+/g, '-'),
    };
    if (base.pageKey === 'messages' && unreadCount > 0) {
      base.badge = `${unreadCount}`;
    }
    return base;
  });

  const activeItem = formattedNavItems.find(item => 
    location.pathname === item.path || (item.path && location.pathname.startsWith(item.path) && item.path !== '/')
  );
  
  const activePage = activeItem?.pageKey || 'dashboard';
  const activeItemLabel = activeItem?.label || title;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        activePage={activePage}
        onNavigate={(pageKey) => {
          const item = formattedNavItems.find(i => i.pageKey === pageKey);
          if (item?.path) navigate(item.path);
          setMobileSidebarOpen(false);
        }}
        onProfileClick={() => navigate(`/${user?.role}/settings`)}
        onLogout={() => {
          logout();
          navigate('/login');
        }}
        navItems={formattedNavItems}
        user={user}
        roleLabels={roleLabels}
      />

      <div
        className="transition-all duration-300"
        style={{ paddingLeft: isDesktop ? desktopPaddingLeft : 0 }}
      >
        <div className="min-h-screen flex flex-col pr-3 pt-3 pb-3 md:pr-5 md:pt-5 md:pb-5">
          <Header
            sidebarCollapsed={sidebarCollapsed}
            mobileOpen={mobileSidebarOpen}
            isDesktop={isDesktop}
            onToggleSidebar={handleToggleSidebar}
            onProfileClick={() => navigate(`/${user?.role}/settings`)}
            user={user}
            roleLabels={roleLabels}
            headerBadge={headerBadge}
            notifications={allNotifications}
          />

          <main className="flex-1 mt-4 pb-16 px-4 md:px-6">
            {/* Breadcrumbs */}
            <div className="mb-6 flex items-center text-[13px] text-[#64748B]">
              <span>Home</span>
              <span className="mx-2">›</span>
              <span className="text-[#1A73E8] font-semibold">{activeItemLabel}</span>
            </div>
            
            {children}
          </main>

          {!['patient', 'admin', 'superadmin', 'pharmacy_owner'].includes(user?.role) && <Footer />}
        </div>
      </div>
    </div>
  );
}
