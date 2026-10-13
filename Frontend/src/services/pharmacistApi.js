import { request, API_BASE } from './apiClient';

export const dashboardApi = {
  getPendingReservations: () =>
    request('pharmacist/get_pending_reservation.php'),
  getOrders: (status) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(`pharmacist/get_orders.php${qs}`);
  },
  getOrderHistory: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return request(`pharmacist/get_order_history.php${qs ? '?' + qs : ''}`);
  },
  getOrderDetails: (type, id) =>
    request(`pharmacist/get_order_details.php?type=${encodeURIComponent(type)}&id=${id}`),
  getPrescriptions: (status) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(`pharmacist/get_prescription.php${qs}`);
  },
  getTodayRevenue: () =>
    request('pharmacist/get_today_revenue.php'),
};

export const reservationApi = {
  claim: (reservationId) =>
    request('pharmacist/claim_reservation.php', {
      method: 'POST',
      body: { reservation_id: reservationId },
    }),
  reject: (reservationId, reason = '') =>
    request('pharmacist/reject_reservation.php', {
      method: 'POST',
      body: { reservation_id: reservationId, reason },
    }),
  approvePrescription: (reservationId) =>
    request('pharmacist/approve_reservation.php', {
      method: 'POST',
      body: { reservation_id: reservationId },
    }),
  generateDigitalPrescription: (reservationId, items) =>
    request('pharmacist/generate_digital_prescription.php', {
      method: 'POST',
      body: { reservation_id: reservationId, items },
    }),
  generateBill: (reservationId, items, pharmacistNote) =>
    request('pharmacist/generate_bill.php', {
      method: 'POST',
      body: { reservation_id: reservationId, items, pharmacist_note: pharmacistNote },
    }),
  verifyPayment: (orderId, action) =>
    request('pharmacist/verify_payment.php', {
      method: 'POST',
      body: { order_id: orderId, action },
    }),
  verifyPickup: (orderId, pin) =>
    request('pharmacist/verify_pickup.php', {
      method: 'POST',
      body: { order_id: orderId, pin },
    }),
  verifyReservationPickup: (reservationId, pin) =>
    request('pharmacist/verify_reservation_pickup.php', {
      method: 'POST',
      body: { reservation_id: reservationId, pin },
    }),
  checkPickupPin: (orderId, pin) =>
    request('pharmacist/check_pickup_pin.php', {
      method: 'POST',
      body: { order_id: orderId, pin },
    }),
  checkReservationPickupPin: (reservationId, pin) =>
    request('pharmacist/check_reservation_pickup_pin.php', {
      method: 'POST',
      body: { reservation_id: reservationId, pin },
    }),
};

export const inventoryApi = {
  getStock: () =>
    request('pharmacist/get_stock.php'),
  getMedicines: () =>
    request('pharmacist/get_medicine.php'),
  searchInventory: (q) =>
    request(`pharmacist/search_inventory.php?q=${encodeURIComponent(q)}`),
  getBatches: () =>
    request('pharmacist/inventory_batches.php'),
  addBatch: (data) =>
    request('pharmacist/inventory_batches.php', {
      method: 'POST',
      body: data,
    }),
  updateBatch: (data) =>
    request('pharmacist/inventory_batches.php', {
      method: 'PUT',
      body: data,
    }),
  deleteBatch: (batchId) =>
    request('pharmacist/inventory_batches.php', {
      method: 'DELETE',
      body: { batch_id: batchId },
    }),
  deductStock: (items) =>
    request('pharmacist/deduct_stock.php', {
      method: 'POST',
      body: { items },
    }),
  dispense: (orderId) =>
    request('pharmacist/dipense.php', {
      method: 'POST',
      body: { order_id: orderId },
    }),
};

export const orderApi = {
  createQuotation: (orderId, items) =>
    request('pharmacist/create_quatation.php', {
      method: 'POST',
      body: { order_id: orderId, items },
    }),
  updateStatus: (orderId, status) =>
    request('pharmacist/update_order_status.php', {
      method: 'POST',
      body: { order_id: orderId, status },
    }),
  generateBill: (orderId, items, pharmacistNote) =>
    request('pharmacist/generate_order_bill.php', {
      method: 'POST',
      body: { order_id: orderId, items, pharmacist_note: pharmacistNote },
    }),
  getOrderChat: (orderId) =>
    request(`shared/get_messages.php?order_id=${orderId}`),
  sendOrderMessage: (orderId, message) =>
    request('shared/send_message.php', {
      method: 'POST',
      body: { order_id: orderId, message },
    }),
};

export const prescriptionApi = {
  update: (prescriptionId, status, notes) =>
    request('pharmacist/update_prescription.php', {
      method: 'POST',
      body: { prescription_id: prescriptionId, status, notes },
    }),
  delete: (prescriptionId) =>
    request('pharmacist/delete_prescription.php', {
      method: 'POST',
      body: { prescription_id: prescriptionId },
    }),
};

export const staffApi = {
  getStaff: () =>
    request('pharmacist/get_staff.php'),
  createStaff: (formData) => {
    return fetch(`${API_BASE}/pharmacist/create_staff.php`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(r => r.json());
  },
};


export const pickupApi = {
  // Legacy: kept for backward compat
  searchByPin: (pin) =>
    request('pharmacist/search_by_pin.php', { method: 'POST', body: { pin } }),

  // NEW unified secure endpoint — never returns pickup_pin to pharmacist
  searchOrder: (pin) =>
    request('pharmacist/verify_and_complete_order.php', {
      method: 'POST',
      body: { pin, action: 'search' },
    }),

  completeOrder: (pin, orderId, orderType) =>
    request('pharmacist/verify_and_complete_order.php', {
      method: 'POST',
      body: { pin, action: 'complete', order_id: orderId, order_type: orderType },
    }),
};
