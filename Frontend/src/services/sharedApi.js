import { request } from './apiClient';

export const sharedApi = {
  getProfile: () => request('shared/get_profile.php'),
  updateProfile: (data) => request('shared/update_profile.php', { method: 'POST', body: data }),
  
  getReservationChat: (reservationId, noMarkRead = false) => request(`shared/get_reservation_chat.php?reservation_id=${reservationId}${noMarkRead ? '&no_mark_read=true' : ''}`),
  sendReservationMessage: (reservationId, messageText) =>
    request('shared/send_reservation_message.php', {
      method: 'POST',
      body: { reservation_id: reservationId, message_text: messageText },
    }),
  deleteReservationMessage: (messageId) => request('shared/delete_reservation_message.php', {
    method: 'POST', body: { message_id: messageId }
  }),
  
  getUnreadCounts: () => request('shared/get_unread_counts.php'),
  
  getQuotation: (reservationId) => request(`shared/get_quotation.php?reservation_id=${reservationId}`),
  
  getOrderChat: (orderId) => request(`shared/get_messages.php?order_id=${orderId}`),
  sendOrderMessage: (orderId, message) => request('shared/send_message.php', {
      method: 'POST',
      body: { order_id: orderId, message },
    }),

  // Auth additions
  requestPasswordReset: (email) => request('auth/request_reset.php', { method: 'POST', body: { email } }),
  resetPassword: (token, newPassword) => request('auth/reset_password.php', { method: 'POST', body: { token, new_password: newPassword } }),
};
