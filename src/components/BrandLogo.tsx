import React, { useId } from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  variant?: "full" | "icon" | "horizontal";
  theme?: "light" | "dark";
  showTagline?: boolean;
  className?: string;
}

export function AutoPartsLogoIcon({
  size = 32,
  className = ""
}: {
  size?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const gradGear = `gradGear_${id}`;
  const gradBg = `gradBg_${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 block bg-transparent ${className}`}
      aria-label="Auto Parts India Car Gear Wrench Logo"
    >
      <defs>
        <linearGradient id={gradGear} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
        <linearGradient id={gradBg} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#0B1220" />
        </linearGradient>
      </defs>

      {/* Rounded Navy Shield Container */}
      <rect width="100" height="100" rx="22" fill={`url(#${gradBg})`} />
      <rect x="2" y="2" width="96" height="96" rx="20" stroke="#1E293B" strokeWidth="1.5" fill="none" />

      {/* 1. Precision Outer Gear (Orange) */}
      <circle cx="50" cy="50" r="28" stroke={`url(#${gradGear})`} strokeWidth="7" strokeDasharray="14 7" fill="none" />
      <circle cx="50" cy="50" r="23" stroke="#0B1220" strokeWidth="2" fill="none" />

      {/* 2. Crossed Mechanic Wrench (White) */}
      <path
        d="M 32 68 L 68 32 M 63 27 L 73 37 M 67 25 L 75 33"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="70" cy="30" r="7" stroke="#FFFFFF" strokeWidth="4" fill="none" />
      <circle cx="30" cy="70" r="5" fill="#FFFFFF" />

      {/* 3. Automotive Car Silhouette (White & Orange) */}
      <path
        d="M 40 44 C 42 36 58 36 60 44 L 66 49 C 69 51 70 55 68 60 L 66 65 L 34 65 L 32 60 C 30 55 31 51 34 49 Z"
        fill="#FFFFFF"
      />
      <path
        d="M 43 45 C 45 40 55 40 57 45 L 60 49 L 40 49 Z"
        fill="#0B1220"
      />

      {/* Headlights (Vivid Orange) */}
      <circle cx="38" cy="56" r="2.5" fill="#FF7A00" />
      <circle cx="62" cy="56" r="2.5" fill="#FF7A00" />

      {/* Front Radiator Grille */}
      <rect x="44" y="54" width="12" height="5" rx="1.5" fill="#0B1220" />
      <rect x="46" y="55.5" width="8" height="1" fill="#FF7A00" />
    </svg>
  );
}

export function GearSpeedLogoIcon({
  size = 32,
  className = ""
}: {
  size?: number;
  className?: string;
}) {
  return <AutoPartsLogoIcon size={size} className={className} />;
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
    md: 34,
    lg: 40,
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
        <AutoPartsLogoIcon size={iconDim} />
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-row items-center gap-2.5 select-none shrink-0 bg-transparent ${className}`}>
      {/* Car + Gear + Wrench Logo Icon */}
      <AutoPartsLogoIcon size={iconDim} />

      {/* Text Brand */}
      <div className="flex flex-col justify-center shrink-0">
        <div className={`tracking-tight inline-flex flex-row items-center gap-1.5 ${textSizes[size]}`}>
          <span className={theme === "dark" ? "text-white font-black tracking-tight" : "text-[#0B1220] font-black tracking-tight"}>
            AUTO PARTS
          </span>
          <span className="text-white font-black uppercase tracking-wider text-[0.62em] px-1.5 py-0.5 rounded bg-[#FF6B00] shrink-0 leading-tight">
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
