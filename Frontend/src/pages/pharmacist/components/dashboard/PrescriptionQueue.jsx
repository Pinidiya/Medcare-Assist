import { usePharmacyData } from '../../hooks/usePharmacyData';
import { useNavigate } from 'react-router-dom';
import { Check, ExternalLink, Loader2 } from 'lucide-react';
import Card from '../../../../components/common/Card';
import Button from '../../../../components/common/Button';

export default function PrescriptionQueue() {
  const navigate = useNavigate();
  const { stats, pendingReservations, loading, navigateTo, setSelectedConversationId, setAutoOpenOrderId } = usePharmacyData();

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Pending Reservation Requests
        </h2>
        <button
          onClick={() => navigateTo && navigateTo('prescriptions')}
          className="text-xs text-[#1A73E8] hover:text-[#1557B0] font-medium flex items-center gap-1 cursor-pointer"
        >
          History
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {pendingReservations.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6 text-gray-300" />
          </div>
          No pending reservations
        </div>
      ) : (
        <div className="space-y-3">
          {pendingReservations.slice(0, 5).map((item) => (
            <div
              key={item.reservation_id}
              className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {item.patient_name?.charAt(0) || 'P'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.patient_name || 'Unknown Patient'}
                  </p>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                    {item.status || 'Pending'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.patient_email || ''}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (setSelectedConversationId) setSelectedConversationId(item.reservation_id);
                    if (setAutoOpenOrderId) setAutoOpenOrderId(item.reservation_id);
                    if (navigateTo) navigateTo('messages');
                  }}
                  className="bg-[#1A73E8] text-white hover:bg-[#1557B0]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Request
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] text-gray-400 italic text-center">
        {stats.pendingReview} pending {stats.pendingReview === 1 ? 'request' : 'requests'}
      </p>
    </Card>
  );
}
