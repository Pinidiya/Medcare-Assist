import { useState, useMemo, useEffect } from 'react';
import SummaryCards from './SummaryCards';
import SearchFilterBar from './SearchFilterBar';
import PrescriptionTable from './PrescriptionTable';
import { dashboardApi, prescriptionApi } from '../../../../services/pharmacistApi';
import { Loader2 } from 'lucide-react';
import { usePharmacyData } from '../../hooks/usePharmacyData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';



export default function PrescriptionsContent() {
  const { navigateTo, setSelectedConversationId, setAutoOpenOrderId, globalSearchQuery, setGlobalSearchQuery } = usePharmacyData();
  let [search, setSearch] = useState(globalSearchQuery || '');
  let [statusFilter, setStatusFilter] = useState('');
  let [prescriptionsList, setPrescriptionsList] = useState([]);
  let [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  let [loading, setLoading] = useState(true);
  const [viewingRx, setViewingRx] = useState(null);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  // Sync when globalSearchQuery changes from Header
  useEffect(() => {
    if (globalSearchQuery) {
      setSearch(globalSearchQuery);
      if (setGlobalSearchQuery) setGlobalSearchQuery('');
    }
  }, [globalSearchQuery, setGlobalSearchQuery]);

  async function loadPrescriptions() {
    setLoading(true);
    try {
      const data = await dashboardApi.getPrescriptions();
      setPrescriptionsList(data.data || []);
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0 });
    } catch (e) {
      console.error('Failed to load prescriptions:', e);
    } finally {
      setLoading(false);
    }
  }

  const summaryStats = useMemo(() => ({
    totalToday: prescriptionsList.length,
    pendingVerification: counts.pending || 0,
    approvedReady: counts.approved || 0,
  }), [prescriptionsList.length, counts]);

  let filteredPrescriptions = useMemo(() => {
    return prescriptionsList.filter(function (rx) {
      let matchesSearch =
        !search ||
        (rx.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (rx.patient_email || '').toLowerCase().includes(search.toLowerCase()) ||
        String(rx.prescription_id).includes(search);

      let matchesStatus = !statusFilter || rx.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, prescriptionsList]);

  function handleViewDetails(rx) {
    if (rx.status === 'pending') {
      if (setSelectedConversationId) setSelectedConversationId(rx.prescription_id);
      if (setAutoOpenOrderId) setAutoOpenOrderId(rx.prescription_id);
      if (navigateTo) navigateTo('messages');
    } else {
      setViewingRx(rx);
    }
  }

  async function handleVerify(rx) {
    try {
      await prescriptionApi.update(rx.id.replace('RX-', ''), 'verified', 'Verified by pharmacist');
      loadPrescriptions();
    } catch (e) {
      console.error('Failed to verify:', e);
    }
  }

  async function handleDelete(rx) {
    if (!window.confirm('Are you sure you want to delete this prescription?')) return;
    try {
      await prescriptionApi.delete(rx.id.replace('RX-', ''));
      loadPrescriptions();
    } catch (e) {
      console.error('Failed to delete:', e);
      alert(e.message || 'Failed to delete prescription');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  const mappedPrescriptions = filteredPrescriptions.map((rx) => ({
    prescription_id: rx.prescription_id,
    id: `RX-${rx.prescription_id}`,
    patientName: rx.patient_name || 'Unknown',
    patientId: rx.patient_email || '',
    medication: rx.notes || 'Prescription',
    dosage: '',
    date: rx.uploaded_at ? new Date(rx.uploaded_at).toLocaleDateString() : '',
    time: rx.uploaded_at ? new Date(rx.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    status: rx.status || 'pending',
    age: '',
    gender: '',
    file_path: rx.file_path,
    pharmacist_notes: rx.pharmacist_notes,
  }));

  return (
    <div className="space-y-6">
      <SummaryCards stats={summaryStats} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="text-base font-semibold text-gray-900">
            All Prescriptions
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({mappedPrescriptions.length})
            </span>
          </h2>
          <SearchFilterBar
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
          />
        </div>

        <PrescriptionTable
          prescriptions={mappedPrescriptions}
          onViewDetails={handleViewDetails}
          onVerify={handleVerify}
          onDelete={handleDelete}
        />
      </div>

      {viewingRx && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setViewingRx(null)}>
          <div className="relative max-w-4xl w-full h-full max-h-[85vh] bg-transparent flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setViewingRx(null)}
              className="absolute -top-12 right-0 md:-right-12 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 backdrop-blur-md transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            {viewingRx.file_path && viewingRx.file_path.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={`${API_BASE_URL}/shared/view_file.php?file=${encodeURIComponent(viewingRx.file_path)}`}
                className="w-full h-full bg-white rounded-xl shadow-2xl"
                title="Prescription Document"
              />
            ) : viewingRx.file_path ? (
              <img
                src={`${API_BASE_URL}/shared/view_file.php?file=${encodeURIComponent(viewingRx.file_path)}`}
                alt="Prescription"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl bg-white"
              />
            ) : (
               <div className="bg-white p-8 rounded-xl text-center">
                 <p className="text-gray-500 font-medium">No prescription file available.</p>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
