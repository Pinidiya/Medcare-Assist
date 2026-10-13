import { Eye, ShieldCheck, Calendar, User, Trash2 } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function PrescriptionTable({ prescriptions, onViewDetails, onVerify, onDelete }) {
  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-14 h-14 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-gray-400 text-sm font-medium">No prescriptions match your search</p>
        <p className="text-gray-300 text-xs mt-1">Try adjusting your search or filter</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {prescriptions.map((rx) => (
          <div
            key={rx.id}
            className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow hover:border-gray-200 transition-all duration-200 p-4 flex flex-col"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="font-bold text-gray-900 text-sm">{rx.id}</span>
                {rx.medication && <p className="text-[11px] text-gray-500 mt-0.5 font-medium truncate max-w-[140px]">{rx.medication}</p>}
              </div>
              <StatusBadge status={rx.status} />
            </div>

            <div className="space-y-1.5 flex-1 mt-1">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="font-medium truncate text-[13px]">{rx.patientName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-[12px]">{rx.date} &bull; {rx.time}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
              <button
                onClick={() => onViewDetails(rx)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-[#1A73E8] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                onClick={() => onDelete(rx)}
                className="inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Delete Prescription"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
      ))}
    </div>
  );
}
