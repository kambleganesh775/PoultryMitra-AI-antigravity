import React from 'react';
import { Sparkles } from 'lucide-react';

interface AppLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 40, className = "", showText = false }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon Mark */}
      <div 
        className="relative flex items-center justify-center flex-shrink-0" 
        style={{ width: size, height: size }}
      >
        {/* Main Background Shape */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl shadow-lg transform -rotate-6 transition-transform hover:rotate-0"></div>
        
        {/* Inner Detail */}
        <div className="absolute inset-1 bg-white/10 rounded-lg"></div>
        
        {/* Custom Chicken Icon (SVG) */}
        <svg 
            width={size * 0.6} 
            height={size * 0.6} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="relative z-10 text-white drop-shadow-sm"
        >
             {/* Tail Feathers */}
             <path d="M4 14c0-2 1.5-3 3-3" />
             <path d="M4 11c0-2 1.5-3 3-3" />
             
             {/* Body & Head */}
             <path d="M7 17.5c0 2 1.5 3 3.5 3h5c2.5 0 4.5-2 4.5-4.5v-6" />
             <path d="M20 10v-3a3 3 0 0 0-6 0v3" />
             
             {/* Comb */}
             <path d="M14 6.5a2 2 0 1 0 2-2" />
             <path d="M16 4.5a2 2 0 1 0 2-2" />

             {/* Beak */}
             <path d="M20 9h2l1 1" />
             
             {/* Eye */}
             <path d="M17 8h.5" strokeWidth="3" />
        </svg>
        
        {/* AI Badge (Sparkles) */}
        <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-[10%] z-20 border-2 border-white shadow-sm flex items-center justify-center">
            <Sparkles size={size * 0.3} className="text-orange-800" fill="currentColor" />
        </div>
      </div>

      {/* Optional Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <h1 className="font-bold text-gray-800 leading-none" style={{ fontSize: size * 0.5 }}>
            Poultry<span className="text-orange-600">Mitra</span>
          </h1>
          <div className="flex items-center gap-1">
             <span className="text-xs font-bold bg-orange-100 text-orange-700 px-1 rounded uppercase tracking-wider scale-90 origin-left">
                AI Powered
             </span>
          </div>
        </div>
      )}
    </div>
  );
};
