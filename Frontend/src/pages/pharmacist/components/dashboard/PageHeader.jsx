import { ChevronRight } from 'lucide-react';
import pharmacyImage from '../../../../assets/pharmcy image.png';

export default function PageHeader({
  activePage = 'dashboard',
  pharmacyName = '',
  pharmacistName = '',
}) {
  let pageTitles = {
    dashboard: 'Dashboard',
    prescriptions: 'Prescriptions',
    messages: 'Patient Orders',
    'order-history': 'Order History',
    inventory: 'Inventory',
    settings: 'Settings',
  };
  let pageTitle = pageTitles[activePage] || 'Dashboard';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-['Inter'] font-normal">
            Home
          </span>
          <ChevronRight className="w-[3.7px] h-[6px] text-[#64748B]" strokeWidth={3} />
          <span className="text-xs text-[#004AC6] font-['Inter'] font-bold">
            {pageTitle}
          </span>
        </div>

        <h1 className="text-[#004AC6] text-2xl md:text-[32px] font-['Hanken_Grotesk'] font-extrabold leading-tight md:leading-[38.4px]">
          {pharmacyName || 'Pharmacy'}
        </h1>

        <p className="text-[#64748B] text-sm md:text-base font-['Inter'] font-normal leading-[25.6px]">
          {pharmacistName ? `Welcome ${pharmacistName}` : ''}
        </p>
      </div>

      <img
        src={pharmacyImage}
        alt="City Pharmacy"
        className="object-contain shrink-0 hidden md:block"
        style={{ width: 314, height: 209 }}
      />
    </div>
  );
}
