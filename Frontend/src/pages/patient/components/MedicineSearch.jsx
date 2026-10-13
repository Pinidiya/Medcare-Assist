import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { 
  Search, 
  MapPin, 
  Navigation, 
  Pill, 
  Phone, 
  Loader2, 
  AlertCircle,
  ChevronDown,
  Map,
  X,
  CheckCircle
} from 'lucide-react';
import NavigationPage from './NavigationPage';
import patientBannerImg from '../../../assets/patient banner.png';
import { getMedicineUnit } from '../../../utils/medicineUnit';

export default function MedicineSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('');
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [expandedMed, setExpandedMed] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState(null); // For navigation
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const districts = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 
    'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 
    'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 
    'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 
    'Trincomalee', 'Vavuniya'
  ];

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      let url = `${import.meta.env.VITE_API_BASE_URL}/patient/search_medicines.php?q=${encodeURIComponent(query)}`;
      if (district) url += `&district=${encodeURIComponent(district)}`;
      if (lat && lng) url += `&lat=${lat}&lng=${lng}`;

      const res = await fetch(url, {credentials: 'include'});
      const data = await res.json();

      if (data.status === 'success') {
        setResults(data.data);
        if (data.data.length === 0) {
          setError('No medicines found matching your search criteria.');
        }
      } else {
        setError(data.message || 'Error fetching results.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (query.trim()) {
      handleSearch();
    }
  }, [district]);

  const getLocation = () => {
    setGettingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
          setGettingLocation(false);
        },
        (error) => {
          setGettingLocation(false);
          let msg = 'Failed to get location.';
          if (error.code === 1) msg = 'Location access denied by user.';
          setError(msg);
        }
      );
    } else {
      setGettingLocation(false);
      setError("Geolocation is not supported by your browser.");
    }
  };

  // If lat/lng changes and we already have a query, re-search to get updated distances
  useEffect(() => {
    if (lat && lng && query.trim()) {
      handleSearch();
    }
  }, [lat, lng]);

  const toggleExpand = (medId) => {
    if (expandedMed === medId) {
      setExpandedMed(null);
    } else {
      setExpandedMed(medId);
    }
  };

  if (selectedPharmacy) {
     return (
       <div className="animate-fadeIn">
          <button 
            onClick={() => setSelectedPharmacy(null)}
            className="mb-4 text-blue-600 font-bold hover:underline flex items-center gap-1"
          >
             &larr; Back to Search
          </button>
          <NavigationPage presetDestination={selectedPharmacy} />
       </div>
     )
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12 relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl animate-fadeIn ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-semibold">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-2 font-bold opacity-70 hover:opacity-100"><X className="w-4 h-4"/></button>
        </div>
      )}

      {/* Standard Medcare Header */}
      <div className="bg-[#f0f5fa] rounded-3xl overflow-hidden relative shadow-sm border border-blue-100/50 flex flex-col md:flex-row items-stretch justify-between min-h-[160px]">
        <div className="p-5 md:p-6 flex-1 w-full md:pr-0 z-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
              <Search className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-extrabold text-[#1e293b]">Find Medicine</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4 max-w-md">
            Search for medicines by name and find nearby pharmacies that have them in stock right now. Filter by your district or use your GPS location to sort pharmacies by distance.
          </p>
        </div>
        <div className="w-full md:w-[35%] h-40 md:h-[220px] absolute md:relative right-0 bottom-0 pointer-events-none flex justify-end">
          <img src={patientBannerImg} alt="Search Medicine" className="h-full object-cover md:object-contain object-right w-full opacity-30 md:opacity-100" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 20%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%)' }} />
        </div>
      </div>

      {/* Modern Search Controls */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-3 max-w-3xl mx-auto">
            
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Pill className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="medSearchInput"
                type="text"
                placeholder="Search medicine (e.g. Panadol)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium placeholder-gray-400"
              />
            </div>

            {/* District Filter */}
            <div className="relative w-full md:w-64">
               <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium appearance-none cursor-pointer"
              >
                <option value="">All Districts</option>
                {districts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                 <ChevronDown className="h-4 w-4" />
              </div>
            </div>

            {/* Search Button */}
            <div className="w-full md:w-auto">
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="w-full md:w-32 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 spin" /> : <><Search className="w-4 h-4"/> Search</>}
              </button>
            </div>
          </div>

          {/* Location Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={getLocation}
              disabled={gettingLocation}
              className={`inline-flex items-center justify-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-colors border ${
                lat && lng 
                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {gettingLocation ? (
                <Loader2 className="w-3.5 h-3.5 spin" />
              ) : lat && lng ? (
                <Navigation className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>
                {lat && lng ? 'Location Synced: Sorting by nearest' : 'Use GPS for nearest pharmacies'}
              </span>
            </button>
            
            {results.length > 0 && (
               <div className="text-xs font-bold text-gray-500">
                 Found {results.length} medicine{results.length > 1 ? 's' : ''}
               </div>
            )}
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-3.5 rounded-xl flex items-center gap-2.5 border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-bold text-sm">{error}</p>
        </div>
      )}

      {/* Results Display - 3 Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {results.map((med) => (
          <div key={med.medicine_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            
            {/* Medicine Header */}
            <div 
              className={`p-5 cursor-pointer transition-colors flex items-center justify-between gap-4 ${expandedMed === med.medicine_id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
              onClick={() => toggleExpand(med.medicine_id)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${expandedMed === med.medicine_id ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{med.brand_name}</h3>
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      {med.generic_name}
                    </span>
                    <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded uppercase w-fit">
                      {med.category}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <div className="text-center">
                  <p className="text-sm font-black text-blue-600">{med.pharmacies.length}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Stores</p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${expandedMed === med.medicine_id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                   <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedMed === med.medicine_id ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            {/* Pharmacies Grid Inside Card */}
            <div 
               className={`overflow-y-auto transition-all duration-300 ease-in-out ${expandedMed === med.medicine_id ? 'max-h-[400px] opacity-100 border-t border-gray-100' : 'max-h-0 opacity-0'}`}
            >
              <div className="bg-gray-50/50 p-4 space-y-3">
                  {med.pharmacies.map((pharmacy) => (
                    <div 
                      key={pharmacy.pharmacy_id} 
                      onClick={() => navigate(`/patient/pharmacy/${pharmacy.pharmacy_id}`, { state: { med } })}
                      className="cursor-pointer bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2.5">
                          <h5 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm pr-2">
                             {pharmacy.pharmacy_name}
                          </h5>
                          {pharmacy.distance !== null && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-100 whitespace-nowrap">
                              <Navigation className="w-3 h-3" />
                              {pharmacy.distance} km
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-1.5">
                           <div className="flex items-start gap-1.5 text-xs text-gray-600">
                             <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" /> 
                             <span className="leading-snug">{pharmacy.address}, <span className="font-bold">{pharmacy.district}</span></span>
                           </div>
                           <div className="flex items-center gap-1.5 text-xs text-gray-600">
                             <Phone className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" /> 
                             <span className="font-medium">{pharmacy.phone}</span>
                           </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-medium text-gray-500 mb-0.5">Price / {getMedicineUnit(med, 1)}</p>
                            <p className="text-sm font-bold text-gray-900">
                               Rs. {parseFloat(pharmacy.unit_price).toFixed(2)}
                            </p>
                          </div>
                          <button
                             onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPharmacy({
                                  lat: parseFloat(pharmacy.latitude),
                                  lng: parseFloat(pharmacy.longitude),
                                  name: pharmacy.pharmacy_name
                                });
                             }}
                             className="px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-100 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                          >
                            <Map className="w-3.5 h-3.5" /> 
                            Navigate
                          </button>
                        </div>
                        
                        {/* Prescription Requirement Indicator */}
                        {med.requires_prescription === 0 ? (
                           <div className="w-full py-1.5 bg-green-50 text-green-700 border border-green-100 rounded-md text-[10px] font-extrabold text-center mt-2 uppercase tracking-wide">
                             No Prescription Needed
                           </div>
                        ) : (
                           <div className="w-full py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-md text-[10px] font-extrabold text-center mt-2 uppercase tracking-wide">
                             Prescription Required
                           </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
