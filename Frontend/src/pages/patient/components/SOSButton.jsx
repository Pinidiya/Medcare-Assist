import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function SOSButton({ onPress }) {
  const [pressed, setPressed] = useState(false);
  const handlePress = () => {
    setPressed(true);
    onPress();
    setTimeout(() => setPressed(false), 3000);
  };
  return (
    <button
      onClick={handlePress}
      className={`px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-300 shadow-md ${
        pressed
          ? 'bg-red-700 scale-95 opacity-90'
          : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-200/50'
      }`}>
      <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${pressed ? 'animate-bounce' : ''}`} strokeWidth={2.5} />
      <span className="whitespace-nowrap uppercase tracking-wider text-[11px] sm:text-[13px]">
        {pressed ? 'Help Coming!' : 'Emergency SOS'}
      </span>
    </button>
  );
}
