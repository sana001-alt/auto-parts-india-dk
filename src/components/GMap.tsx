import React, { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { Compass, Navigation, ExternalLink, Locate, Loader2 } from "lucide-react";
import { getApproxCoordinates, LatLng } from "../utils/locationHelper";

interface GMapProps {
  lat?: number;
  lng?: number;
  state?: string;
  district?: string;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
  showDetectBtn?: boolean;
}

export default function GMap({
  lat,
  lng,
  state,
  district,
  interactive = false,
  onLocationSelect,
  height = "220px",
  className = "",
  showDetectBtn = false
}: GMapProps) {
  const [coords, setCoords] = useState<LatLng>({ lat: 28.6139, lng: 77.2090 });
  const [isDetecting, setIsDetecting] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerInstanceRef = useRef<L.Marker | null>(null);

  // Sync internal coordinates state with props
  useEffect(() => {
    if (
      lat !== undefined &&
      lat !== null &&
      lng !== undefined &&
      lng !== null &&
      lat !== 0 &&
      lng !== 0 &&
      typeof lat === "number" &&
      typeof lng === "number" &&
      !isNaN(lat) &&
      !isNaN(lng)
    ) {
      setCoords({ lat, lng });
    } else {
      const approx = getApproxCoordinates(state, district);
      setCoords(approx);
    }
  }, [lat, lng, state, district]);

  // Handle Leaflet map instance lifecycle
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Safely remove any lingering Leaflet instance on this container
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
      } catch (e) {
        // Ignore silent cleanup errors
      }
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    }

    if ((container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
    }
    container.innerHTML = "";

    // Custom stylized marker matching our modern branding with high contrast
    const customMarkerIcon = L.divIcon({
      html: `
        <div class="relative flex flex-col items-center select-none cursor-pointer">
          <span class="absolute inline-flex h-9 w-9 rounded-full bg-blue-500/25 animate-ping -top-1"></span>
          <div class="bg-blue-600 border-2 border-white p-2 rounded-full shadow-lg relative z-10 text-white flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div class="w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white -mt-1 shadow-sm"></div>
        </div>
      `,
      className: "custom-leaflet-marker",
      iconSize: [40, 48],
      iconAnchor: [20, 42]
    });

    let map: L.Map | null = null;
    try {
      // Initialize Map on container element directly
      map = L.map(container, {
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: interactive,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: false,
        attributionControl: false
      }).setView([coords.lat, coords.lng], 13);

      // Set up open source OSM Tile Layer (100% Free, no API keys)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      // Create the physical marker
      const marker = L.marker([coords.lat, coords.lng], {
        icon: customMarkerIcon,
        draggable: interactive
      }).addTo(map);

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;

      // Handle clicks to position pin in interactive mode
      if (interactive) {
        map.on("click", (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          const roundedLat = parseFloat(lat.toFixed(6));
          const roundedLng = parseFloat(lng.toFixed(6));
          marker.setLatLng([roundedLat, roundedLng]);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([roundedLat, roundedLng]);
          }
          setCoords({ lat: roundedLat, lng: roundedLng });
          if (onLocationSelect) {
            onLocationSelect(roundedLat, roundedLng);
          }
        });

        // Handle dragging pin in interactive mode
        marker.on("dragend", () => {
          const position = marker.getLatLng();
          const roundedLat = parseFloat(position.lat.toFixed(6));
          const roundedLng = parseFloat(position.lng.toFixed(6));
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo([roundedLat, roundedLng]);
          }
          setCoords({ lat: roundedLat, lng: roundedLng });
          if (onLocationSelect) {
            onLocationSelect(roundedLat, roundedLng);
          }
        });
      }

      // Force tile recalculation once rendered in the DOM
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    } catch (err) {
      console.warn("Leaflet init error handled gracefully:", err);
    }

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (e) {
          // Ignore cleanup errors on unmount
        }
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
      if (container) {
        (container as any)._leaflet_id = null;
        container.innerHTML = "";
      }
    };
  }, [interactive]);

  // Keep map view & marker synced with external coordinate state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerInstanceRef.current;
    if (map && marker) {
      const currentPos = marker.getLatLng();
      if (Math.abs(currentPos.lat - coords.lat) > 0.0001 || Math.abs(currentPos.lng - coords.lng) > 0.0001) {
        marker.setLatLng([coords.lat, coords.lng]);
        map.setView([coords.lat, coords.lng], map.getZoom());
      }
    }
  }, [coords]);

  // Open external Google Maps directly with dynamic listing coordinates and directions support
  const handleOpenMapDirections = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Detect current GPS position via navigator.geolocation
  const handleDetectGPS = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetecting(false);
        const userLat = parseFloat(pos.coords.latitude.toFixed(6));
        const userLng = parseFloat(pos.coords.longitude.toFixed(6));
        setCoords({ lat: userLat, lng: userLng });
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setLatLng([userLat, userLng]);
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([userLat, userLng], 14);
        }
        if (onLocationSelect) {
          onLocationSelect(userLat, userLng);
        }
      },
      (err) => {
        setIsDetecting(false);
        console.warn("GPS error:", err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div 
      className={`relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex flex-col text-slate-900 dark:text-slate-100 shadow-xs isolate z-0 ${className}`}
      style={{ height }}
      id="openstreetmap-container"
    >
      {/* Map Tile Element with strict containment */}
      <div 
        ref={mapContainerRef} 
        className="w-full h-full flex-1 z-0 relative"
      />

      {/* Coordinate HUD indicator */}
      <div className="absolute top-2.5 left-2.5 z-[10] bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 px-2.5 py-1 rounded-xl font-mono text-[10px] text-slate-700 dark:text-slate-300 shadow-xs flex items-center gap-1.5 backdrop-blur-md pointer-events-none">
        <Compass size={11} className="text-blue-600 dark:text-blue-400 animate-spin-slow" />
        <span className="font-bold text-slate-500 dark:text-slate-400">LAT:</span>
        <span className="font-extrabold text-slate-800 dark:text-slate-100">{coords.lat.toFixed(5)}</span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="font-bold text-slate-500 dark:text-slate-400">LNG:</span>
        <span className="font-extrabold text-slate-800 dark:text-slate-100">{coords.lng.toFixed(5)}</span>
      </div>

      {/* Mode-specific user tips and action buttons */}
      {interactive ? (
        <div className="absolute bottom-2.5 inset-x-2.5 z-[10] flex items-center justify-between gap-2 pointer-events-auto">
          <div className="bg-slate-900/90 dark:bg-slate-800/90 text-white py-1.5 px-3 rounded-xl text-[10px] font-bold shadow-md flex items-center gap-1.5 backdrop-blur-xs flex-1 truncate">
            <span>📍 Tap map or drag pin to set location</span>
          </div>
          
          {showDetectBtn && (
            <button
              type="button"
              onClick={handleDetectGPS}
              disabled={isDetecting}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-xl shadow-md transition-all cursor-pointer shrink-0 disabled:opacity-50"
              id="map-gps-btn"
            >
              {isDetecting ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Locate size={11} />
              )}
              <span>{isDetecting ? "Locating..." : "My GPS"}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="absolute bottom-2.5 right-2.5 z-[10] flex gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={handleOpenMapDirections}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow-md transition-all cursor-pointer"
            id="map-open-directions-btn"
            title="Open in Google Maps"
          >
            <Navigation size={12} className="fill-white" />
            <span>Open in Maps</span>
            <ExternalLink size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

