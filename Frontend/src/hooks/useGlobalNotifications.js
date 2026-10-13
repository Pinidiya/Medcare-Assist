import { useState, useEffect } from 'react';
import { sharedApi } from '../services/sharedApi';
import { useAuth } from '../context/AuthContext';

export function useGlobalNotifications() {
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Only patients and pharmacists have chat notifications currently
    if (!user || !['patient', 'pharmacist'].includes(user.role)) {
      return;
    }

    let pollingTimer;
    
    const fetchNotifs = async () => {
      try {
        const res = await sharedApi.getUnreadCounts();
        if (res.unread) {
           const count = Object.values(res.unread).reduce((a, b) => a + b, 0);
           setUnreadCount(count);
           if (count > 0) {
             setNotifications([
               {
                 title: 'New Messages',
                 body: `You have ${count} unread message(s) in your chats. Please check your messages.`
               }
             ]);
           } else {
             setNotifications([]);
           }
        }
      } catch (e) {
         // ignore errors to prevent console spam
      }
      pollingTimer = setTimeout(fetchNotifs, 10000); // Poll every 10s
    };
    
    fetchNotifs();
    
    return () => clearTimeout(pollingTimer);
  }, [user]);

  return { notifications, unreadCount };
}
