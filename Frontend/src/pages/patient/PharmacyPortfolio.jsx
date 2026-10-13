import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Building2, MapPin, Phone, ShieldCheck, Loader2, ArrowLeft, Upload, FileText, CheckCircle } from 'lucide-react';
import NavigationPage from './components/NavigationPage';

const API = import.meta.env.VITE_API_BASE_URL;

export default function PharmacyPortfolio() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const med = location.state?.med;

  const [pharmacy, setPharmacy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNavigation, setShowNavigation] = useState(false);

  // Reservation state
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [agreeOriginal, setAgreeOriginal] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const fetchPharmacy = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/patient/get_pharmacy_details.php?id=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.status === 'success') {
        setPharmacy(data.data);
      } else {
        setError(data.message || 'Failed to fetch pharmacy');
      }
    } catch (error) {
      setError('An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPharmacy();
  }, [id]);

  const handlePrescriptionUpload = async (e) => {
    e.preventDefault();
    if (!prescriptionFile) {
      setToast({ message: 'Please select a prescription file to upload.', type: 'error' });
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('pharmacy_id', id);
    formData.append('prescription', prescriptionFile);
    formData.append('notes', prescriptionNotes);

    try {
      const res = await fetch(`${API}/patient/create_reservation.php`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setToast({ message: 'Prescription uploaded successfully!', type: 'success' });
        setPrescriptionFile(null);
        setPrescriptionNotes('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // Redirect to Inbox/Reservations after a short delay so they can see the success message
        setTimeout(() => navigate('/patient/reservations'), 1500);
      } else {
        setToast({ message: data.message || 'Upload failed.', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDirectOrder = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const res = await fetch(`${API}/patient/direct_reserve.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacy_id: id,
          notes: `Direct Order: ${med.brand_name} (${med.generic_name}). ${prescriptionNotes}`
        }),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.status === 'success') {
        setToast({ message: 'Medicine reserved successfully!', type: 'success' });
        setPrescriptionNotes('');
        
        // Redirect to Inbox/Reservations after a short delay
        setTimeout(() => navigate('/patient/reservations'), 1500);
      } else {
        setToast({ message: data.message || 'Reservation failed.', type: 'error' });
      }
    } catch (err) {
      setToast({ message: 'Network error. Please try again.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 spin text-blue-600" />
      </div>
    );
  }

  if (error || !pharmacy) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{error || 'Pharmacy Not Found'}</h2>
        <button onClick={() => navigate(-1)} className="text-blue-600 font-semibold hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  if (showNavigation && pharmacy) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <NavigationPage 
          pharmacyData={{
            lat: parseFloat(pharmacy.latitude),
            lng: parseFloat(pharmacy.longitude),
            name: pharmacy.pharmacy_name,
            address: pharmacy.address
          }}
          onBack={() => setShowNavigation(false)}
        />
      </div>
    );
  }

  return (
    <div className="bg-[#F4F6FA] min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border border-white/10 transition-all duration-300 animate-slideIn ${toast.type === 'success' ? 'bg-[#00C26F] text-white' : 'bg-[#FF3B30] text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <ShieldCheck className="w-5 h-5 flex-shrink-0" />}
          <p className="text-sm font-bold">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-4 text-white hover:opacity-85 transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl w-full mx-auto py-6 px-6 relative z-10 flex-1">
        <button 
          onClick={() => navigate(-1)} 
          className="text-[#0052FF] hover:text-blue-800 flex items-center gap-2 font-bold mb-4 group transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back</span>
        </button>
        
        {/* Header Card */}
        <div className="bg-white rounded-[20px] p-5 md:p-6 shadow-sm border border-gray-100 mb-6 overflow-hidden relative">
          {/* Decorative Waves/Blobs */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-blue-50 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-80" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-gradient-to-tr from-indigo-50 to-transparent rounded-full blur-3xl translate-y-1/3 opacity-60" />
          
          {/* Medical Cross Watermark */}
          <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none hidden md:block">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="w-24 h-24 text-blue-600">
              <path d="M9 2v7H2v6h7v7h6v-7h7V9h-7V2H9z" />
            </svg>
          </div>

          <div className="flex flex-row items-center gap-6 relative z-10">
            <div className="w-20 h-20 bg-[#F5F8FF] rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-left">
              <div className="flex flex-wrap items-center gap-3 mb-1.5">
                <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">{pharmacy.pharmacy_name}</h1>
                <span className="bg-[#E6FDF4] text-[#00C26F] px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Verified
                </span>
              </div>
              <p className="text-gray-500 text-sm flex items-center gap-1.5 font-medium mt-0.5">
                <MapPin className="w-4 h-4 text-gray-400" /> {pharmacy.address}, {pharmacy.district}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-20">
          
          {/* Left Column: Info & Actions */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-[20px] p-5 md:p-6 shadow-sm border border-gray-100">
               <div className="flex items-center gap-3 mb-5">
                 <div className="bg-[#F0F5FF] p-2 rounded-xl text-blue-600">
                   <Building2 className="w-4 h-4" />
                 </div>
                 <h3 className="text-base font-extrabold text-gray-900">Contact Information</h3>
               </div>

               <div className="flex items-center gap-3 mb-5 bg-[#F8FAFC] rounded-2xl p-3.5 border border-gray-50">
                 <div className="w-10 h-10 bg-white text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-100">
                   <Phone className="w-4 h-4" />
                 </div>
                 <div>
                   <p className="text-[11px] font-semibold text-gray-400 mb-0.5 uppercase tracking-wider">Phone</p>
                   <p className="text-base font-extrabold text-gray-900">{pharmacy.phone}</p>
                 </div>
               </div>
               
               <button 
                  onClick={() => setShowNavigation(true)}
                  className="w-full flex items-center justify-between bg-white text-blue-600 py-3 px-4 rounded-xl text-sm font-bold transition-all border border-gray-200 hover:border-blue-300 hover:bg-[#F8FAFC] shadow-sm"
               >
                 <div className="flex items-center gap-2">
                   <MapPin className="w-4 h-4" />
                   <span>Get Directions</span>
                 </div>
                 <ArrowLeft className="w-4 h-4 rotate-180" />
               </button>
            </div>

            <div className="bg-[#F8FAFF] rounded-[20px] p-5 md:p-6 shadow-sm border border-blue-100/50">
              <div className="flex gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-blue-700 mb-1">Your information is secure</h4>
                  <p className="text-xs text-blue-600/80 leading-relaxed font-medium">Your data is protected and will only be used to process your prescription.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Reservation / Prescription Upload */}
          <div className="md:col-span-2">
             <div className="bg-white rounded-[20px] p-5 md:p-6 shadow-sm border border-gray-100/80">
                
                {med ? (
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-gray-900">Reserving {med.brand_name}</h2>
                        <p className="text-xs font-semibold text-gray-500">{med.generic_name}</p>
                      </div>
                   </div>
                ) : (
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                        <FileText className="w-4 h-4 fill-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-extrabold text-gray-900">Send a Prescription</h2>
                        <p className="text-xs font-semibold text-gray-500 mt-0.5">Upload your doctor's prescription directly to {pharmacy.pharmacy_name} to request medicines.</p>
                      </div>
                   </div>
                )}

                {med && med.requires_prescription === 0 ? (
                  // Direct Order Form (No Prescription Needed)
                  <form onSubmit={handleDirectOrder} className="space-y-4">
                    <div className="bg-[#E6FDF4] text-[#00C26F] p-4 rounded-xl text-xs font-semibold flex items-start gap-2 border border-[#00C26F]/10 mb-4">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 text-[#00C26F] mt-0.5" />
                      <p>Good news! This medicine does not require a doctor's prescription. You can reserve it directly below.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Quantity Required & Additional Notes</label>
                      <textarea
                        value={prescriptionNotes}
                        onChange={(e) => setPrescriptionNotes(e.target.value)}
                        rows={3}
                        required
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none placeholder-gray-400 h-24"
                        placeholder="E.g. I need 2 strips (20 tablets)..."
                      />
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={uploading || !prescriptionNotes.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-[0.98]"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 spin" /> : <Upload className="w-4 h-4" />}
                        <span>{uploading ? 'Processing...' : 'Reserve Medicine'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  // File Upload Form (Prescription Required or Default)
                  <form onSubmit={handlePrescriptionUpload} className="space-y-5">
                    {med && med.requires_prescription === 1 && (
                       <div className="bg-[#EDF5FF] text-[#0052FF] p-4 rounded-xl text-xs font-semibold flex items-start gap-2 border border-[#0052FF]/10 mb-4">
                         <ShieldCheck className="w-4 h-4 flex-shrink-0 text-[#0052FF] mt-0.5" />
                         <p>This medicine requires a valid doctor's prescription. Please upload it below to proceed with the reservation.</p>
                       </div>
                    )}

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Upload Prescription File</label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col justify-center items-center px-6 py-8 border border-blue-200 border-dashed rounded-xl bg-[#F8FAFF] hover:bg-[#F0F5FF] cursor-pointer transition-all duration-300 group"
                      >
                        <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-blue-50 flex items-center justify-center mb-3 transition-transform group-hover:scale-105 duration-300 text-blue-500">
                          <Upload className="w-5 h-5" />
                        </div>
                        
                        <div className="flex flex-col items-center justify-center text-center">
                          <span className="font-bold text-blue-600 text-sm">Drag & drop your file here</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="hidden"
                            accept=".jpg,.jpeg,.png,.pdf"
                            ref={fileInputRef}
                            onChange={(e) => setPrescriptionFile(e.target.files[0])}
                          />
                          <p className="text-xs text-gray-500 font-medium mt-1">PNG, JPG, PDF up to 10MB</p>
                          <p className="text-[11px] font-bold text-amber-600 mt-1 px-3 py-0.5 bg-amber-50 rounded-full">Note: Only 1 prescription can be uploaded per order.</p>
                        </div>
                        
                        {prescriptionFile && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="mt-4 flex items-center gap-3 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm w-full max-w-xs"
                          >
                            <div className="bg-blue-50 p-2 rounded-md text-blue-600">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="text-left flex-1 overflow-hidden">
                              <p className="text-sm font-bold text-gray-900 truncate">{prescriptionFile.name}</p>
                              <p className="text-[10px] text-gray-500 font-semibold uppercase">{(prescriptionFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button 
                              onClick={() => {
                                setPrescriptionFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">Additional Notes (Optional)</label>
                      <div className="relative">
                        <div className="absolute top-3.5 left-4 text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </div>
                        <textarea
                          value={prescriptionNotes}
                          onChange={(e) => setPrescriptionNotes(e.target.value)}
                          rows={2}
                          className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none placeholder-gray-400 h-20"
                          placeholder="E.g. Please provide generic brands if available, or I need 2 weeks supply."
                        />
                      </div>
                    </div>

                    <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-4 mt-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreeOriginal}
                          onChange={(e) => setAgreeOriginal(e.target.checked)}
                          className="mt-1 w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="text-sm">
                          <span className="block font-bold text-amber-900 mb-0.5">Mandatory Requirement</span>
                          <span className="text-amber-800/90 leading-relaxed text-xs">
                            I understand that I must bring the <strong>physical original prescription</strong> with me to the pharmacy when picking up these medicines.
                          </span>
                        </div>
                      </label>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={uploading || !prescriptionFile || !agreeOriginal}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-[0.98]"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 spin" /> : <Upload className="w-4 h-4" />}
                        <span>{uploading ? 'Sending...' : 'Send Prescription'}</span>
                      </button>
                    </div>
                  </form>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
