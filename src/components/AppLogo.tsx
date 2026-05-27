import React from "react";

interface AppLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  lightText?: boolean;
  vertical?: boolean;
  titleClassName?: string;
  subtitleClassName?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 48,
  className = "",
  showText = false,
  lightText = false,
  vertical = false,
  titleClassName = "",
  subtitleClassName = "",
}) => {
  return (
    <div className={`flex ${vertical ? "flex-col items-center text-center gap-4" : "items-center gap-3"} ${className}`}>
      {/* SVG Icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-md hover:scale-105 transition-transform duration-300"
      >
        <defs>
          {/* Radial glow for gold coin */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          {/* Cyan/Blue Circle Gradient */}
          <linearGradient id="circleGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="60%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#115e59" />
          </linearGradient>

          {/* Letter K Stem Gradient */}
          <linearGradient id="kStemGrad" x1="70" y1="55" x2="70" y2="145" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0e9f6e" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>

          {/* Upward Growth Arrow Gradient */}
          <linearGradient id="arrowGrad" x1="70" y1="110" x2="140" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Golden Coin Gradient */}
          <linearGradient id="goldGrad" x1="125" y1="35" x2="165" y2="75" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="30%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {/* Double-ringed Cyan/Teal Circular Frame */}
        <circle 
          cx="100" 
          cy="100" 
          r="82" 
          stroke="url(#circleGrad)" 
          strokeWidth="8" 
          fill="none" 
        />
        <circle 
          cx="100" 
          cy="100" 
          r="72" 
          stroke="white" 
          strokeWidth="2" 
          strokeOpacity="0.4"
          fill="none" 
        />

        {/* Vertical rounded stem of "K" */}
        <rect 
          x="68" 
          y="55" 
          width="18" 
          height="90" 
          rx="9" 
          fill="url(#kStemGrad)" 
        />

        {/* Diagonal lower-right rounded leg/loop of "K" */}
        <path 
          d="M 80 100 C 95 105, 112 145, 136 145 C 148 145, 148 132, 148 132" 
          stroke="url(#kStemGrad)" 
          strokeWidth="18" 
          strokeLinecap="round" 
          fill="none"
        />

        {/* Energetic Upward Trend Arrow (Diagonal upper-right leg of "K") */}
        {/* Dynamic line connecting middle-left to top-right arrowhead */}
        <path 
          d="M 76 102 L 126 60" 
          stroke="url(#arrowGrad)" 
          strokeWidth="16" 
          strokeLinecap="round" 
        />
        {/* Arrowhead */}
        <path 
          d="M 112 52 L 138 52 L 138 78 Z" 
          fill="url(#arrowGrad)" 
          stroke="url(#arrowGrad)"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Subtle rays for gold coin */}
        <line x1="145" y1="26" x2="145" y2="29" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="126" y1="36" x2="129" y2="39" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="164" y1="36" x2="161" y2="39" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" />

        {/* Shiny 3D Gold Coin with "Rp" */}
        <circle 
          cx="145" 
          cy="53" 
          r="23" 
          fill="url(#goldGrad)" 
          stroke="#fff" 
          strokeWidth="1.5" 
          filter="url(#glow)"
        />
        {/* Inner coin accent ring */}
        <circle 
          cx="145" 
          cy="53" 
          r="18" 
          stroke="#fbbf24" 
          strokeWidth="1.5"
          strokeDasharray="4,2"
          fill="none" 
        />
        {/* "Rp" Text in gold coin */}
        <text 
          x="145" 
          y="60" 
          textAnchor="middle" 
          fill="white" 
          fontSize="18" 
          fontWeight="900" 
          fontFamily="ui-sans-serif, system-ui, -apple-system, sans-serif"
          className="select-none"
          style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}
        >
          Rp
        </text>
      </svg>

      {/* Brand Text Block (Image 2 style) */}
      {showText && (
        <div className={`flex flex-col leading-tight ${vertical ? "text-center items-center" : "text-left"}`}>
          <span className={`text-2xl font-black tracking-tight ${titleClassName || (lightText ? "text-white" : "text-[#1a2e22] dark:text-emerald-50")}`}>
            Keuanganku
          </span>
          <span className={`text-[10px] font-bold tracking-wide uppercase ${subtitleClassName || (lightText ? "text-cyan-200" : "text-slate-500 dark:text-emerald-300/60")}`}>
            Catatan Keuangan Pintar
          </span>
        </div>
      )}
    </div>
  );
};
