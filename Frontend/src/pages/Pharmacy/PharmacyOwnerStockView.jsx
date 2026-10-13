import { useState, useEffect } from 'react';
import { Package, Search, Loader2, Calendar } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL;

export default function PharmacyOwnerStockView() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchBatches = () => {
    setLoading(true);
    fetch(`${API}/pharmacy/get_stock.php`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success') setBatches(d.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const filteredBatches = batches.filter(b => 
    b.brand_name?.toLowerCase().includes(search.toLowerCase()) || 
    b.batch_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" /> Pharmacy Stock & Batches
          </h2>
          <p className="text-sm text-gray-500 mt-1">View available medicines and their current batch quantities.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search by Medicine or Batch No..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-500 spin" />
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-14 h-14 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No stock found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-4">Medicine</th>
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4">Batch No</th>
                  <th className="px-6 py-4">Expiry Date</th>
                  <th className="px-6 py-4 text-center">Unit Price</th>
                  <th className="px-6 py-4 text-center">Qty Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredBatches.map(b => {
                  const expDate = new Date(b.expiry_date);
                  const isExpiringSoon = (expDate - new Date()) / (1000 * 60 * 60 * 24) < 30;
                  const isExpired = expDate < new Date();

                  return (
                    <tr key={b.batch_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{b.brand_name}</p>
                        <p className="text-xs text-gray-500">{b.generic_name}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                        {b.supplier_name || '—'}
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-700 font-semibold">{b.batch_number}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className={`w-4 h-4 flex-shrink-0 ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : 'text-gray-400'}`} />
                          <div>
                            <span className={`block text-sm font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-gray-700'}`}>
                              {expDate.toLocaleDateString()}
                            </span>
                            {isExpired && <span className="text-xs text-red-500 font-bold">Expired</span>}
                            {isExpiringSoon && <span className="text-xs text-amber-500 font-bold">Expiring Soon</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-gray-800">
                        {b.unit_price ? `Rs. ${parseFloat(b.unit_price).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${b.quantity <= 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {b.quantity}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
