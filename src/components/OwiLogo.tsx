import React from "react";

interface OwiLogoProps {
  size?: number;
  className?: string;
}

export const OwiLogo: React.FC<OwiLogoProps> = ({ size = 48, className = "" }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} select-none pointer-events-none`}
    >
      <defs>
        {/* Glow fill for gold coin */}
        <linearGradient id="goldCoinsGrad" x1="74" y1="20" x2="86" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        {/* Shadow filter */}
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Background Soft Circle Aura */}
      <circle cx="50" cy="50" r="45" fill="#f4fdd9" fillOpacity="0.3" filter="url(#softShadow)" />

      {/* Little brown twig branch */}
      <rect x="24" y="80" width="52" height="6" rx="3" fill="#8d5b4c" />

      {/* Owl Feet */}
      <ellipse cx="42" cy="79" rx="3.5" ry="2.5" fill="#f59e0b" />
      <ellipse cx="58" cy="79" rx="3.5" ry="2.5" fill="#f59e0b" />

      {/* Owl Body */}
      <path
        d="M 50 18 C 31 18 26 33 26 53 C 26 73 36 78 50 78 C 64 78 74 73 74 53 C 74 33 69 18 50 18 Z"
        fill="#5c8a68"
      />

      {/* Owl Belly (Chest) */}
      <path
        d="M 50 46 C 37 46 34 56 34 64 C 34 72 40 74 50 74 C 60 74 66 72 66 64 C 66 56 63 46 50 46 Z"
        fill="#e4ffe1"
      />

      {/* Chest Feathers Detail */}
      <path d="M 45 54 Q 47 56 49 54" stroke="#5c8a68" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M 51 54 Q 53 56 55 54" stroke="#5c8a68" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M 41 60 Q 43 62 45 60" stroke="#5c8a68" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M 48 60 Q 50 62 52 60" stroke="#5c8a68" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M 55 60 Q 57 62 59 60" stroke="#5c8a68" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* Side Wings */}
      <path d="M 26 43 C 18 48 20 63 28 68" stroke="#41634b" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M 74 43 C 82 48 80 63 72 68" stroke="#41634b" strokeWidth="3.5" strokeLinecap="round" fill="none" />

      {/* Owl Ears (Tufts) */}
      <path d="M 32 21 L 24 9 L 39 18 Z" fill="#41634b" />
      <path d="M 68 21 L 76 9 L 61 18 Z" fill="#41634b" />

      {/* Big Wise Eyes Background */}
      <circle cx="39" cy="36" r="10.5" fill="white" />
      <circle cx="61" cy="36" r="10.5" fill="white" />

      {/* Glowing Big Pupils */}
      <circle cx="40" cy="36" r="5.5" fill="#1b2e21" />
      <circle cx="60" cy="36" r="5.5" fill="#1b2e21" />

      {/* Eye Sparkles/Highlights for ultimate cuteness */}
      <circle cx="38.5" cy="33.5" r="2.2" fill="white" />
      <circle cx="42.2" cy="38" r="1" fill="white" />
      <circle cx="58.5" cy="33.5" r="2.2" fill="white" />
      <circle cx="62.2" cy="38" r="1" fill="white" />

      {/* Cute Round Golden Glasses */}
      <circle cx="39" cy="36" r="11.5" stroke="#fbbf24" strokeWidth="2.2" fill="none" />
      <circle cx="61" cy="36" r="11.5" stroke="#fbbf24" strokeWidth="2.2" fill="none" />
      <line x1="48" y1="36" x2="52" y2="36" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />

      {/* Cute Yellow Beak */}
      <path d="M 50 42 L 46 47 L 54 47 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" strokeLinejoin="round" />

      {/* Floating Sparkling Gold Coin near Owi */}
      <circle cx="80" cy="26" r="5.5" fill="url(#goldCoinsGrad)" stroke="#fbbf24" strokeWidth="1" filter="url(#softShadow)" />
      <path d="M 80 23.5 L 80 28.5 M 77.5 26 L 82.5 26" stroke="white" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
};
