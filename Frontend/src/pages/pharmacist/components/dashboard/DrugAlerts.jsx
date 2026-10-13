import { usePharmacyData } from '../../hooks/usePharmacyData';
import { AlertTriangle, Eye, Loader2, ArrowRight } from 'lucide-react';
import Card from '../../../../components/common/Card';
import { getMedicineUnit } from '../../../../utils/medicineUnit';

export default function DrugAlerts() {
  const { inventoryItems, loading, navigateTo } = usePharmacyData();

  const lowStockItems = (inventoryItems || [])
    .filter((item) => parseInt(item.quantity) <= 10)
    .slice(0, 3);

  const totalLow = (inventoryItems || []).filter((item) => parseInt(item.quantity) <= 10).length;

  function goToInventory() {
    if (navigateTo) navigateTo('inventory');
  }

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
      {/* Header — clicking title also goes to inventory */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToInventory}
          className="flex items-center gap-2 group cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <h2 className="text-base font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">
            Low Stock Alerts
          </h2>
          {totalLow > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
              {totalLow}
            </span>
          )}
        </button>
        {totalLow > 3 && (
          <span className="text-[11px] text-gray-400">+{totalLow - 3} more</span>
        )}
      </div>

      {lowStockItems.length > 0 ? (
        <div className="space-y-2">
          {lowStockItems.map((item, i) => (
            <button
              key={i}
              onClick={goToInventory}
              className="w-full text-left bg-rose-50 border border-rose-200 rounded-xl p-3 hover:bg-rose-100 hover:border-rose-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-rose-100 shrink-0">
                  <span className="text-sm font-bold text-rose-600">
                    {item.brand_name?.charAt(0) || 'M'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {item.brand_name || 'Medicine'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{item.generic_name || ''}</p>
                  <p className="text-xs font-bold text-rose-600 mt-0.5">
                    {item.quantity} {getMedicineUnit(item, item.quantity)} remaining
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-500">No low stock alerts</p>
        </div>
      )}

      {/* View Inventory button */}
      <button
        onClick={goToInventory}
        className="w-full mt-3 inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-[#1A73E8] hover:text-white hover:border-[#1A73E8] transition-all duration-200 cursor-pointer"
      >
        <Eye className="w-3.5 h-3.5" />
        View Inventory
        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
      </button>
    </Card>
  );
}
