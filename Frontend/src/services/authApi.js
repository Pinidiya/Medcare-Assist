import { request } from './apiClient';

export const authApi = {
  login: (email, password) =>
    request('auth/login.php', { method: 'POST', body: { email, password } }),
    
  loginPatient: (email, password) =>
    request('auth/login_patient.php', { method: 'POST', body: { email, password } }), // If separate endpoint exists
    
  registerPatient: (data) =>
    request('auth/register_patient.php', { method: 'POST', body: data }),
    
  registerPharmacy: (data) =>
    request('auth/register_pharmacy.php', { method: 'POST', body: data }),
    
  registerPharmacist: (data) =>
    request('auth/register_pharmacist.php', { method: 'POST', body: data }),
    
  logout: () =>
    request('auth/logout.php', { method: 'POST' }),
};
