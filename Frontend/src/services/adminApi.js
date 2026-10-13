import { request } from './apiClient';

export const adminApi = {
  getUsers: () => request('admin/get_users.php'),
  getStats: () => request('admin/get_stats.php'),
  getPharmacies: () => request('admin/get_pharmacies.php'),
  getMedicines: () => request('admin/get_medicines.php'),
  addMedicine: (data) => request('admin/add_medicine.php', { method: 'POST', body: data }),
  updateMedicine: (data) => request('admin/update_medicine.php', { method: 'POST', body: data }),
  deleteMedicine: (medicineId) => request('admin/delete_medicine.php', { method: 'POST', body: { medicine_id: medicineId } }),
  getPharmacists: () => request('admin/get_pharmacists.php'),
  getMedicineRequests: () => request('admin/get_medicine_requests.php'),
  getFeedbacks: () => request('admin/get_feedbacks.php'),
  
  approveCombined: (pharmacyId, action) =>
    request('admin/approve_combined.php', {
      method: 'POST',
      body: { pharmacy_id: pharmacyId, action },
    }),

  toggleUser: (userId, accountStatus) =>
    request('admin/toggle_user.php', {
      method: 'POST',
      body: { user_id: userId, account_status: accountStatus },
    }),

  getPharmacyStaff: (pharmacyId) =>
    request(`admin/get_pharmacy_staff.php?pharmacy_id=${pharmacyId}`),

  approvePharmacist: (pharmacistUserId, action) =>
    request('admin/approve_pharmacist.php', {
      method: 'POST',
      body: { pharmacist_user_id: pharmacistUserId, action },
    }),

  approveMedicineRequest: (requestId, action, adminNotes = '') =>
    request('admin/approve_medicine_request.php', {
      method: 'POST',
      body: { request_id: requestId, action, admin_notes: adminNotes },
    }),

  updateFeedbackStatus: (feedbackId, status) =>
    request('admin/update_feedback_status.php', {
      method: 'POST',
      body: { feedback_id: feedbackId, status },
    }),

  deleteFeedback: (feedbackId) =>
    request('admin/delete_feedback.php', {
      method: 'POST',
      body: { feedback_id: feedbackId },
    }),

  addMedicine: (data) =>
    request('admin/add_medicine.php', {
      method: 'POST',
      body: data,
    }),
};
