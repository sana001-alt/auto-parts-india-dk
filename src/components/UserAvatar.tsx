import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";

export interface UserAvatarProps {
  userId?: string;
  name?: string;
  photoURL?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  isOnline?: boolean;
  showOnlineBadge?: boolean;
  showVerifiedBadge?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  interactive?: boolean;
  title?: string;
  id?: string;
}

const sizeClasses = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-xl",
  "2xl": "w-22 h-22 text-2xl"
};

const badgeSizeClasses = {
  xs: "w-2 h-2 border-[1px]",
  sm: "w-2.5 h-2.5 border-[1.5px]",
  md: "w-3 h-3 border-2",
  lg: "w-3.5 h-3.5 border-2",
  xl: "w-4 h-4 border-2",
  "2xl": "w-5 h-5 border-3"
};

const avatarGradients = [
  "from-blue-600 via-indigo-600 to-indigo-800",
  "from-indigo-600 via-purple-600 to-purple-800",
  "from-teal-600 via-emerald-600 to-emerald-800",
  "from-sky-600 via-blue-600 to-indigo-700",
  "from-slate-700 via-slate-800 to-slate-950",
  "from-amber-600 via-orange-600 to-red-600",
  "from-rose-600 via-pink-600 to-purple-700"
];

export function getAvatarGradient(idOrName?: string): string {
  if (!idOrName) return avatarGradients[0];
  const charCodeSum = idOrName
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return avatarGradients[charCodeSum % avatarGradients.length];
}

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return "U";
  const clean = name.trim().replace(/@.+/, ""); // remove email domain if present
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase();
}

export default function UserAvatar({
  userId,
  name = "User",
  photoURL,
  size = "md",
  isOnline = false,
  showOnlineBadge = false,
  showVerifiedBadge = false,
  onClick,
  className = "",
  interactive = false,
  title,
  id
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [photoURL]);
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const badgeClass = badgeSizeClasses[size] || badgeSizeClasses.md;
  const initials = getInitials(name);
  const gradient = getAvatarGradient(userId || name);

  const isClickable = interactive || !!onClick;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick(e);
    }
  };

  const effectivePhoto = photoURL && !imageError ? photoURL : null;

  return (
    <div
      id={id}
      title={title || (isClickable ? `View ${name}'s Profile` : name)}
      onClick={isClickable ? handleClick : undefined}
      className={`relative inline-flex shrink-0 select-none rounded-full ${
        isClickable
          ? "cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95 group focus:outline-none"
          : ""
      } ${className}`}
    >
      <div
        className={`${sizeClass} rounded-full overflow-hidden flex items-center justify-center font-extrabold text-white shadow-xs relative bg-slate-900`}
      >
        {effectivePhoto ? (
          <img
            key={effectivePhoto}
            src={effectivePhoto}
            alt={name}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-extrabold tracking-wider`}
          >
            <span>{initials}</span>
          </div>
        )}
      </div>

      {/* Online presence indicator */}
      {showOnlineBadge && isOnline && (
        <span
          className={`absolute bottom-0 right-0 ${badgeClass} bg-emerald-500 rounded-full border-white shadow-xs`}
          title="Online"
        />
      )}

      {/* Verified Shield Overlay */}
      {showVerifiedBadge && (
        <span
          className="absolute -bottom-0.5 -right-0.5 bg-blue-600 text-white rounded-full p-0.5 shadow-xs border border-white"
          title="Verified Member"
        >
          <ShieldCheck size={size === "2xl" ? 16 : size === "xl" ? 14 : 10} />
        </span>
      )}
    </div>
  );
}
