import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePharmacyData } from '../../pages/pharmacist/hooks/usePharmacyData';
import { roleLabels, navItems } from './navConfig';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import PageHeader from '../../pages/pharmacist/components/dashboard/PageHeader';
import StatsWidgets from '../../pages/pharmacist/components/dashboard/StatsWidgets';
import PrescriptionQueue from '../../pages/pharmacist/components/dashboard/PrescriptionQueue';
import PatientConversations from '../../pages/pharmacist/components/dashboard/PatientConversations';
import PickupVerification from '../../pages/pharmacist/components/dashboard/PickupVerification';
import DrugAlerts from '../../pages/pharmacist/components/dashboard/DrugAlerts';
import PrescriptionsContent from '../../pages/pharmacist/components/prescriptions/PrescriptionsContent';
import MessagesContent from '../../pages/pharmacist/components/messages/MessagesContent';
import OrderHistoryContent from '../../pages/pharmacist/components/orderHistory/OrderHistoryContent';
import InventoryContent from '../../pages/pharmacist/components/inventory/InventoryContent';
import SettingsView from '../../components/SettingsView';
import { useGlobalNotifications } from '../../hooks/useGlobalNotifications';

export default function PageLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setNavigateTo, setGlobalSearchQuery, pharmacyName: contextPharmacyName } = usePharmacyData() || {};
  const { notifications, unreadCount } = useGlobalNotifications();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');

  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const sidebarWidth = sidebarCollapsed ? 80 : 260;
  const desktopPaddingLeft = 20 + sidebarWidth + 20;

  useEffect(() => {
    if (setNavigateTo) {
      setNavigateTo(() => (pageKey) => setActivePage(pageKey));
    }
  }, [setNavigateTo]);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  };

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleSearch = useCallback((query) => {
    if (query && query.trim()) {
      if (setGlobalSearchQuery) setGlobalSearchQuery(query.trim());
      setActivePage('prescriptions');
    }
  }, [setGlobalSearchQuery]);

  const userRole = user?.role || 'pharmacist';
  const currentNavItems = navItems[userRole] || navItems.pharmacist;
  const userFullName = user?.full_name || user?.name || '';
  const userInitials = userFullName
    ? userFullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '';
  const userName = userFullName;
  const userPharmacyName = user?.pharmacy_name || contextPharmacyName || '';
  const userLicense = user?.license || '';

  const badgeItems = currentNavItems.map(item => {
    if (item.pageKey === 'messages' && unreadCount > 0) {
      return { ...item, badge: `${unreadCount}` };
    }
    return item;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        activePage={activePage}
        onNavigate={setActivePage}
        onProfileClick={() => setActivePage('settings')}
        onLogout={handleLogout}
        navItems={badgeItems}
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
            onProfileClick={() => setActivePage('settings')}
            user={user}
            roleLabels={roleLabels}
            onSearch={handleSearch}
            notifications={notifications}
          />

          <main className="flex-1 px-4 md:px-6 mt-4">
            <div className="max-w-7xl mx-auto space-y-5">
              <PageHeader activePage={activePage} pharmacyName={userPharmacyName} pharmacistName={userName} />

              {activePage === 'dashboard' && (
                <>
                  <StatsWidgets />

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 space-y-5">
                      <PrescriptionQueue />
                      <PatientConversations />
                    </div>

                    <div className="space-y-5">
                      <PickupVerification />
                      <DrugAlerts />
                    </div>
                  </div>
                </>
              )}

              {activePage === 'prescriptions' && (
                <PrescriptionsContent />
              )}

              {activePage === 'messages' && (
                <MessagesContent />
              )}

              {activePage === 'order-history' && (
                <OrderHistoryContent />
              )}

              {activePage === 'inventory' && (
                <InventoryContent />
              )}

              {activePage === 'settings' && (
                <SettingsView sidebarItems={currentNavItems} showPharmacistSettings={true} />
              )}
            </div>
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
}
