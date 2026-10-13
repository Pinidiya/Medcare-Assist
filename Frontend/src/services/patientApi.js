import { request } from './apiClient';

export const patientApi = {
  getDashboard: () => request('patient/get_dashboard.php'),
  
  getOrders: () => request('patient/get_orders.php'),
  
  getOrderHistory: () => request('patient/get_order_history.php'),
  
  getReservations: () => request('patient/get_reservations.php'),
  
  searchMedicines: (params) => {
    const searchParams = new URLSearchParams();
    if(params.query) searchParams.append('q', params.query);
    if(params.district) searchParams.append('district', params.district);
    if(params.lat) searchParams.append('lat', params.lat);
    if(params.lng) searchParams.append('lng', params.lng);
    return request(`patient/search_medicines.php?${searchParams.toString()}`);
  },
  
  getPharmaciesByMedicine: (medicineId) => request(`patient/get_pharmacies_by_medicine.php?medicine_id=${medicineId}`),
  
  getNearbyPharmacies: (query = '') => request(`patient/get_nearby_pharmacies.php${query}`),
  
  getPharmacyDetails: (id) => request(`patient/get_pharmacy_details.php?id=${id}`),
  
  createReservation: (data) => request('patient/create_reservation.php', { method: 'POST', body: data }),
  
  directReserve: (data) => request('patient/direct_reserve.php', { method: 'POST', body: data }),
  
  deleteReservation: (reservationId) => request('patient/delete_reservation.php', { method: 'POST', body: { reservation_id: reservationId } }),
  
  rejectReservation: (reservationId) => request('patient/reject_reservation.php', { method: 'POST', body: { reservation_id: reservationId } }),
  
  directPickup: (reservationId) => request('patient/direct_pickup.php', { method: 'POST', body: { reservation_id: reservationId } }),
  
  revertDirectPickup: (reservationId) => request('patient/revert_direct_pickup.php', { method: 'POST', body: { reservation_id: reservationId } }),
  
  uploadSlip: (formData) => request('patient/upload_slip.php', { method: 'POST', body: formData }),
  
  lockerGet: () => request('patient/locker_get.php'),
  
  lockerUpload: (formData) => request('patient/locker_upload.php', { method: 'POST', body: formData }),
  
  lockerDelete: (recordId) => request('patient/locker_delete.php', { method: 'POST', body: { record_id: recordId } }),
  
  sendSos: (locationData) => request('emergency/send_sos.php', { method: 'POST', body: locationData }),
  
  addFeedback: (feedback_text, rating) => request('patient/add_feedback.php', { method: 'POST', body: { feedback_text, rating } }),
};
