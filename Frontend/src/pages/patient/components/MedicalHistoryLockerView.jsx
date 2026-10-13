import { useState, useEffect, useRef } from 'react';
import { 
  ClipboardList, Eye, FileUp, X, CheckCircle, XCircle, Loader2, Info, Lock, FileText, Clock, AlertTriangle
} from 'lucide-react';
import patientBannerImg from '../../../assets/patient banner.png';

const API = import.meta.env.VITE_API_BASE_URL;

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

export default function MedicalHistoryLockerView() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const fileInputRef = useRef(null);

  const fetchDocuments = () => {
    setLoading(true);
    fetch(`${API}/patient/locker_get.php`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setDocuments(data.data);
        }
      })
      .catch(err => {
        console.error(err);
        setToast({ message: 'Failed to load documents.', type: 'error' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Maximum size is 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    formData.append('document_name', file.name);

    setUploading(true);
    fetch(`${API}/patient/locker_upload.php`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          fetchDocuments(); // Refresh list
        } else {
          alert(data.message || 'Upload failed');
        }
      })
      .catch(err => {
        console.error(err);
        setToast({ message: 'Upload failed. Please try again.', type: 'error' });
      })
      .finally(() => {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  };

  const executeDelete = (locker_id) => {
    
    fetch(`${API}/patient/locker_delete.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ locker_id })
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          fetchDocuments();
        } else {
          alert(data.message);
        }
      })
      .catch(err => {
        console.error(err);
        setToast({ message: 'Failed to delete document.', type: 'error' });
      })
      .finally(() => {
        setDeleteConfirmId(null);
      });
  };

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-10 h-10 text-blue-500 spin" />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="bg-[#f0f5fa] rounded-3xl overflow-hidden relative shadow-sm border border-blue-100/50 flex flex-col md:flex-row items-stretch justify-between min-h-[160px]">
        <div className="p-5 md:p-6 flex-1 w-full md:pr-0 z-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-extrabold text-[#1e293b]">Medical Locker</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4 max-w-md">
            Your encrypted, safe digital space for storing past prescriptions, lab reports, and medical documents.
          </p>
          <div className="flex items-center gap-3 w-full max-w-3xl">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 text-sm"
            >
              {uploading ? <Loader2 className="w-4 h-4 spin" /> : <FileUp className="w-4 h-4" />}
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>
        <div className="w-full md:w-[35%] h-40 md:h-[220px] absolute md:relative right-0 bottom-0 pointer-events-none flex justify-end">
          <img src={patientBannerImg} alt="Medical Locker" className="h-full object-cover md:object-contain object-right w-full opacity-30 md:opacity-100" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 20%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%)' }} />
        </div>
      </div>
      <div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden" 
        />
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
            <Lock className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Your Locker is Empty</h3>
          <p className="text-gray-500 text-sm mt-2 mb-6">Upload your first document securely. Maximum size 5MB (PDF/JPG/PNG).</p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-teal-600 font-bold hover:underline"
          >
            Click here to browse files
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => (
            <div key={doc.locker_id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col">
              <div className="flex items-start justify-between mb-4 flex-1">
                <div className="flex items-start gap-3 w-full">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${doc.file_type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                    {doc.file_type === 'pdf' ? <FileText className="w-6 h-6" /> : <img src={`${API}/patient/locker_view.php?id=${doc.locker_id}`} alt="Preview" className="w-12 h-12 object-cover rounded-xl" />}
                  </div>
                  <div className="overflow-hidden flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm truncate block" title={doc.document_name}>{doc.document_name}</h3>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" /> {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                <a 
                  href={`${API}/patient/locker_view.php?id=${doc.locker_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-50 hover:bg-teal-50 text-gray-700 hover:text-teal-700 rounded-lg text-xs font-bold transition-colors"
                >
                  <Eye className="w-4 h-4" /> View
                </a>
                <button 
                  onClick={() => setDeleteConfirmId(doc.locker_id)}
                  className="px-3 py-2 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                  title="Delete Document"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scaleIn">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Document?</h2>
              <p className="text-sm text-gray-500 text-center">
                Are you sure you want to permanently delete this document? This action cannot be undone.
              </p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-3 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <div className="w-px bg-gray-100" />
              <button
                onClick={() => executeDelete(deleteConfirmId)}
                className="flex-1 px-4 py-3 text-red-600 font-bold hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

