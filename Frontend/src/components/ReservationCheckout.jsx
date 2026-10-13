import { useState } from 'react';

export default function ReservationCheckout({ reservation, amount, customerDetails, onPaymentSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [agree, setAgree] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const API = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${API}/patient/generate_payhere_hash.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ order_id: reservation.reservation_id, amount: amount, currency: 'LKR' })
      });
      const data = await response.json();

      if (data.status === 'success' && data.hash) {
        const params = {
          sandbox: true,
          merchant_id: data.merchant_id,
          return_url: `${window.location.origin}/patient/reservations`,
          cancel_url: `${window.location.origin}/patient/reservations`,
          notify_url: import.meta.env.VITE_NGROK_URL 
            ? `${import.meta.env.VITE_NGROK_URL}/Project%202.2/Backend/api/payment/payhere_notify.php`
            : `https://medcare-assist.loca.lt/Project%202.2/Backend/api/payment/payhere_notify.php`,
          order_id: data.order_id,
          items: `MedCare Reservation #${data.order_id}`,
          amount: data.amount,
          currency: data.currency,
          first_name: customerDetails?.first_name || 'Patient',
          last_name: customerDetails?.last_name || 'User',
          email: customerDetails?.email || 'patient@example.com',
          phone: customerDetails?.phone || '0771234567',
          address: customerDetails?.address || '123 Hospital Road',
          city: customerDetails?.city || 'Colombo',
          country: 'Sri Lanka',
          hash: data.hash
        };

        // 2. Attach PayHere event listeners
        window.payhere.onCompleted = function onCompleted(orderId) {
          if (onPaymentSuccess) {
            onPaymentSuccess(orderId);
          }
          setLoading(false);
        };

        window.payhere.onDismissed = function onDismissed() {
          setLoading(false);
        };

        window.payhere.onError = function onError(errorMsg) {
          console.error("Payment error:" + errorMsg);
          setError("Gateway validation failed. Please check your card status.");
          setLoading(false);
        };

        // 3. Kickstart the interactive payment popup
        window.payhere.startPayment(params);
      } else {
        setError(data.message || "Unable to configure payment payload.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Network exception. Please check database server logs.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full relative mt-2">
      {error && (
        <div className="p-3 mb-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
          <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-start gap-2.5 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
        <input 
          type="checkbox" 
          id="non-refundable" 
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        <label htmlFor="non-refundable" className="text-xs text-gray-600 cursor-pointer font-medium leading-relaxed">
          I understand that I have carefully verified the invoice above. I acknowledge that payments made to reserve medications are strictly <span className="font-bold text-red-500">non-refundable</span> under any circumstances.
        </label>
      </div>

      <button
        onClick={handlePayment}
        disabled={loading || !agree}
        className="relative overflow-hidden w-full py-4 px-6 rounded-2xl font-extrabold text-sm text-white shadow-[0_8px_30px_rgb(37,99,235,0.2)] bg-gradient-to-r from-[#0052CC] to-[#2563EB] hover:from-[#0047b3] hover:to-[#1d4ed8] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out"></div>
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : (
          <>
            <svg className="w-5 h-5 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="drop-shadow-md tracking-wide">Pay LKR {parseFloat(amount).toFixed(2)} Securely</span>
          </>
        )}
      </button>

      <div className="flex flex-col items-center justify-center gap-1.5 mt-5">
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Secured By</span>
        <img src="https://www.payhere.lk/downloads/images/payhere_short_banner.png" alt="PayHere" className="h-6 object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
      </div>
    </div>
  );
}
