import {
  LayoutDashboard,
  ClipboardList,
  MessageSquare,
  History,
  Package,
  Settings,
  BarChart3,
  Users,
  Building2,
} from 'lucide-react';

export const roleLabels = {
  admin: 'Administrator',
  superadmin: 'Super Admin',
  pharmacy_owner: 'Pharmacy Owner',
  pharmacist: 'Pharmacist',
  stock_manager: 'Stock Manager',
  patient: 'Patient',
};

export const navItems = {
  pharmacist: [
    { icon: LayoutDashboard, label: 'Dashboard', pageKey: 'dashboard' },
    { icon: MessageSquare, label: 'Patient Orders', pageKey: 'messages' },
    { icon: ClipboardList, label: 'Prescriptions', pageKey: 'prescriptions' },
    { icon: History, label: 'Order History', pageKey: 'order-history' },
    { icon: Package, label: 'Inventory', pageKey: 'inventory' },
    { icon: Settings, label: 'Settings', pageKey: 'settings' },
  ],
  stock_manager: [
    { icon: LayoutDashboard, label: 'Dashboard', pageKey: 'dashboard' },
    { icon: Package, label: 'Inventory', pageKey: 'inventory' },
    { icon: BarChart3, label: 'Reports', pageKey: 'reports' },
    { icon: Settings, label: 'Settings', pageKey: 'settings' },
  ],
  pharmacy_owner: [
    { icon: LayoutDashboard, label: 'Dashboard', pageKey: 'dashboard' },
    { icon: Building2, label: 'Pharmacy', pageKey: 'pharmacy' },
    { icon: Users, label: 'Staff', pageKey: 'staff' },
    { icon: Package, label: 'Inventory', pageKey: 'inventory' },
    { icon: BarChart3, label: 'Reports', pageKey: 'reports' },
    { icon: Settings, label: 'Settings', pageKey: 'settings' },
  ],
};
