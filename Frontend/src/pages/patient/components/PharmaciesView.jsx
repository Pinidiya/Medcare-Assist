import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, MapPin, Search, Phone, Filter, ChevronDown, FileUp, X, CheckCircle, XCircle, Loader2, Info, Upload, ShieldCheck,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import pharmacySearchImg from '../../../assets/pharmacy_search.jpg';

const API = import.meta.env.VITE_API_BASE_URL;

const DISTRICTS = [
  'All Districts', 'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale',
  'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi',
  'Mannar', 'Mullaitivu', 'Vavuniya', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle'
];

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = type === 'success'
    ? 'bg-green-600 text-white'
    : type === 'error'
      ? 'bg-red-600 text-white'
      : 'bg-blue-600 text-white';

  return (
    <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 ${colors} px-5 py-3.5 rounded-xl shadow-2xl animate-fadeIn`}>
      {type === 'success' && <CheckCircle className="w-5 h-5" />}
      {type === 'error' && <XCircle className="w-5 h-5" />}
      {type === 'info' && <Info className="w-5 h-5" />}
      <p className="text-sm font-semibold">{message}</p>
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function PharmaciesView() {
  const [district, setDistrict] = useState('All Districts');
  const [pharmacies, setPharmacies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [prescriptionModal, setPrescriptionModal] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const fetchPharmacies = (selectedDistrict) => {
    setLoading(true);
    setSearched(true);
    const query = selectedDistrict === 'All Districts' ? '' : `?district=${encodeURIComponent(selectedDistrict)}`;
    fetch(`${API}/patient/get_nearby_pharmacies.php${query}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') {
          setPharmacies(d.data || []);
        } else {
          setPharmacies([]);
        }
      })
      .catch((err) => {
        console.error(err);
        setPharmacies([]);
        setToast({ message: 'Failed to load pharmacies. Please try again.', type: 'error' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPharmacies('All Districts');
  }, []);

  const handleDistrictChange = (e) => {
    const val = e.target.value;
    setDistrict(val);
    setCurrentPage(1);
    fetchPharmacies(val);
  };

  const openInMaps = (ph) => {
    const latVal = ph.latitude || ph.lat;
    const lngVal = ph.longitude || ph.lng;
    if (!latVal || !lngVal) {
      setToast({ message: 'Location not available for this pharmacy', type: 'error' });
      return;
    }
    const lat = parseFloat(latVal);
    const lng = parseFloat(lngVal);
    if (isNaN(lat) || isNaN(lng)) {
      setToast({ message: 'Location not available for this pharmacy', type: 'error' });
      return;
    }
    navigate('/patient/navigation', { 
      state: { 
        pharmacy: {
          name: ph.pharmacy_name || ph.name,
          address: ph.address,
          lat,
          lng
        } 
      } 
    });
  };

  const openPrescriptionModal = (pharmacy) => {
    setPrescriptionModal(pharmacy);
    setPrescriptionFile(null);
    setPrescriptionNotes('');
  };

  const handleUploadPrescription = async () => {
    if (!prescriptionFile) {
      setToast({ message: 'Please select a prescription file.', type: 'error' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('pharmacy_id', prescriptionModal.id || prescriptionModal.pharmacy_id);
    formData.append('prescription', prescriptionFile);
    formData.append('notes', prescriptionNotes);

    try {
      const res = await fetch(`${API}/patient/create_reservation.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.status === 'success') {
        setToast({ message: 'Prescription reservation created! Opening chat workspace...', type: 'success' });
        setPrescriptionModal(null);
        setTimeout(() => {
          navigate('/patient/reservations');
        }, 1000);
      } else {
        setToast({ message: data.message || 'Upload failed. Please try again.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

return (
    <div className="space-y-6 animate-fadeIn">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

  {/* Prescription Upload Modal */}
      {prescriptionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onClick={() => setPrescriptionModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Upload Prescription</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  To: {prescriptionModal.pharmacy_name || prescriptionModal.name}
                </p>
              </div>
              <button
                onClick={() => setPrescriptionModal(null)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* File upload area */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Prescription File</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                    prescriptionFile
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
                  }`}
                >
                  {prescriptionFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileUp className="w-8 h-8 text-blue-500" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{prescriptionFile.name}</p>
                        <p className="text-xs text-gray-500">{(prescriptionFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPrescriptionFile(null); }}
                        className="w-7 h-7 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 font-medium">Click to upload prescription</p>
                      <p className="text-xs text-gray-400 mt-1">Supports images and PDF files</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => setPrescriptionFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (optional)</label>
                <textarea
                  value={prescriptionNotes}
                  onChange={(e) => setPrescriptionNotes(e.target.value)}
                  placeholder="Any additional notes for the pharmacist..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none resize-none placeholder-gray-400"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 justify-end">
              <button
                onClick={() => setPrescriptionModal(null)}
                className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadPrescription}
                disabled={uploading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? 'Uploading...' : 'Upload Prescription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PHARMACY SEARCH SECTION ================= */}
      <div className="bg-[#f0f5fa] rounded-3xl overflow-hidden relative shadow-sm border border-blue-100/50 flex flex-col md:flex-row items-stretch justify-between min-h-[160px]">
        <div className="p-5 md:p-6 flex-1 w-full md:pr-0 z-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-extrabold text-[#1e293b]">Pharmacy Search</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4 max-w-md">
            Find pharmacies near you and check medicine availability.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-3xl items-center">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search pharmacy by name..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-transparent rounded-xl pl-9 pr-3 py-3 text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-gray-600 px-2 shrink-0">
                 <Filter className="w-4 h-4" />
                 <span className="text-sm font-bold">District:</span>
              </div>
              <div className="relative min-w-[160px] flex-1 sm:flex-none">
                <select
                  value={district}
                  onChange={handleDistrictChange}
                  className="w-full appearance-none bg-white border border-transparent rounded-xl pl-4 pr-8 py-3 text-sm font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
        <div className="w-full md:w-[35%] h-40 md:h-[220px] absolute md:relative right-0 bottom-0 pointer-events-none flex justify-end">
          <img src={pharmacySearchImg} alt="Pharmacy Search" className="h-full object-cover md:object-contain object-right w-full opacity-30 md:opacity-100" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 20%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%)' }} />
        </div>
      </div>

{/* Pharmacy Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-500 spin" />
        </div>
      ) : pharmacies.length === 0 ? (
        <div className="text-center py-20 animate-fadeIn">
          <Building2 className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 text-base font-semibold">No pharmacies found</p>
          <p className="text-gray-400 text-sm mt-1">Try selecting a different district</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const filteredPharmacies = pharmacies.filter(ph => (ph.pharmacy_name || ph.name).toLowerCase().includes(searchQuery.toLowerCase()));
            const totalItems = filteredPharmacies.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const paginatedPharmacies = filteredPharmacies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

            return (
              <>
                <div className="flex justify-end mt-4 mb-2">
                   <span className="text-sm text-gray-500 font-medium">
                     Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} pharmacies
                   </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fadeIn">
                  {paginatedPharmacies.map((ph, idx) => {
                    const isSuspended = ph.status === 'suspended';
                    const isVerified = true; // All fetched pharmacies are fully_verified by backend
                    
                    return (
                    <div 
                      key={ph.id || ph.pharmacy_id || idx}
                      onClick={() => navigate(`/patient/pharmacy/${ph.pharmacy_id || ph.id}`)}
                      className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-blue-100 transition-all duration-300 cursor-pointer flex flex-col group"
                    >
                      <div className="p-6 flex items-start gap-4">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                          <Building2 className="w-7 h-7 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">{ph.pharmacy_name || ph.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {isSuspended ? (
                              <span className="inline-flex items-center gap-1 mt-1 text-[11px] bg-red-50 text-red-600 px-2.5 py-1 rounded-md font-bold">
                                <XCircle className="w-3.5 h-3.5" /> Suspended
                              </span>
                            ) : isVerified ? (
                              <span className="inline-flex items-center gap-1 mt-1 text-[11px] bg-[#E6F7ED] text-[#00A854] px-2.5 py-1 rounded-md font-bold">
                                <ShieldCheck className="w-3.5 h-3.5" /> Verified
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-100 p-4 sm:px-6 flex items-center justify-between gap-4">
                         {/* Location */}
                         <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{ph.district}</p>
                              <p className="text-[11px] text-gray-500 truncate">{ph.address || 'Sri Lanka'}</p>
                            </div>
                         </div>
                         
                         {/* Phone */}
                         <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                              <Phone className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 whitespace-nowrap">{ph.phone || 'N/A'}</p>
                              <p className="text-[11px] text-gray-500 truncate">Call</p>
                            </div>
                         </div>
                         
                         <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                      </div>
                    </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-8">
                    <p className="text-sm text-gray-500 font-medium">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-700 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" /> Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-blue-600 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-gray-700 transition-colors"
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

