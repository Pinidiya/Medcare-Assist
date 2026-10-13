import { Receipt, MapPin, Phone, User, Calendar, ShieldCheck, Fingerprint, Building2 } from 'lucide-react';
import { getMedicineUnit } from '../../utils/medicineUnit';

export default function GeneratedBill({
  pharmacyName = 'Pharmacy',
  pharmacyAddress = '',
  pharmacyPhone = '',
  reservationId,
  items = [],
  totalAmount = 0,
  pickupPin = '',
  pharmacistNote = '',
  createdAt = '',
  patientName = '',
  paymentStatus = 'pending',
  showPin = true,
  compact = false,
}) {
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);
  const itemCount = items.length;

  return (
    <div className={`bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm ${compact ? 'max-w-sm' : 'max-w-md'} mx-auto`}>
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-[#1A73E8] to-[#1557B0] px-5 py-4 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">{pharmacyName}</h3>
              {pharmacyAddress && (
                <p className="text-[10px] text-white/80 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" /> {pharmacyAddress}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Invoice</p>
            <p className="text-xs font-bold">#{String(reservationId || 0).padStart(5, '0')}</p>
          </div>
        </div>
      </div>

      {/* Pharmacy & Patient Info Grid */}
      <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Pharmacy
          </p>
          <p className="text-xs font-bold text-gray-800">{pharmacyName}</p>
          {pharmacyAddress && (
            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {pharmacyAddress}
            </p>
          )}
          {pharmacyPhone && (
            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3" /> {pharmacyPhone}
            </p>
          )}
        </div>
        <div className="px-4 py-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
            <User className="w-3 h-3" /> Patient
          </p>
          <p className="text-xs font-bold text-gray-800">{patientName || 'N/A'}</p>
          <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3" /> {formattedDate}
          </p>
          <div className="mt-1.5">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
              paymentStatus === 'paid'
                ? 'bg-emerald-100 text-emerald-700'
                : paymentStatus === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600'
            }`}>
              {paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'pending' ? 'Pending' : paymentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Items Grid - Table Layout */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Medicines</p>
          <p className="text-[10px] text-gray-400">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100/80 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-5">Medicine</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-4 text-right">Amount</div>
          </div>

          {/* Table Rows */}
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`grid grid-cols-12 gap-2 px-3 py-2.5 items-center ${
                idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
              } ${idx < items.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="col-span-1">
                <span className="text-[10px] font-bold text-gray-400">{idx + 1}</span>
              </div>
              <div className="col-span-5 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{item.brand_name || 'Medicine'}</p>
                {item.generic_name && (
                  <p className="text-[10px] text-gray-400 truncate">{item.generic_name}</p>
                )}
              </div>
              <div className="col-span-2 text-center">
                <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md inline-block">
                  {item.quantity} <span className="text-[9px] font-normal text-gray-500">{getMedicineUnit(item, item.quantity)}</span>
                </span>
              </div>
              <div className="col-span-4 text-right">
                <span className="text-xs font-bold text-gray-800">
                  Rs. {((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-gray-400">
              No items in this bill
            </div>
          )}
        </div>
      </div>

      {/* Pharmacist Note */}
      {pharmacistNote && (
        <div className="px-5 pb-3">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider mb-0.5">Note</p>
            <p className="text-xs text-amber-800">{pharmacistNote}</p>
          </div>
        </div>
      )}

      {/* Total Amount - Prominent Display */}
      <div className="mx-5 mb-4 bg-gradient-to-r from-[#1A73E8]/5 to-blue-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Total Amount</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Inclusive of all medicines</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-[#1A73E8]">Rs. {parseFloat(totalAmount || 0).toFixed(2)}</p>
            <p className="text-[10px] text-gray-400 font-medium">LKR</p>
          </div>
        </div>
      </div>

      {/* Pickup PIN Section - Eye-catching */}
      {showPin && pickupPin && (
        <div className="mx-5 mb-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100/50 rounded-full -translate-y-4 translate-x-4" />
          <div className="absolute bottom-0 left-0 w-12 h-12 bg-emerald-100/50 rounded-full translate-y-4 -translate-x-4" />
          <div className="relative">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Fingerprint className="w-4 h-4 text-emerald-600" />
              <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-widest">
                Pickup PIN
              </p>
            </div>
            <p className="text-3xl font-black text-emerald-800 tracking-[0.5em] pl-[0.5em] font-mono">
              {pickupPin}
            </p>
            <p className="text-[10px] text-emerald-600/70 mt-2 font-medium">
              Present this PIN at the pharmacy counter to collect your order
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-gray-400 font-medium">
            Generated by {pharmacyName}
          </p>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <p className="text-[10px] text-emerald-600 font-bold">Verified</p>
          </div>
        </div>
      </div>
    </div>
  );
}
