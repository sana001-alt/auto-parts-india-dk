import React, { useState } from "react";
import { Image as ImageIcon } from "lucide-react";

interface ResponsiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  aspectRatio?: "16/9" | "1/1" | "4/3" | "auto";
  className?: string;
  containerClassName?: string;
  fallbackIconSize?: number;
  fallbackText?: string;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  showSkeleton?: boolean;
}

export default function ResponsiveImage({
  src,
  alt,
  aspectRatio = "1/1",
  className = "",
  containerClassName = "",
  fallbackIconSize = 24,
  fallbackText,
  rounded = "xl",
  showSkeleton = true,
  ...rest
}: ResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(!src);

  // Aspect ratio classes
  const aspectClassMap = {
    "16/9": "aspect-video",
    "1/1": "aspect-square",
    "4/3": "aspect-4/3",
    "auto": ""
  };

  // Rounded radius classes
  const roundedClassMap = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    "3xl": "rounded-3xl",
    full: "rounded-full"
  };

  const containerRounded = roundedClassMap[rounded] || "rounded-xl";
  const aspectClass = aspectClassMap[aspectRatio] || "aspect-square";

  return (
    <div
      className={`relative w-full overflow-hidden ${aspectClass} ${containerRounded} bg-slate-900 shrink-0 ${containerClassName}`}
    >
      {/* 1. Shimmer Skeleton Animation while loading */}
      {showSkeleton && !isLoaded && !hasError && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center z-1">
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>
      )}

      {/* 2. Primary Responsive Dynamic Image with object-cover and center alignment */}
      {src && !hasError ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover object-center transition-all duration-300 ${
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
          } ${className}`}
          {...rest}
        />
      ) : null}

      {/* 3. Fallback when image is missing or failed to load */}
      {hasError && (
        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center text-blue-300 gap-1 p-2">
          <ImageIcon size={fallbackIconSize} className="text-blue-400/70" />
          {fallbackText && (
            <span className="text-[8px] font-bold tracking-wider uppercase text-slate-300 text-center line-clamp-2 px-1">
              {fallbackText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
