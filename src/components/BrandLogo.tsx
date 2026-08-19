import React, { useId } from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "full" | "icon" | "horizontal";
  theme?: "light" | "dark";
  showTagline?: boolean;
  className?: string;
}

export function GearSpeedLogoIcon({
  size = 32,
  className = ""
}: {
  size?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const grad1 = `gearSpeedGrad_${id}`;
  const grad2 = `gearAccentGrad_${id}`;
  const grad3 = `arrowCoreGrad_${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 block bg-transparent ${className}`}
      aria-label="Auto Parts Gear & Speed Arrow Logo"
    >
      <defs>
        {/* Dynamic Cyan to Electric Blue Speed Gradient */}
        <linearGradient id={grad1} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D2FF" />
          <stop offset="45%" stopColor="#0099FF" />
          <stop offset="100%" stopColor="#0055FF" />
        </linearGradient>

        {/* High-Contrast Secondary Cyan Gradient */}
        <linearGradient id={grad2} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Inner Arrow Light Core */}
        <linearGradient id={grad3} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>
      </defs>

      {/* 1. Precision Automotive Gear Ring (8 Chamfered Teeth with center bore) */}
      <path
        d="
          M 45 6 L 55 6 L 57 14 L 63 16 L 69 10 L 76 17 L 71 23 L 76 29 L 84 27 L 87 36 L 80 40 L 81 47 L 89 50 L 88 60 L 80 62 L 78 69 L 84 75 L 78 82 L 71 77 L 65 82 L 66 90 L 56 92 L 53 84 L 47 84 L 44 92 L 34 90 L 35 82 L 29 77 L 22 82 L 16 75 L 22 69 L 20 62 L 12 60 L 11 50 L 19 47 L 20 40 L 13 36 L 16 27 L 24 29 L 29 23 L 24 17 L 31 10 L 37 16 L 43 14 Z
          M 50 25 A 25 25 0 1 0 50 75 A 25 25 0 1 0 50 25 Z
        "
        fill={`url(#${grad1})`}
        fillRule="evenodd"
        opacity="0.95"
      />

      {/* 2. Gear Teeth Accents / Facets */}
      <circle cx="50" cy="50" r="28" stroke="#00D2FF" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="3 3" />

      {/* 3. Primary Forward Speed Arrow (Integrated & Thrusting Forward) */}
      <path
        d="M 50 12 L 78 52 L 64 52 L 50 32 L 36 52 L 22 52 Z"
        fill={`url(#${grad1})`}
      />

      {/* 4. High-Contrast Inner Precision Speed Chevron */}
      <path
        d="M 50 22 L 70 51 L 60 51 L 50 36 L 40 51 L 30 51 Z"
        fill={`url(#${grad3})`}
      />

      {/* 5. Trailing Dynamic Speed Fin */}
      <path
        d="M 50 44 L 64 64 L 56 64 L 50 55 L 44 64 L 36 64 Z"
        fill={`url(#${grad2})`}
        opacity="0.9"
      />

      {/* 6. Aerodynamic Anchor Diamond */}
      <path
        d="M 50 68 L 57 78 L 50 86 L 43 78 Z"
        fill={`url(#${grad3})`}
      />
    </svg>
  );
}

export default function BrandLogo({
  size = "md",
  variant = "full",
  theme = "dark",
  showTagline = false,
  className = ""
}: BrandLogoProps) {
  const iconPixelSizes: Record<string, number> = {
    sm: 28,
    md: 32,
    lg: 38,
    xl: 48,
    "2xl": 64
  };

  const textSizes = {
    sm: "text-xs font-black",
    md: "text-sm font-black",
    lg: "text-base font-black",
    xl: "text-lg font-black",
    "2xl": "text-2xl font-black"
  };

  const iconDim = iconPixelSizes[size] || iconPixelSizes.md;

  if (variant === "icon") {
    return (
      <div className={`inline-flex items-center justify-center bg-transparent shrink-0 ${className}`}>
        <GearSpeedLogoIcon size={iconDim} />
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-row items-center gap-2 select-none shrink-0 bg-transparent ${className}`}>
      {/* Option 1 SVG Logo (Gear + Speed Arrow) */}
      <GearSpeedLogoIcon size={iconDim} />

      {/* Text Brand */}
      <div className="flex flex-col justify-center shrink-0">
        <div className={`tracking-tight inline-flex flex-row items-center gap-1.5 ${textSizes[size]}`}>
          <span className={theme === "dark" ? "text-white font-black tracking-tight" : "text-[#0B1220] font-black tracking-tight"}>
            AUTO PARTS
          </span>
          <span className="text-white font-black uppercase tracking-wider text-[0.62em] px-1.5 py-0.5 rounded bg-[#1565FF] shrink-0 leading-tight">
            INDIA
          </span>
        </div>

        {showTagline && (
          <span
            className={`text-[8.5px] font-bold tracking-wider uppercase mt-0.5 ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Automotive Marketplace
          </span>
        )}
      </div>
    </div>
  );
}



