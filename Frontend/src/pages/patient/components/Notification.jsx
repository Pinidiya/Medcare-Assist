import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export default function Notification({ message, type = 'success', onClose }) {
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
