import { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle, Package, X } from 'lucide-react';
import { getMedicineUnit } from '../utils/medicineUnit';

const API = import.meta.env.VITE_API_BASE_URL;

export default function QuotationView({ orderId, onClose }) {
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/shared/get_quotation.php?order_id=${orderId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') setQuotation(d.data);
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Order Quotation</h3>
              <p className="text-sm text-gray-500">Order #{String(orderId).padStart(6, '0')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 text-blue-500 spin mb-4" />
              <p className="text-gray-500 font-medium">Loading quotation details...</p>
            </div>
          ) : !quotation ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No quotation found for this order.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Prescribed Items */}
              {quotation.prescribed.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" /> Prescribed Medications
                  </h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Medicine</th>
                          <th className="px-4 py-3 font-semibold text-center">Qty</th>
                          <th className="px-4 py-3 font-semibold text-right">Unit Price</th>
                          <th className="px-4 py-3 font-semibold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {quotation.prescribed.map((item, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-900">{item.medicine_name}</p>
                              <p className="text-xs text-gray-500">{item.generic_name}</p>
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-gray-700">
                              {item.quantity} <span className="text-xs text-gray-400 font-normal">{getMedicineUnit(item, item.quantity)}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">Rs. {parseFloat(item.unit_price).toFixed(2)} / {getMedicineUnit(item, 1)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">Rs. {parseFloat(item.subtotal).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-right text-sm font-semibold text-gray-600">
                    Prescribed Total: <span className="text-gray-900">Rs. {parseFloat(quotation.prescribed_total).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Manual OTC Items */}
              {quotation.manual_otc.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-500" /> Over The Counter (Manual)
                  </h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Item</th>
                          <th className="px-4 py-3 font-semibold text-center">Qty</th>
                          <th className="px-4 py-3 font-semibold text-right">Unit Price</th>
                          <th className="px-4 py-3 font-semibold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {quotation.manual_otc.map((item, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-900">{item.medicine_name}</p>
                              <p className="text-xs text-gray-500">{item.generic_name}</p>
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-gray-700">
                              {item.quantity} <span className="text-xs text-gray-400 font-normal">{getMedicineUnit(item, item.quantity)}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">Rs. {parseFloat(item.unit_price).toFixed(2)} / {getMedicineUnit(item, 1)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">Rs. {parseFloat(item.subtotal).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-right text-sm font-semibold text-gray-600">
                    OTC Total: <span className="text-gray-900">Rs. {parseFloat(quotation.manual_otc_total).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Grand Total */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-blue-900">Grand Total</h4>
                  <p className="text-sm text-blue-700">Please pay this amount to confirm your reservation.</p>
                </div>
                <div className="text-3xl font-black text-blue-700">
                  Rs. {parseFloat(quotation.grand_total).toFixed(2)}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
