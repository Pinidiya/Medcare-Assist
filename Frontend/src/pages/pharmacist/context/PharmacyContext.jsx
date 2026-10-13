import { createContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  dashboardApi,
  inventoryApi,
  reservationApi} from '../../../services/pharmacistApi';
import { sharedApi } from '../../../services/sharedApi';

const PharmacyContext = createContext(null);

export { PharmacyContext };

export function PharmacyProvider({ children }) {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    pendingReview: 0,
    readyForPickup: 0,
    todayTotal: 0,
    unreadChats: 0,
    todayRevenue: 0,
    todayOrderCount: 0});
  const [prescriptions, setPrescriptions] = useState([]);
  const [pendingReservations, setPendingReservations] = useState([]);
  const [claimedReservations, setClaimedReservations] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [medicineStock, setMedicineStock] = useState([]);
  const [profile, setProfile] = useState(null);
  const [pharmacyName, setPharmacyName] = useState('');
  const [pharmacistName, setPharmacistName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [navigateTo, setNavigateTo] = useState(null);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [autoOpenOrderId, setAutoOpenOrderId] = useState(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const refreshDashboard = useCallback(async () => {
    if (!user) return;
    try {
      const [pendingData, profileData, unreadData, revenueData] = await Promise.all([
        dashboardApi.getPendingReservations(),
        sharedApi.getProfile(),
        sharedApi.getUnreadCounts().catch(() => ({ data: { total: 0 } })),
        dashboardApi.getTodayRevenue().catch(() => ({ today_revenue: 0, today_orders: 0 })),
      ]);

      const pending = pendingData.pending || [];
      const claimed = pendingData.claimed || [];
      setPendingReservations(pending);
      setClaimedReservations(claimed);

      const readyCount = claimed.filter(
        (r) => r.status === 'paid' || r.status === 'advance_paid' || r.status === 'pending_pickup'
      ).length;

      setStats({
        pendingReview: pending.length,
        readyForPickup: readyCount,
        todayTotal: pending.length + claimed.length,
        unreadChats: unreadData?.data?.total || 0,
        todayRevenue: revenueData?.today_revenue || 0,
        todayOrderCount: revenueData?.today_orders || 0});

      if (profileData?.data) {
        setProfile(profileData.data);
        setPharmacistName(profileData.data.full_name || '');
        updatePharmacyName(profileData.data);
      }
    } catch (e) {
      setError(e.message);
    }
  }, [user]);

  const updatePharmacyName = useCallback(async (profileData) => {
    try {
      const staffData = await dashboardApi.getOrders();
      if (staffData?.data?.[0]?.pharmacy_name) {
        setPharmacyName(staffData.data[0].pharmacy_name);
      } else {
        setPharmacyName(profileData?.pharmacy_name || 'Pharmacy');
      }
    } catch {
      setPharmacyName(profileData?.pharmacy_name || 'Pharmacy');
    }
  }, []);

  const refreshInventory = useCallback(async () => {
    try {
      const [stockData, medicineData] = await Promise.all([
        inventoryApi.getStock(),
        inventoryApi.getMedicines(),
      ]);
      setInventoryItems(stockData.data || []);
      setMedicineStock(medicineData.data || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const data = await dashboardApi.getPendingReservations();
      const allReservations = [...(data.pending || []), ...(data.claimed || [])];
      const chatList = await Promise.all(
        allReservations.slice(0, 20).map(async (r) => {
          try {
            const chatData = await sharedApi.getReservationChat(r.reservation_id, true);
            const msgs = chatData?.messages || [];
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            const unreadCount = msgs.filter((m) => m.sender_role === 'patient' && parseInt(m.is_read) === 0).length;
            const pharmacistReplied = msgs.some((m) => m.sender_role === 'pharmacist');
            return {
              id: r.reservation_id,
              patientName: r.patient_name || 'Unknown',
              initials: (r.patient_name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
              lastMessage: lastMsg ? lastMsg.message_text : 'No messages yet',
              time: lastMsg ? formatTime(lastMsg.created_at) : '',
              unread: unreadCount,
              online: false,
              rawStatus: r.status,
              pharmacistReplied};
          } catch {
            return {
              id: r.reservation_id,
              patientName: r.patient_name || 'Unknown',
              initials: (r.patient_name || 'U').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
              lastMessage: 'No messages yet',
              time: '',
              unread: 0,
              online: false,
              rawStatus: r.status,
              pharmacistReplied: false};
          }
        })
      );
      setConversations(chatList.filter(Boolean));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        refreshDashboard(),
        refreshInventory(),
        refreshConversations(),
      ]).finally(() => setLoading(false));

      const intervalId = setInterval(() => {
        refreshDashboard();
        refreshConversations();
      }, 10000);

      return () => clearInterval(intervalId);
    }
  }, [user, refreshDashboard, refreshInventory, refreshConversations]);

  const handleApprove = useCallback(async (id) => {
    try {
      await reservationApi.claim(id);
      setPendingReservations((prev) => prev.filter((r) => r.reservation_id !== id));
      setStats((prev) => ({
        ...prev,
        pendingReview: Math.max(0, prev.pendingReview - 1),
        readyForPickup: prev.readyForPickup + 1}));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const handleReject = useCallback(async (id) => {
    try {
      await reservationApi.reject(id);
      setPendingReservations((prev) => prev.filter((r) => r.reservation_id !== id));
      setStats((prev) => ({
        ...prev,
        pendingReview: Math.max(0, prev.pendingReview - 1)}));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const value = {
    stats,
    prescriptions,
    pendingReservations,
    claimedReservations,
    conversations,
    inventoryItems,
    medicineStock,
    profile,
    pharmacyName,
    pharmacistName,
    loading,
    error,
    navigateTo,
    setNavigateTo,
    selectedConversationId,
    setSelectedConversationId,
    autoOpenOrderId,
    setAutoOpenOrderId,
    globalSearchQuery,
    setGlobalSearchQuery,
    handleApprove,
    handleReject,
    refreshDashboard,
    refreshInventory,
    refreshConversations};

  return (
    <PharmacyContext.Provider value={value}>
      {children}
    </PharmacyContext.Provider>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

