import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, Search, X, ArrowRight, FileText, Loader2, Building2, MapPin, Phone, Navigation, Upload, CheckCircle } from 'lucide-react';
import Notification from './Notification';
import patientBannerImg from '../../../assets/patient banner.png';

const API = import.meta.env.VITE_API_BASE_URL;

const DISTRICTS = [
  'All Districts', 'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale',
  'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi',
  'Mannar', 'Mullaitivu', 'Vavuniya', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle'
];

export default function MedicinesView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [pharmacies, setPharmacies] = useState([]);
  const [districtFilter, setDistrictFilter] = useState('All Districts');
  const [pharmaciesLoading, setPharmaciesLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  const handleSearch = (term) => {
    setSearchTerm(term);
    setSelectedMedicine(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (term.trim().length < 2) {
      setMedicines([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setSearched(true);
      fetch(`${API}/patient/search_medicines.php?q=${encodeURIComponent(term.trim())}`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => {
          if (d.status === 'success') {
            setMedicines(d.data || []);
          } else {
            setMedicines([]);
          }
        })
        .catch((err) => {
          console.error(err);
          setMedicines([]);
          setToast({ message: 'Failed to load medicines.', type: 'error' });
        })
        .finally(() => setLoading(false));
    }, 400);
  };

  const handleSelectMedicine = (med) => {
    setSelectedMedicine(med);
    setPharmaciesLoading(true);
    fetch(`${API}/patient/get_pharmacies_by_medicine.php?medicine_id=${med.id}`, { credentials: 'include' })
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
        setToast({ message: 'Failed to load pharmacy data.', type: 'error' });
      })
      .finally(() => setPharmaciesLoading(false));
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

  const filteredPharmacies = pharmacies.filter(ph => districtFilter === 'All Districts' || ph.district === districtFilter);

  return (
    <div className="space-y-6 animate-fadeIn">
      {toast && <Notification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-[#f0f5fa] rounded-3xl overflow-hidden relative shadow-sm border border-blue-100/50 flex flex-col md:flex-row items-stretch justify-between min-h-[160px]">
        <div className="p-5 md:p-6 flex-1 w-full md:pr-0 z-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
              <Pill className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-extrabold text-[#1e293b]">Search Medicines</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4 max-w-md">
            Find the medicine you need, compare prices across pharmacies, and reserve or upload a prescription.
          </p>
          <div className="relative w-full max-w-3xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search medicines by name..."
              className="w-full bg-white border border-transparent rounded-xl pl-9 pr-8 py-3 text-sm font-medium text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {searchTerm && (
              <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="w-full md:w-[35%] h-40 md:h-[220px] absolute md:relative right-0 bottom-0 pointer-events-none flex justify-end">
          <img src={patientBannerImg} alt="Search Medicines" className="h-full object-cover md:object-contain object-right w-full opacity-30 md:opacity-100" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 20%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%)' }} />
        </div>
      </div>

      {/* Selected medicine – pharmacy list */}
      {selectedMedicine && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fadeIn">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedMedicine(null)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4 text-gray-600 rotate-180" />
              </button>
              <div>
                <h3 className="font-bold text-gray-900 text-base">{selectedMedicine.brand_name}</h3>
                <p className="text-xs text-gray-500">{selectedMedicine.generic_name} · {selectedMedicine.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedMedicine.requires_prescription == 1 && (
                <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg">
                  <FileText className="w-3.5 h-3.5" /> Prescription Required
                </span>
              )}
              <select
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
              >
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {pharmaciesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 spin" />
            </div>
          ) : filteredPharmacies.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">
                {pharmacies.length > 0 ? "No pharmacies in this district stock this medicine." : "No pharmacies currently stock this medicine."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredPharmacies.map((ph, idx) => (
                <div key={ph.pharmacy_id || idx} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">{ph.pharmacy_name || ph.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{ph.address}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {ph.district}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {ph.phone}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm font-bold text-gray-900">
                            Rs. {parseFloat(ph.unit_price || ph.price || 0).toFixed(2)}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                            parseInt(ph.stock_quantity || ph.stock || 0) > 10
                              ? 'bg-green-100 text-green-700'
                              : parseInt(ph.stock_quantity || ph.stock || 0) > 0
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {parseInt(ph.stock_quantity || ph.stock || 0) > 0
                              ? `${ph.stock_quantity || ph.stock} in stock`
                              : 'Out of stock'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => openInMaps(ph)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" /> Get Directions
                      </button>
                      {selectedMedicine.requires_prescription == 1 ? (
                        <button
                          onClick={() => setToast({ message: 'Please use the Pharmacies tab to upload a prescription.', type: 'info' })}
                          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" /> Upload Prescription
                        </button>
                      ) : (
                        <button
                          onClick={() => setToast({ message: 'Medicine reserved! The pharmacy will confirm shortly.', type: 'success' })}
                          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Reserve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search results – medicine cards grid */}
      {!selectedMedicine && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-500 spin" />
            </div>
          ) : searched && medicines.length === 0 ? (
            <div className="text-center py-20 animate-fadeIn">
              <Pill className="w-14 h-14 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 text-base font-semibold">No medicines found</p>
              <p className="text-gray-400 text-sm mt-1">Try a different search term</p>
            </div>
          ) : medicines.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fadeIn">
              {medicines.map((med) => (
                <button
                  key={med.id}
                  onClick={() => handleSelectMedicine(med)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all text-left group hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Pill className="w-5 h-5 text-blue-600" />
                    </div>
                    {med.requires_prescription == 1 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg font-semibold flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Rx
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm leading-tight">{med.brand_name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{med.generic_name}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">{med.category}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-blue-600 text-xs font-semibold">
                    View pharmacies <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          ) : !searched ? (
            <div className="text-center py-16 animate-fadeIn">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Search className="w-9 h-9 text-blue-300" />
              </div>
              <p className="text-gray-500 text-base font-semibold">Start searching for medicines</p>
              <p className="text-gray-400 text-sm mt-1.5 max-w-sm mx-auto leading-relaxed">
                Type at least 2 characters to search. You can search by brand name or generic name.
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
