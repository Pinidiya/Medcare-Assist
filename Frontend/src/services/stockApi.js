// stockApi.js — Central API service for the Stock Manager dashboard.
// All fetch() calls go through the request() helper which handles JSON
// encoding, credentials (session cookies), and error throwing.

import { request } from './apiClient';



// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  // Returns real metrics from pharmacy_inventory + medicine_batches
  get: () => request('stock/dashboard.php'),
};

// ─── Master Medicines (system-wide list, search for Add Stock modal) ──────────
// Uses stock/get_master_medicines.php which filters by is_active=1
export const masterMedicinesApi = {
  list: (search = '') => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`stock/get_master_medicines.php${qs}`);
  },
};

// ─── Pharmacy Inventory (synced view for Stock Manager) ───────────────────────
// Uses stock/get_inventory.php — JOINs pharmacy_inventory + master_medicines
export const pharmacyInventoryApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    const q = qs.toString();
    return request(`stock/get_inventory.php${q ? '?' + q : ''}`);
  },
  // Add new batch — uses the full-featured stock/add_medicine_batch.php
  // Handles supplier lookup, medicine validation, medicine_batches INSERT + pharmacy_inventory UPSERT
  addStock: (stockData) =>
    request('stock/add_medicine_batch.php', { method: 'POST', body: stockData }),
  deleteStock: (medicineId) =>
    request('stock/delete_medicine.php', { method: 'POST', body: { medicine_id: medicineId } }),
};

// ─── Batches (FEFO active batches list for Dashboard table) ───────────────────
export const batchesApi = {
  // Returns all active batches for this pharmacy, ordered by newest first
  list: () => request('stock/get_batches.php'),
};

// ─── Alerts (low stock + out of stock items) ──────────────────────────────────
export const alertsApi = {
  // Returns medicines where stock_quantity <= low_stock_threshold
  list: () => request('stock/get_low_stock.php'),
};

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliersApi = {
  list: () => request('stock/get_suppliers.php'),
};


// ─── Admin Requests (Request New Medicine form) ───────────────────────────────
export const requestsApi = {
  list: () => request('requests/list.php'),
  // Sends: medicine_name, generic_composition, company, reason
  create: (data) =>
    request('requests/create.php', { method: 'POST', body: data }),
};

// ─── Profile & Settings ──────────────────────────────────────────────────────
export const profileApi = {
  get: () => request('stock/profile.php'),
  update: (data) =>
    request('stock/profile.php', { method: 'PUT', body: data }),
  changePassword: (currentPassword, newPassword) =>
    request('stock/change-password.php', {
      method: 'PUT',
      body: { current_password: currentPassword, new_password: newPassword },
    }),
};
