import React, { useState } from "react";
import { 
  Search, 
  MapPin, 
  Filter, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Car, 
  Compass, 
  X, 
  Tag, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Sparkles,
  Info,
  Layers,
  Heart,
  SlidersHorizontal,
  Plus,
  Maximize2,
  Star,
  ArrowLeft,
  Share2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Image as ImageIcon,
  Zap,
  Wind,
  Disc,
  ShieldCheck,
  Flame,
  Grid,
  Settings,
  CircleDot,
  CheckCircle2,
  Check,
  Bell,
  Navigation,
  Edit3,
  Trash2
} from "lucide-react";
import { SparePart, INDIAN_CAR_BRANDS, CAR_PART_CATEGORIES, CAR_SPARE_PARTS_BY_CATEGORY, POPULAR_LOCATIONS, User, Banner } from "../types";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import { motion, AnimatePresence } from "motion/react";
import ImageGalleryModal from "./ImageGalleryModal";
import PullToRefresh from "./PullToRefresh";
import { fetchSellerReviews, deleteSparePartListing, updateSparePartListing, subscribeToBanners, subscribeToTaxonomyConfig, FullTaxonomyConfig, auth } from "../lib/firebase";
import SellerProfileView from "./SellerProfileView";
import EditListingModal from "./EditListingModal";
import UserAvatar from "./UserAvatar";
import { useLanguage } from "../lib/LanguageContext";
import { translateDynamic } from "../lib/translations";
import LanguageSelector from "./LanguageSelector";
import GMap from "./GMap";
import BrandLogo from "./BrandLogo";

// No fallback categories helper is needed as we only display real uploaded images.

import { 
  detectUserLocationWithReverseGeocode, 
  calculateDistance, 
  formatLocationBadgeWithDistance, 
  formatPartLocation, 
  getApproxCoordinates,
  LatLng
} from "../utils/locationHelper";
import { requestLocationPermissionJIT } from "../utils/permissionUtils";

function getCategoryIcon(catName: string, iconSize = 20, className = "") {
  const lower = (catName || "").toLowerCase();
  if (lower.includes("engine")) return <Layers size={iconSize} className={className} />;
  if (lower.includes("suspension")) return <SlidersHorizontal size={iconSize} className={className} />;
  if (lower.includes("brake")) return <Disc size={iconSize} className={className} />;
  if (lower.includes("electric")) return <Zap size={iconSize} className={className} />;
  if (lower.includes("body")) return <Car size={iconSize} className={className} />;
  if (lower.includes("light")) return <Sparkles size={iconSize} className={className} />;
  if (lower.includes("interior") || lower.includes("wheel")) return <CircleDot size={iconSize} className={className} />;
  if (lower.includes("ac") || lower.includes("air")) return <Wind size={iconSize} className={className} />;
  if (lower.includes("transmission")) return <Settings size={iconSize} className={className} />;
  return <Grid size={iconSize} className={className} />;
}

function getCategoryColorTheme(catName: string, isActive: boolean) {
  const lower = (catName || "").toLowerCase();
  if (isActive) {
    return {
      card: "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/25 ring-2 ring-blue-500 ring-offset-1 scale-[1.03]",
      iconBg: "bg-blue-600 text-white shadow-xs",
      iconColor: "text-white",
      titleColor: "text-white font-black",
      badgeBg: "bg-blue-500/30 text-blue-200 border border-blue-400/30"
    };
  }
  if (lower.includes("engine")) {
    return {
      card: "bg-gradient-to-b from-amber-50/90 to-white border-amber-200/80 hover:border-amber-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
      iconBg: "bg-amber-100 text-amber-700 group-hover:bg-amber-500 group-hover:text-white",
      iconColor: "text-amber-700 group-hover:text-white",
      titleColor: "text-slate-800 font-bold",
      badgeBg: "bg-amber-100/80 text-amber-800 border border-amber-200"
    };
  }
  if (lower.includes("suspension") || lower.includes("steering")) {
    return {
      card: "bg-gradient-to-b from-blue-50/90 to-white border-blue-200/80 hover:border-blue-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
      iconBg: "bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white",
      iconColor: "text-blue-700 group-hover:text-white",
      titleColor: "text-slate-800 font-bold",
      badgeBg: "bg-blue-100/80 text-blue-800 border border-blue-200"
    };
  }
  if (lower.includes("brake")) {
    return {
      card: "bg-gradient-to-b from-rose-50/90 to-white border-rose-200/80 hover:border-rose-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
      iconBg: "bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white",
      iconColor: "text-rose-700 group-hover:text-white",
      titleColor: "text-slate-800 font-bold",
      badgeBg: "bg-rose-100/80 text-rose-800 border border-rose-200"
    };
  }
  if (lower.includes("electric") || lower.includes("light")) {
    return {
      card: "bg-gradient-to-b from-yellow-50/90 to-white border-yellow-200/80 hover:border-yellow-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
      iconBg: "bg-yellow-100 text-yellow-800 group-hover:bg-amber-500 group-hover:text-white",
      iconColor: "text-yellow-800 group-hover:text-white",
      titleColor: "text-slate-800 font-bold",
      badgeBg: "bg-yellow-100/80 text-yellow-800 border border-yellow-200"
    };
  }
  if (lower.includes("body")) {
    return {
      card: "bg-gradient-to-b from-indigo-50/90 to-white border-indigo-200/80 hover:border-indigo-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
      iconBg: "bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white",
      iconColor: "text-indigo-700 group-hover:text-white",
      titleColor: "text-slate-800 font-bold",
      badgeBg: "bg-indigo-100/80 text-indigo-800 border border-indigo-200"
    };
  }
  if (lower.includes("ac") || lower.includes("air")) {
    return {
      card: "bg-gradient-to-b from-cyan-50/90 to-white border-cyan-200/80 hover:border-cyan-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
      iconBg: "bg-cyan-100 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white",
      iconColor: "text-cyan-700 group-hover:text-white",
      titleColor: "text-slate-800 font-bold",
      badgeBg: "bg-cyan-100/80 text-cyan-800 border border-cyan-200"
    };
  }
  return {
    card: "bg-gradient-to-b from-slate-50/90 to-white border-slate-200/80 hover:border-slate-400 text-slate-800 hover:shadow-md hover:-translate-y-0.5",
    iconBg: "bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white",
    iconColor: "text-slate-700 group-hover:text-white",
    titleColor: "text-slate-800 font-bold",
    badgeBg: "bg-slate-100 text-slate-700 border border-slate-200"
  };
}

interface HomeScreenProps {
  parts: SparePart[];
  partsLoading?: boolean;
  partsError?: string | null;
  onRetry?: () => void;
  onFavoriteToggle?: (partId: string) => void;
  favorites: string[];
  onStartChat?: (part: SparePart) => void;
  currentUser: User | null;
  onPartDeleted?: (partId: string) => void;
  onViewPart?: (part: SparePart) => void;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
  onOpenUserProfile?: (userId: string, userName: string) => void;
}

export default function HomeScreen({ 
  parts, 
  partsLoading = false,
  partsError = null,
  onRetry,
  onFavoriteToggle, 
  favorites, 
  onStartChat, 
  currentUser, 
  onPartDeleted, 
  onViewPart,
  unreadNotificationCount = 0,
  onOpenNotifications,
  onOpenUserProfile
}: HomeScreenProps) {
  const { t, language } = useLanguage();
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [isDeletingPart, setIsDeletingPart] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [taxonomy, setTaxonomy] = React.useState<FullTaxonomyConfig>({
    categories: [],
    categoryImages: {},
    subcategories: {},
    brands: {},
    brandLogos: {},
    variants: {},
    states: [],
    districts: {},
    cities: {},
    locations: []
  });

  React.useEffect(() => {
    setTaxonomyLoading(true);
    setTaxonomyError(null);
    const unsub = subscribeToTaxonomyConfig((config) => {
      setTaxonomy(config);
      if (config && config.categories && config.categories.length > 0) {
        setTaxonomyLoading(false);
        setTaxonomyError(null);
      }
    });
    return () => unsub();
  }, []);

  const categories = taxonomy.categories;
  const brands = taxonomy.brands;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("All Brands");
  const [selectedModel, setSelectedModel] = useState("All Models");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedPartName, setSelectedPartName] = useState("All Parts");
  const [selectedState, setSelectedState] = useState(() => {
    return localStorage.getItem("autoparts_selected_state") || "All States";
  });
  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    return localStorage.getItem("autoparts_selected_district") || "All Districts";
  });
  const [selectedCondition, setSelectedCondition] = useState("All Conditions");
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);

  // Filter change loading transition
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const isFirstFilterMount = React.useRef(true);
  React.useEffect(() => {
    if (isFirstFilterMount.current) {
      isFirstFilterMount.current = false;
      return;
    }
    setIsFilterLoading(true);
    const timer = setTimeout(() => {
      setIsFilterLoading(false);
    }, 220);
    return () => clearTimeout(timer);
  }, [
    selectedBrand,
    selectedModel,
    selectedCategory,
    selectedPartName,
    selectedCondition,
    selectedState,
    selectedDistrict,
    searchQuery
  ]);

  const handleViewPart = (part: SparePart) => {
    if (onViewPart) {
      onViewPart(part);
    } else {
      setSelectedPart(part);
    }
  };
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [detailImageIndex, setDetailImageIndex] = useState(0);

  // Viewer Location Detection State
  const [userDetectedState, setUserDetectedState] = useState<string | null>(null);
  const [userDetectedDistrict, setUserDetectedDistrict] = useState<string | null>(null);
  const [userDetectedArea, setUserDetectedArea] = useState<string | null>(() => {
    return localStorage.getItem("autoparts_user_area") || null;
  });
  const [userCoords, setUserCoords] = useState<LatLng | null>(() => {
    const savedLat = localStorage.getItem("autoparts_user_lat");
    const savedLng = localStorage.getItem("autoparts_user_lng");
    if (savedLat && savedLng) {
      const latNum = parseFloat(savedLat);
      const lngNum = parseFloat(savedLng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        return { lat: latNum, lng: lngNum };
      }
    }
    return null;
  });
  const [locationFilterMode, setLocationFilterMode] = useState<"nearby" | "district" | "state">("nearby");
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState<number>(50);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetectError, setLocationDetectError] = useState<string | null>(null);

  // Load saved state/district preference on mount (without automatic GPS prompt)
  React.useEffect(() => {
    const savedState = localStorage.getItem("autoparts_selected_state");
    const savedDistrict = localStorage.getItem("autoparts_selected_district");

    if (savedState) {
      setSelectedState(savedState);
      if (savedDistrict) setSelectedDistrict(savedDistrict);
    }
  }, []);

  const handleDetectLocationClick = async () => {
    setIsDetectingLocation(true);
    setLocationDetectError(null);
    try {
      const permRes = await requestLocationPermissionJIT();
      if (!permRes.granted) {
        setLocationDetectError(permRes.message || "Location access was denied. You can still select your State & District manually.");
        setIsDetectingLocation(false);
        return;
      }

      const res = await detectUserLocationWithReverseGeocode(INDIAN_STATES_AND_DISTRICTS);
      setUserDetectedState(res.state);
      setUserDetectedDistrict(res.district);
      setUserDetectedArea(res.area || "");
      setUserCoords({ lat: res.lat, lng: res.lng });
      setSelectedState(res.state);
      setSelectedDistrict(res.district || "All Districts");
      setLocationFilterMode("nearby");

      localStorage.setItem("autoparts_selected_state", res.state);
      localStorage.setItem("autoparts_selected_district", res.district || "All Districts");
      localStorage.setItem("autoparts_user_lat", res.lat.toString());
      localStorage.setItem("autoparts_user_lng", res.lng.toString());
      if (res.area) {
        localStorage.setItem("autoparts_user_area", res.area);
      }
      setShowLocationModal(false);
    } catch (err: any) {
      setLocationDetectError(err.message || "Could not detect location. Please select state manually.");
    } finally {
      setIsDetectingLocation(false);
    }
  };
  
  // Local state for editing and deleting own listing
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSaveListingChanges = async (partId: string, updates: Partial<SparePart>) => {
    try {
      const ok = await updateSparePartListing(partId, updates);
      if (ok) {
        setEditingPart(null);
        setSelectedPart(prev => prev && prev.id === partId ? { ...prev, ...updates } : prev);
        showToast("Listing updated successfully");
      }
    } catch (err: any) {
      setDeleteError(err.message || "Failed to update listing.");
      showToast("Error updating listing: " + (err.message || String(err)), "error");
      throw err;
    }
  };
  
  // Local state for toggling advanced filters drawer
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Home screen location selector state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locSearchQuery, setLocSearchQuery] = useState("");
  const [locActiveState, setLocActiveState] = useState<string | null>(null);

  // Seller Rating & Reviews states
  const [sellerRating, setSellerRating] = useState<{ average: number; count: number } | null>(null);
  const [showReviews, setShowReviews] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  // Recently Viewed Parts state
  const [recentlyViewed, setRecentlyViewed] = useState<SparePart[]>([]);

  React.useEffect(() => {
    if (selectedPart) {
      try {
        const stored = localStorage.getItem("autoparts_recently_viewed_ids") || "[]";
        let ids: string[] = JSON.parse(stored);
        ids = [selectedPart.id, ...ids.filter(id => id !== selectedPart.id)].slice(0, 8);
        localStorage.setItem("autoparts_recently_viewed_ids", JSON.stringify(ids));
      } catch (e) {
        console.warn("Failed to store recently viewed part ID:", e);
      }
    }
  }, [selectedPart]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("autoparts_recently_viewed_ids") || "[]";
      const ids: string[] = JSON.parse(stored);
      if (ids.length > 0 && parts.length > 0) {
        const matched = ids
          .map(id => parts.find(p => p.id === id))
          .filter((p): p is SparePart => p !== undefined && !p.sold && p.status !== "sold" && !(p as any).isDeleted);
        setRecentlyViewed(matched);
      }
    } catch (e) {
      // ignore error
    }
  }, [parts]);

  // Carousel Promotional Banner State & Config
  const [activeBanner, setActiveBanner] = useState(0);
  const [firestoreBanners, setFirestoreBanners] = useState<Banner[]>([]);

  React.useEffect(() => {
    const unsub = subscribeToBanners((loaded) => {
      setFirestoreBanners(loaded);
    }, true); // only active banners for home screen
    return () => unsub();
  }, []);

  React.useEffect(() => {
    if (firestoreBanners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveBanner((prev) => (prev + 1) % firestoreBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [firestoreBanners.length]);

  // Search and Multi-tier Fallback Filter Logic
  const activeParts = React.useMemo(() => {
    return parts.filter((part) => {
      const isSold = part.sold === true || part.status === "sold";
      const isExpired = (Date.now() - part.createdAt) > 90 * 24 * 60 * 60 * 1000;
      const isDeleted = (part as any).isDeleted === true;
      return !isSold && !isExpired && !isDeleted;
    });
  }, [parts]);

  // Compute Top Verified Sellers
  const topSellers = React.useMemo(() => {
    const map = new Map<string, { sellerId: string; sellerName: string; location: string; count: number; sampleImage?: string }>();
    activeParts.forEach(p => {
      if (!p.contactName) return;
      const key = p.sellerId || p.contactName;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.sampleImage && p.imageUrl) existing.sampleImage = p.imageUrl;
      } else {
        map.set(key, {
          sellerId: key,
          sellerName: p.contactName,
          location: p.district || p.location || "India",
          count: 1,
          sampleImage: p.imageUrl
        });
      }
    });
    return Array.from(map.values()).slice(0, 6);
  }, [activeParts]);

  React.useEffect(() => {
    const updateRating = () => {
      const sId = selectedPart?.sellerId;
      if (sId) {
        fetchSellerReviews(sId).then((revs) => {
          const count = revs.length;
          const average = count > 0 
            ? parseFloat((revs.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
            : 0;
          setSellerRating({ average, count });
        });
      } else {
        setSellerRating(null);
      }
    };

    updateRating();
    setDetailImageIndex(0);
    window.addEventListener("autoparts_reviews_updated", updateRating);
    window.addEventListener("storage", updateRating);
    return () => {
      window.removeEventListener("autoparts_reviews_updated", updateRating);
      window.removeEventListener("storage", updateRating);
    };
  }, [selectedPart]);

  // Flat list of all spare part names, brands, and models for suggestions and search
  const ALL_SPARE_PART_NAMES = React.useMemo(() => Object.values(taxonomy.subcategories || {}).flat(), [taxonomy.subcategories]);
  const ALL_BRANDS = React.useMemo(() => Object.keys(brands), [brands]);
  const ALL_MODELS = React.useMemo(() => Object.values(brands).flat() as string[], [brands]);

  // Effective center coordinates based on GPS or selected state/district
  const effectiveUserCoords = React.useMemo<LatLng | null>(() => {
    if (userCoords) return userCoords;
    if (selectedState && selectedState !== "All States" && selectedState !== "All India") {
      return getApproxCoordinates(selectedState, selectedDistrict !== "All Districts" ? selectedDistrict : undefined);
    }
    return null;
  }, [userCoords, selectedState, selectedDistrict]);

  const { finalFilteredParts, fallbackBanner } = React.useMemo(() => {
    if (activeParts.length === 0) {
      return { finalFilteredParts: [], fallbackBanner: null };
    }

    const query = (searchQuery || "").trim().toLowerCase();

    const matchesSpecificsAndQuery = (part: SparePart, checkQuery = true, checkSpecifics = true) => {
      if (checkQuery && query) {
        const title = (part.title || "").toLowerCase();
        const description = (part.description || "").toLowerCase();
        const carModel = (part.carModel || "").toLowerCase();
        const carBrand = (part.carBrand || "").toLowerCase();
        const category = (part.category || "").toLowerCase();
        const partName = (part.partName || "").toLowerCase();
        const state = (part.state || "").toLowerCase();
        const district = (part.district || "").toLowerCase();
        const area = (part.area || "").toLowerCase();
        const location = (part.location || "").toLowerCase();

        const match =
          title.includes(query) ||
          description.includes(query) ||
          carModel.includes(query) ||
          carBrand.includes(query) ||
          category.includes(query) ||
          partName.includes(query) ||
          state.includes(query) ||
          district.includes(query) ||
          area.includes(query) ||
          location.includes(query);

        if (!match) return false;
      }

      if (checkSpecifics) {
        if (selectedBrand !== "All Brands" && part.carBrand !== selectedBrand) return false;
        if (selectedModel !== "All Models" && part.carModel !== selectedModel) return false;
        if (selectedCategory !== "All Categories" && part.category !== selectedCategory) return false;
        if (
          selectedPartName !== "All Parts" &&
          part.partName !== selectedPartName &&
          !part.title?.toLowerCase().includes((selectedPartName || "").toLowerCase())
        ) return false;
        if (selectedCondition !== "All Conditions" && part.condition !== selectedCondition) return false;
      }

      return true;
    };

    // Mode 1: Nearby (Haversine distance radius check)
    if (locationFilterMode === "nearby") {
      const center = effectiveUserCoords;
      if (center) {
        const nearbyMatches = activeParts.filter(part => {
          if (!matchesSpecificsAndQuery(part, true, true)) return false;
          
          let pCoords: LatLng | null = null;
          if (part.lat && part.lng && part.lat !== 0) {
            pCoords = { lat: part.lat, lng: part.lng };
          } else {
            pCoords = getApproxCoordinates(part.state, part.district);
          }
          
          if (!pCoords) return true;
          const dist = calculateDistance(center.lat, center.lng, pCoords.lat, pCoords.lng);
          return dist <= nearbyRadiusKm;
        });

        if (nearbyMatches.length > 0) {
          return { finalFilteredParts: nearbyMatches, fallbackBanner: null };
        }
      }
    }

    // Mode 2: Same District Match
    if (locationFilterMode === "district" || locationFilterMode === "nearby") {
      const targetDist = selectedDistrict !== "All Districts" ? selectedDistrict : userDetectedDistrict;

      if (targetDist) {
        const distMatches = activeParts.filter(part => {
          if (!matchesSpecificsAndQuery(part, true, true)) return false;
          const matchesDist =
            part.district === targetDist ||
            (!part.district && part.location?.toLowerCase().includes(targetDist.toLowerCase()));
          return matchesDist;
        });

        if (distMatches.length > 0) {
          return {
            finalFilteredParts: distMatches,
            fallbackBanner: locationFilterMode === "nearby"
              ? `No exact matches found within ${nearbyRadiusKm} km. Showing available parts in ${targetDist}.`
              : null
          };
        }
      }
    }

    // Mode 3: Entire State Match
    const targetState = (selectedState !== "All States" && selectedState !== "All India") ? selectedState : userDetectedState;
    if (targetState) {
      const stateMatches = activeParts.filter(part => {
        if (!matchesSpecificsAndQuery(part, true, true)) return false;
        const matchesState =
          part.state === targetState ||
          (!part.state && part.location?.toLowerCase().includes(targetState.toLowerCase()));
        return matchesState;
      });

      if (stateMatches.length > 0) {
        return {
          finalFilteredParts: stateMatches,
          fallbackBanner: locationFilterMode === "nearby"
            ? `No listings found within ${nearbyRadiusKm} km. Showing parts in ${targetState}.`
            : locationFilterMode === "district" && selectedDistrict !== "All Districts"
              ? `No listings found in ${selectedDistrict}. Showing parts across ${targetState}.`
              : null
        };
      }
    }

    // All India with active specific filters
    const allIndiaSpecifics = activeParts.filter(p => matchesSpecificsAndQuery(p, true, true));
    if (allIndiaSpecifics.length > 0) {
      return {
        finalFilteredParts: allIndiaSpecifics,
        fallbackBanner: (selectedState !== "All States" && selectedState !== "All India")
          ? "No local matches found. Showing available listings across India."
          : null
      };
    }

    // Relaxed Query-only filter
    if (query) {
      const queryOnly = activeParts.filter(p => matchesSpecificsAndQuery(p, true, false));
      if (queryOnly.length > 0) {
        return {
          finalFilteredParts: queryOnly,
          fallbackBanner: "No exact matches found. Showing the closest available listings."
        };
      }
    }

    // Absolute fallback: all active parts
    return {
      finalFilteredParts: activeParts,
      fallbackBanner: "No exact matches found. Showing all available spare parts."
    };
  }, [
    activeParts,
    searchQuery,
    selectedBrand,
    selectedModel,
    selectedCategory,
    selectedPartName,
    selectedCondition,
    selectedState,
    selectedDistrict,
    userDetectedState,
    userDetectedDistrict,
    locationFilterMode,
    nearbyRadiusKm,
    effectiveUserCoords
  ]);

  const sortedFilteredParts = React.useMemo(() => {
    const list = [...finalFilteredParts];
    const center = effectiveUserCoords;

    return list.sort((a, b) => {
      if (center) {
        let coordsA: LatLng | null = (a.lat && a.lng && a.lat !== 0) ? { lat: a.lat, lng: a.lng } : getApproxCoordinates(a.state, a.district);
        let coordsB: LatLng | null = (b.lat && b.lng && b.lat !== 0) ? { lat: b.lat, lng: b.lng } : getApproxCoordinates(b.state, b.district);

        const distA = coordsA ? calculateDistance(center.lat, center.lng, coordsA.lat, coordsA.lng) : 99999;
        const distB = coordsB ? calculateDistance(center.lat, center.lng, coordsB.lat, coordsB.lng) : 99999;

        if (Math.abs(distA - distB) > 0.1) {
          return distA - distB; // Ascending distance (closest first!)
        }
      }

      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [finalFilteredParts, effectiveUserCoords]);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  
  const suggestions = React.useMemo(() => {
    const result: { text: string; type: "Part Name" | "Brand" | "Model" }[] = [];
    if (!trimmedQuery) return result;

    // Match brands
    ALL_BRANDS.forEach(brand => {
      if (brand && brand.toLowerCase().includes(trimmedQuery) && !result.some(s => s.text === brand)) {
        result.push({ text: brand, type: "Brand" });
      }
    });
    
    // Match models
    ALL_MODELS.forEach(model => {
      if (model && model.toLowerCase().includes(trimmedQuery) && !result.some(s => s.text === model)) {
        result.push({ text: model, type: "Model" });
      }
    });

    // Match part names
    ALL_SPARE_PART_NAMES.forEach(name => {
      if (name && name.toLowerCase().includes(trimmedQuery) && !result.some(s => s.text === name)) {
        result.push({ text: name, type: "Part Name" });
      }
    });

    return result.slice(0, 10);
  }, [trimmedQuery, ALL_BRANDS, ALL_MODELS, ALL_SPARE_PART_NAMES]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  const getRelativeTime = (timestamp: number) => {
    const difference = Date.now() - timestamp;
    const hours = Math.floor(difference / (3600 * 1000));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getCategoryShortLabel = (cat: string) => {
    switch (cat) {
      case "Engine & Mechanical":
        return "Engine";
      case "Body & Exterior":
        return "Body Parts";
      case "Lights & Electricals":
        return "Lights & Elec";
      case "Suspension & Brakes":
        return "Brakes & Susp";
      case "Interior & Wheels":
        return "Interior";
      case "Wiring & Harnesses":
        return "Wiring";
      default:
        return cat;
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "Brand New":
        return "bg-emerald-600/90 text-white border-emerald-500/30";
      case "Like New":
        return "bg-sky-600/90 text-white border-sky-500/30";
      case "Used (Good)":
        return "bg-amber-600/90 text-white border-amber-500/30";
      case "For Scrap/Spares":
        return "bg-rose-600/90 text-white border-rose-500/30";
      default:
        return "bg-slate-700/90 text-white border-slate-600/30";
    }
  };

  const getLocationDisplayText = () => {
    if (locationFilterMode === "nearby" && (userCoords || userDetectedDistrict)) {
      if (userDetectedArea) return `${userDetectedArea}, ${userDetectedDistrict || ""}`;
      if (userDetectedDistrict) return `${userDetectedDistrict} (GPS)`;
      return `Nearby (${nearbyRadiusKm}km)`;
    }
    if (selectedDistrict && selectedDistrict !== "All Districts") {
      return selectedDistrict;
    }
    if (selectedState && selectedState !== "All States" && selectedState !== "All India") {
      return selectedState;
    }
    return "All India";
  };

  // Handle brand selection change to sync/reset model
  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel("All Models");
  };

  // Get available models based on selected brand
  const availableModels = selectedBrand !== "All Brands" ? brands[selectedBrand] || [] : [];

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 text-slate-900 relative overflow-hidden" id="home-screen-container">
      {/* 1. Top Header (Sticky) */}
      <header className="bg-[#0B1220] text-white pt-2.5 pb-2.5 px-3 sticky top-0 z-30 border-b border-slate-800 shrink-0">
        {/* Top Row: Brand Logo + Location Chip on Left, Notifications + Language on Right */}
        <div className="flex items-center justify-between gap-2 mb-2 w-full">
          <div className="flex flex-row items-center gap-2 min-w-0">
            <BrandLogo size="sm" theme="dark" showTagline={false} className="shrink-0 max-h-8" />

            {/* Location Selector Chip */}
            <button
              onClick={() => {
                setLocSearchQuery("");
                setLocActiveState(null);
                setShowLocationModal(true);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-200 bg-slate-800/90 hover:bg-slate-700/90 px-2.5 py-1 rounded-full border border-slate-700/80 transition-all duration-150 active:scale-95 group hover:border-blue-500/50 cursor-pointer shrink min-w-0 max-w-[130px] sm:max-w-[170px]"
              id="header-location-picker-btn"
              title={selectedDistrict !== "All Districts" ? `${selectedDistrict}, ${selectedState}` : selectedState}
            >
              <MapPin size={11} className="text-blue-400 shrink-0 group-hover:text-blue-300 transition-colors" />
              <span className="truncate text-slate-200 text-[10px] sm:text-[11px] font-semibold" id="selected-location-text">
                {getLocationDisplayText()}
              </span>
              <ChevronDown size={10} className="text-slate-400 shrink-0 group-hover:text-blue-300 transition-transform" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Notification Bell Button */}
            <button
              onClick={onOpenNotifications}
              className="relative p-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 transition-all duration-150 active:scale-95 cursor-pointer group"
              id="home-notification-bell-btn"
              title="Notifications"
              aria-label="Open notifications"
            >
              <Bell size={16} className="group-hover:text-blue-400 transition-colors" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black min-w-[16px] h-[16px] rounded-full px-0.5 flex items-center justify-center border-2 border-[#0B1220]">
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              )}
            </button>

            <LanguageSelector variant="dark" compact={true} />
          </div>
        </div>

        {/* Search Bar & Filter Button Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative h-10">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder={t("searchPlaceholder")}
              className="w-full h-10 bg-white border border-slate-200/90 rounded-xl py-1.5 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all shadow-2xs"
              id="search-parts-input"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setShowSuggestions(false);
                }} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-0.5 cursor-pointer"
                id="search-clear-btn"
              >
                <X size={13} />
              </button>
            )}

            {/* Auto-suggestions list */}
            {showSuggestions && suggestions.length > 0 && (
              <div 
                className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100"
                id="search-suggestions-dropdown"
              >
                {suggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSearchQuery(suggestion.text);
                      setShowSuggestions(false);
                      if (suggestion.type === "Brand") {
                        handleBrandChange(suggestion.text);
                      } else if (suggestion.type === "Model") {
                        const brand = Object.keys(brands).find(b => 
                          brands[b].includes(suggestion.text)
                        );
                        if (brand) {
                          setSelectedBrand(brand);
                          setSelectedModel(suggestion.text);
                        }
                      }
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-800 hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-900">{suggestion.text}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      suggestion.type === "Brand" 
                        ? "text-emerald-700 bg-emerald-50 border border-emerald-200" 
                        : suggestion.type === "Model" 
                          ? "text-sky-700 bg-sky-50 border border-sky-200" 
                          : "text-[#2563EB] bg-blue-50 border border-blue-200"
                    }`}>
                      {suggestion.type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFiltersModal(true)}
            className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center transition-all duration-150 cursor-pointer relative shadow-2xs active:scale-95 ${
              selectedBrand !== "All Brands" || 
              selectedModel !== "All Models" || 
              selectedCategory !== "All Categories" || 
              selectedPartName !== "All Parts" ||
              selectedState !== "All States" ||
              selectedDistrict !== "All Districts" ||
              selectedCondition !== "All Conditions"
                ? "bg-[#2563EB] border-blue-400 text-white font-bold"
                : "bg-slate-800/90 hover:bg-slate-700/90 border-slate-700/80 text-white"
            }`}
            id="filters-modal-toggle"
            title="Advanced Filters"
          >
            <Filter size={15} />
            {(selectedBrand !== "All Brands" || selectedModel !== "All Models" || selectedCategory !== "All Categories" || selectedPartName !== "All Parts" || selectedState !== "All States" || selectedDistrict !== "All Districts" || selectedCondition !== "All Conditions") && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-[#0B1220]" />
            )}
          </button>
        </div>
      </header>

      {/* Main Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-28 scroll-smooth overflow-x-hidden" id="home-scrollable-content">
        <PullToRefresh onRefresh={async () => { if (onRetry) await onRetry(); }}>
        {/* Category Icons Row with Horizontal Swipe */}
        <div className="bg-white border-b border-slate-200/80 py-2 px-3 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1.5">
              <Grid size={12} className="text-[#2563EB]" /> Categories
            </span>
            {selectedCategory !== "All Categories" && (
              <button
                onClick={() => {
                  setSelectedCategory("All Categories");
                  setSelectedPartName("All Parts");
                }}
                className="text-[10px] text-[#2563EB] font-bold hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <X size={11} /> Reset
              </button>
            )}
          </div>

          <div className="overflow-x-auto whitespace-nowrap flex gap-2 scrollbar-none snap-x snap-mandatory scroll-smooth pb-1 pt-0.5 items-center px-0.5">
            {/* All Parts Tile */}
            <button
              onClick={() => {
                setSelectedCategory("All Categories");
                setSelectedPartName("All Parts");
              }}
              className={`shrink-0 flex-none snap-start group flex flex-col items-center justify-center p-1.5 rounded-xl w-[76px] sm:w-[84px] h-[76px] sm:h-[80px] transition-all duration-150 cursor-pointer text-center border shadow-2xs ${
                selectedCategory === "All Categories"
                  ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/20 ring-2 ring-blue-500 ring-offset-1"
                  : "bg-slate-50/90 border-slate-200/90 hover:border-slate-400 text-slate-800 hover:bg-white"
              }`}
              id="category-pill-all"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-150 group-hover:scale-105 ${
                selectedCategory === "All Categories" ? "bg-blue-600 text-white" : "bg-slate-200/80 text-slate-700"
              }`}>
                <Car size={17} />
              </div>
              <div className="flex flex-col items-center w-full mt-1">
                <span className={`text-[10px] sm:text-[11px] font-bold text-center leading-tight whitespace-normal break-words line-clamp-1 px-0.5 ${
                  selectedCategory === "All Categories" ? "text-white" : "text-slate-800"
                }`}>
                  All Parts
                </span>
              </div>
            </button>

            {taxonomyError && categories.length === 0 ? (
              <div className="flex items-center gap-2 py-2 px-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                <span>Failed to load categories</span>
                <button
                  onClick={() => {
                    setTaxonomyLoading(true);
                    setTaxonomyError(null);
                    window.location.reload();
                  }}
                  className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-700 active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  Retry
                </button>
              </div>
            ) : taxonomyLoading && categories.length === 0 ? (
              <>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={`cat-skel-${i}`}
                    className="shrink-0 flex flex-col items-center justify-center p-1.5 rounded-xl w-[76px] sm:w-[84px] h-[76px] sm:h-[80px] bg-slate-100/80 border border-slate-200/70 animate-pulse"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-200/90 mb-1.5 flex items-center justify-center text-slate-400">
                      <Loader2 size={13} className="animate-spin text-slate-400" />
                    </div>
                    <div className="w-11 h-2 bg-slate-200 rounded" />
                  </div>
                ))}
              </>
            ) : (
              categories.map((cat) => {
                const isActive = selectedCategory === cat;
                const theme = getCategoryColorTheme(cat, isActive);
                const shortLabel = getCategoryShortLabel(cat);

                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setSelectedPartName("All Parts");
                    }}
                    className={`shrink-0 flex-none snap-start group flex flex-col items-center justify-center p-1.5 rounded-xl w-[76px] sm:w-[84px] h-[76px] sm:h-[80px] transition-all duration-150 cursor-pointer text-center border shadow-2xs ${theme.card}`}
                    id={`category-pill-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-150 group-hover:scale-105 ${theme.iconBg}`}>
                      {getCategoryIcon(cat, 17)}
                    </div>
                    <div className="flex flex-col items-center w-full mt-1">
                      <span className={`text-[10px] sm:text-[11px] font-bold text-center leading-tight whitespace-normal break-words line-clamp-2 px-0.5 ${theme.titleColor}`}>
                        {translateDynamic(shortLabel, language)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Hero Promotional Banner Carousel (Compact 140px-150px Height, 2.8:1 Aspect Ratio) */}
        {firestoreBanners.length > 0 && (
          <div className="px-3 my-2 bg-slate-50">
            <AnimatePresence mode="wait">
              {(() => {
                const currentBanner = firestoreBanners[activeBanner] || firestoreBanners[0];
                if (!currentBanner) return null;

                return (
                  <motion.div
                    key={currentBanner.id || activeBanner}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => {
                      if (currentBanner.targetLink) {
                        if (CAR_PART_CATEGORIES.includes(currentBanner.targetLink) || categories.includes(currentBanner.targetLink)) {
                          setSelectedCategory(currentBanner.targetLink);
                        } else if (INDIAN_CAR_BRANDS[currentBanner.targetLink] || brands[currentBanner.targetLink]) {
                          handleBrandChange(currentBanner.targetLink);
                        } else {
                          setSearchQuery(currentBanner.targetLink);
                        }
                      }
                    }}
                    className={`relative overflow-hidden rounded-xl border border-slate-200/80 shadow-2xs bg-slate-900 ${currentBanner.targetLink ? "cursor-pointer" : ""}`}
                  >
                    {currentBanner.imageUrl ? (
                      /* Clean 100% Brightness Banner Container - Aspect Ratio 2.8:1, max 140px-150px height */
                      <div className="relative w-full aspect-[2.8/1] max-h-[150px] overflow-hidden rounded-xl bg-slate-900">
                        <img
                          src={currentBanner.imageUrl}
                          alt={currentBanner.title || "Promotional Banner"}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-center"
                        />
                      </div>
                    ) : (
                      /* Text-only banner fallback when no image provided */
                      <div className="p-3 sm:p-3.5 bg-slate-900 text-white relative z-10 flex items-center justify-between gap-3 h-[140px]">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          {currentBanner.tag && (
                            <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/30 inline-flex items-center gap-1">
                              <Sparkles size={9} /> {currentBanner.tag}
                            </span>
                          )}
                          <h2 className="text-xs sm:text-sm font-black text-white tracking-tight truncate">
                            {currentBanner.title}
                          </h2>
                          {currentBanner.subtitle && (
                            <p className="text-[10px] text-slate-300 font-medium truncate">
                              {currentBanner.subtitle}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0">
                          <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-xs border border-blue-400/40">
                            <Car size={16} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Indicator Dots - Minimal Floating Pill at Bottom */}
                    {firestoreBanners.length > 1 && (
                      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/40 backdrop-blur-xs z-20">
                        {firestoreBanners.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveBanner(idx);
                            }}
                            className={`h-1 rounded-full transition-all duration-200 cursor-pointer ${
                              idx === activeBanner ? "w-3.5 bg-white shadow-xs" : "w-1 bg-white/50 hover:bg-white/80"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        )}

        {/* Quick Popular Brands Horizontal Swipe */}
        <div className="bg-white border-y border-slate-200/80 py-1.5 px-3 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-none snap-x snap-mandatory scroll-smooth items-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0 mr-0.5">
            Brands:
          </span>
          <button
            onClick={() => handleBrandChange("All Brands")}
            className={`shrink-0 flex-none snap-start px-2.5 py-1 rounded-full text-[10.5px] transition-colors cursor-pointer border ${
              selectedBrand === "All Brands"
                ? "bg-slate-900 border-slate-900 text-white font-bold shadow-2xs"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
            }`}
            id="brand-chip-all"
          >
            All Brands
          </button>
          {taxonomyLoading && Object.keys(brands).length === 0 ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={`brand-skel-${i}`}
                  className="shrink-0 flex-none px-3 py-1 rounded-full bg-slate-100 border border-slate-200/70 animate-pulse h-6 w-16"
                />
              ))}
            </>
          ) : (
            Object.keys(brands).map((b) => {
              const isSel = selectedBrand === b;
              return (
                <button
                  key={b}
                  onClick={() => handleBrandChange(b)}
                  className={`shrink-0 flex-none snap-start px-2.5 py-1 rounded-full text-[10.5px] transition-colors cursor-pointer border ${
                    isSel
                      ? "bg-slate-900 border-slate-900 text-white font-bold shadow-2xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                  }`}
                  id={`brand-chip-${b.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  {b}
                </button>
              );
            })
          )}
        </div>

        {/* Recently Viewed Row */}
        {recentlyViewed.length > 0 && (
          <div className="bg-white border-b border-slate-200/80 py-2.5 px-3 space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase flex items-center gap-1">
                <Tag size={12} className="text-indigo-600" /> Recently Viewed
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem("autoparts_recently_viewed_ids");
                  setRecentlyViewed([]);
                }}
                className="text-[9px] text-slate-400 hover:text-slate-600 font-bold"
              >
                Clear
              </button>
            </div>
            <div className="overflow-x-auto whitespace-nowrap flex gap-2 scrollbar-none pb-0.5">
              {recentlyViewed.map((part) => (
                <div
                  key={`rv-${part.id}`}
                  onClick={() => handleViewPart(part)}
                  className="shrink-0 w-28 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-[#2563EB] transition-all p-1.5 flex flex-col justify-between"
                >
                  <div className="h-16 w-full bg-slate-900 rounded-lg overflow-hidden relative mb-1">
                    {part.imageUrl ? (
                      <img src={part.imageUrl} alt={part.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                        <Car size={16} />
                      </div>
                    )}
                  </div>
                  <h5 className="text-[10px] font-bold text-slate-900 truncate leading-tight">{part.title}</h5>
                  <span className="text-[10px] font-black text-[#2563EB] font-mono mt-0.5">₹{part.price?.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parts Feed List */}
        <div className="p-3 pt-3 space-y-3" id="parts-feed-container">
          {/* Fallback Notice Banner */}
          {fallbackBanner && sortedFilteredParts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200/90 text-amber-900 px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <Compass size={14} className="text-amber-600 shrink-0" />
                <span className="font-semibold text-[10px] leading-tight">
                  {fallbackBanner}
                </span>
              </div>
              <span className="text-[8px] font-extrabold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded shrink-0">
                Closest Matches
              </span>
            </div>
          )}

          <div className="flex justify-between items-center px-0.5 pt-0.5">
            <div className="flex flex-col">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                {selectedCategory === "All Categories" ? "RECOMMENDED PARTS" : selectedCategory.toUpperCase()}
              </h3>
              {selectedBrand !== "All Brands" && (
                <span className="text-[10px] text-[#2563EB] font-bold">
                  Fitment: {selectedBrand} {selectedModel !== "All Models" ? `• ${selectedModel}` : ""}
                </span>
              )}
            </div>
            <span className="text-[10px] font-extrabold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full font-mono">
              {sortedFilteredParts.length} Listed
            </span>
          </div>

        {partsError && !partsLoading && !isFilterLoading ? (
          <div className="flex flex-col items-center justify-center text-center py-14 px-6 bg-white rounded-2xl border border-rose-200/90 shadow-2xs space-y-3 my-2" id="parts-error-container">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 border border-rose-100 shadow-2xs">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4 className="text-xs font-black text-slate-900">Failed to Load Spare Parts</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {partsError || "Something went wrong while fetching spare parts listings. Please check your network connection and try again."}
              </p>
            </div>
            <button
              onClick={() => {
                if (onRetry) onRetry();
              }}
              className="mt-2 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              id="retry-load-parts-btn"
            >
              <RefreshCw size={13} className="text-white" />
              <span>Retry</span>
            </button>
          </div>
        ) : (partsLoading || isFilterLoading || (taxonomyLoading && categories.length === 0)) ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5 my-2" id="parts-loading-spinner">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 border-3 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                <Car size={18} className="animate-pulse text-blue-600" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-800 tracking-wide uppercase">
                {isFilterLoading ? "Filtering Listings..." : "Loading Spare Parts..."}
              </h4>
              <p className="text-[11px] text-slate-400 font-medium max-w-xs">
                {isFilterLoading 
                  ? "Finding matching parts for your selected filters..." 
                  : "Fetching verified spare parts across India..."}
              </p>
            </div>
          </div>
        ) : sortedFilteredParts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center mb-2.5 text-slate-400">
              <Compass size={22} />
            </div>
            <h4 className="text-xs font-black text-slate-800">No spare parts found</h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
              Try selecting a different brand, category, or resetting location filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedBrand("All Brands");
                setSelectedModel("All Models");
                setSelectedCategory("All Categories");
                setSelectedPartName("All Parts");
                setSelectedState("All States");
                setSelectedDistrict("All Districts");
                setSelectedCondition("All Conditions");
              }}
              className="mt-3 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs active:scale-95 cursor-pointer"
              id="reset-filters-btn"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 sm:grid-cols-3 lg:grid-cols-4" id="parts-grid">
            {sortedFilteredParts.map((part, idx) => {
              const isFav = favorites.includes(part.id);
              return (
                <motion.div
                  key={`${part.id}-${idx}`}
                  whileHover={{ y: -2 }}
                  onClick={() => handleViewPart(part)}
                  className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-[#2563EB]/40 transition-all duration-150 flex flex-col cursor-pointer relative group h-full justify-between"
                  id={`part-card-${part.id}`}
                >
                  {/* Image container - Aspect Ratio 1:1 (Square fit) with Auto-Cropping */}
                  <div 
                    className="w-full aspect-square bg-slate-900 relative overflow-hidden group/img shrink-0 rounded-t-xl"
                  >
                    {/* Shimmer skeleton before loaded */}
                    <div className="absolute inset-0 bg-slate-800 animate-pulse pointer-events-none z-0" />

                    {part.imageUrl ? (
                      <img
                        src={part.imageUrl}
                        alt={part.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onLoad={(e) => {
                          const skeleton = (e.target as HTMLImageElement).parentElement?.querySelector('.animate-pulse');
                          if (skeleton) skeleton.classList.add('hidden');
                        }}
                        onError={(e) => {
                          // Fallback on broken image
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            const skeleton = parent.querySelector('.animate-pulse');
                            if (skeleton) skeleton.classList.add('hidden');
                            const fallback = parent.querySelector('.image-fallback-container');
                            if (fallback) fallback.classList.remove('hidden');
                          }
                        }}
                        className="w-full h-full object-cover object-center transition-transform duration-300 group-hover/img:scale-105 relative z-1"
                      />
                    ) : null}

                    {/* Image Fallback container when missing or broken */}
                    <div className={`w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center text-blue-300 gap-1 p-2 image-fallback-container relative z-1 ${part.imageUrl ? 'hidden' : ''}`}>
                      <ImageIcon size={20} className="text-blue-400/80" />
                      <span className="text-[8px] font-bold tracking-wider uppercase text-slate-300 text-center line-clamp-2 px-1">
                        {part.partName || part.category}
                      </span>
                    </div>

                    {part.sold && (
                      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-10">
                        <span className="text-[8.5px] font-black tracking-widest text-white bg-rose-600 px-2 py-0.5 rounded-full uppercase shadow-xs">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                    
                    {/* Condition badge */}
                    <div className="absolute top-1.5 left-1.5 flex gap-1 z-10">
                      <span className={`text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded-md shadow-2xs border uppercase ${getConditionColor(part.condition)}`}>
                        {part.condition}
                      </span>
                    </div>

                    {/* Favorite Button */}
                    {onFavoriteToggle && (
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFavoriteToggle(part.id);
                        }}
                        className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all z-10 ${
                          isFav 
                            ? "bg-rose-500 text-white shadow-sm border border-rose-400" 
                            : "bg-slate-950/40 text-white hover:bg-slate-950/70 border border-white/20"
                        }`}
                        id={`fav-btn-${part.id}`}
                        title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                      >
                        <Heart size={13} fill={isFav ? "currentColor" : "none"} strokeWidth={2.5} />
                      </motion.button>
                    )}

                    {/* Price Tag Overlay */}
                    <div className="absolute bottom-1.5 left-1.5 bg-[#0B1220]/90 backdrop-blur-xs text-white text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs font-mono border border-white/10 flex items-center gap-0.5">
                      <span className="text-blue-400 text-[9px] font-sans font-bold">₹</span>
                      <span>{part.price ? part.price.toLocaleString("en-IN") : "N/A"}</span>
                    </div>
                  </div>

                  {/* Card Content details */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      <div className="flex items-center gap-1 mb-1 font-bold text-[9px]">
                        <span className="text-slate-700 uppercase truncate bg-slate-100 px-1.5 py-0.5 rounded max-w-[50%]">
                          {part.carBrand}
                        </span>
                        <span className="text-[#2563EB] uppercase truncate bg-[#2563EB]/10 px-1.5 py-0.5 rounded max-w-[50%]">
                          {part.carModel}
                        </span>
                      </div>
                      
                      <h4 className="text-[11.5px] sm:text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-[#2563EB] transition-colors leading-snug min-h-[2rem]">
                        {part.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                        {part.category} {part.partName ? `• ${part.partName}` : ""}
                      </p>
                    </div>

                    {/* Seller & Location Social Info */}
                    <div className="border-t border-slate-100 pt-2 mt-2 space-y-1.5">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenUserProfile && part.sellerId) {
                            onOpenUserProfile(part.sellerId, part.contactName);
                          } else {
                            setSelectedPart(part);
                            setShowReviews(true);
                          }
                        }}
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer group/seller min-w-0"
                        title={`View ${part.contactName}'s Profile`}
                      >
                        <UserAvatar
                          userId={part.sellerId}
                          name={part.contactName}
                          photoURL={part.sellerPhoto || part.sellerAvatar}
                          size="xs"
                          interactive
                        />
                        <span className="text-[10px] font-bold text-slate-700 truncate group-hover/seller:text-[#2563EB] transition-colors">
                          {part.contactName}
                        </span>
                      </div>

                      {(() => {
                        const locBadge = formatLocationBadgeWithDistance(part, effectiveUserCoords);
                        return (
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold pt-0.5">
                            <span className="flex items-center gap-1 text-slate-500 max-w-[65%] truncate" title={locBadge.text}>
                              <MapPin size={10} className="text-blue-600 shrink-0" />
                              <span className="truncate font-medium">{locBadge.text}</span>
                            </span>
                            {locBadge.distanceText ? (
                              <span className="text-[8.5px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/60 shrink-0 font-mono">
                                {locBadge.distanceText}
                              </span>
                            ) : (
                              <span className="font-mono text-slate-400 shrink-0">{getRelativeTime(part.createdAt)}</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        </div>
        </PullToRefresh>
      </div>

      {/* Part Detail Drawer Overlay */}
      <AnimatePresence>
        {selectedPart && (
          <motion.div
            key="part-detail-backdrop-motion"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="absolute inset-0 bg-slate-50 z-30 flex flex-col text-slate-900 overflow-hidden"
            id="part-detail-backdrop"
          >
            {/* Custom Toast Alert for sharing link */}
            <AnimatePresence>
              {showShareToast && (
                <motion.div
                  key="share-toast-hs-motion"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 10 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-lg font-bold flex items-center gap-2 z-[99]"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  <span>Link copied to clipboard!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sticky Top Header Bar */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-3.5 py-2.5 flex items-center justify-between z-20 shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPart(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer text-slate-800"
                  id="close-detail-btn"
                >
                  <ArrowLeft size={22} strokeWidth={2.5} />
                </button>
                <div className="flex flex-col">
                  <span className="font-extrabold text-xs text-slate-900 tracking-wide uppercase">Ad Details</span>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">ID: {selectedPart.id.substring(0, 8).toUpperCase()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Share Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const shareUrl = window.location.origin + "?part=" + selectedPart.id;
                    if (navigator.share) {
                      navigator.share({
                        title: selectedPart.title,
                        text: `Check out this ${selectedPart.carBrand} ${selectedPart.carModel} ${selectedPart.title} on Autoparts India!`,
                        url: shareUrl
                      }).catch(() => {
                        navigator.clipboard.writeText(shareUrl);
                        setShowShareToast(true);
                        setTimeout(() => setShowShareToast(false), 2000);
                      });
                    } else {
                      navigator.clipboard.writeText(shareUrl);
                      setShowShareToast(true);
                      setTimeout(() => setShowShareToast(false), 2000);
                    }
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 text-slate-700 cursor-pointer"
                  title="Share"
                >
                  <Share2 size={20} />
                </button>

                {/* Heart/Favorite Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onFavoriteToggle) onFavoriteToggle(selectedPart.id);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all active:scale-95 cursor-pointer text-slate-700"
                  title="Favorite"
                >
                  <Heart
                    size={20}
                    className={favorites.includes(selectedPart.id) ? "fill-red-500 text-red-500 stroke-red-500 animate-pulse" : "text-slate-700"}
                  />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-44 scrollbar-none bg-slate-50 dark:bg-slate-950">
              {/* Cover Image Carousel */}
              {(() => {
                const imageList: string[] = [];
                if (selectedPart.imageUrls && selectedPart.imageUrls.length > 0) {
                  selectedPart.imageUrls.forEach(url => {
                    if (url && !imageList.includes(url)) {
                      imageList.push(url);
                    }
                  });
                } else if (selectedPart.imageUrl) {
                  imageList.push(selectedPart.imageUrl);
                }

                // Touch swipe handlers
                let touchStartX = 0;

                const handleTouchStartLocal = (e: React.TouchEvent) => {
                  touchStartX = e.touches[0].clientX;
                };

                const handleTouchEndLocal = (e: React.TouchEvent) => {
                  const touchEndX = e.changedTouches[0].clientX;
                  const diffX = touchEndX - touchStartX;
                  if (Math.abs(diffX) > 40) {
                    if (diffX > 0) {
                      // swipe right -> previous image
                      setDetailImageIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
                    } else {
                      // swipe left -> next image
                      setDetailImageIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
                    }
                  }
                };

                return (
                  <div 
                    className="w-full aspect-[4/3] max-h-[360px] bg-slate-950 relative cursor-pointer group overflow-hidden select-none touch-pan-y flex items-center justify-center border-b border-slate-200 dark:border-slate-800 shadow-inner"
                    onTouchStart={handleTouchStartLocal}
                    onTouchEnd={handleTouchEndLocal}
                    onClick={() => setIsGalleryOpen(true)}
                    title="Swipe horizontally or click to view gallery"
                  >
                    <AnimatePresence mode="wait">
                      {imageList[detailImageIndex] ? (
                        <motion.img
                          key={detailImageIndex}
                          src={imageList[detailImageIndex]}
                          alt={selectedPart.title}
                          referrerPolicy="no-referrer"
                          initial={{ opacity: 0.85, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0.85, scale: 0.98 }}
                          transition={{ duration: 0.2 }}
                          className="w-full h-full object-contain max-h-[360px] select-none"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[220px] bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center text-indigo-400 gap-2 p-4">
                          <ImageIcon size={36} className="text-indigo-400/80 animate-pulse" />
                          <span className="text-xs font-bold tracking-wider uppercase opacity-80 text-center">{selectedPart.partName || selectedPart.category}</span>
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Left/Right click arrow buttons for desktop */}
                    {imageList.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailImageIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-indigo-600 text-white rounded-full transition-all z-10 cursor-pointer shadow-md opacity-0 group-hover:opacity-100 md:opacity-80 flex items-center justify-center border border-white/10"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailImageIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-indigo-600 text-white rounded-full transition-all z-10 cursor-pointer shadow-md opacity-0 group-hover:opacity-100 md:opacity-80 flex items-center justify-center border border-white/10"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}

                    {/* Progress indicators dots or pills */}
                    {imageList.length > 1 && (
                      <div className="absolute bottom-3 left-4 flex items-center gap-1.5 z-10">
                        {imageList.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailImageIndex(idx);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              idx === detailImageIndex ? "w-4 bg-indigo-500" : "w-1.5 bg-white/45"
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Image Counter Badge (OLX style) */}
                    <div className="absolute bottom-3 right-4 bg-black/70 backdrop-blur-xs text-[11px] font-bold text-white px-2.5 py-1 rounded-md tracking-wider font-mono z-10 border border-white/10">
                      {detailImageIndex + 1} / {imageList.length}
                    </div>

                    {/* Gallery hint badge / button (Top Left) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsGalleryOpen(true);
                      }}
                      className="absolute top-3 left-4 bg-slate-900/80 hover:bg-indigo-600 backdrop-blur-sm text-[10px] font-black tracking-wider text-white px-2.5 py-1.5 rounded-md flex items-center gap-1 border border-white/10 transition-all z-10 cursor-pointer shadow-md active:scale-95"
                      title="View Fullscreen Gallery"
                    >
                      <Maximize2 size={10} className="text-indigo-400" />
                      VIEW FULLSCREEN
                    </button>

                    {selectedPart.sold && (
                      <div className="absolute inset-0 bg-slate-950/75 flex items-center justify-center z-20 backdrop-blur-2xs">
                        <span className="text-xs font-black tracking-widest text-white bg-rose-600 px-4 py-2 rounded-lg uppercase shadow-xl border border-rose-500">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="p-3.5 space-y-3.5">
                {/* Price, Title, Location details */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
                      {formatPrice(selectedPart.price)}
                    </span>
                    <span className={`inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${getConditionColor(selectedPart.condition)}`}>
                      {selectedPart.condition}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug tracking-tight">
                    {selectedPart.title}
                  </h3>
                  <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1 font-bold">
                      <MapPin size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                      {selectedPart.area ? `${selectedPart.area}, ` : ""}{selectedPart.district || selectedPart.location}, {selectedPart.state || "All India"}
                    </span>
                    <span className="font-semibold text-slate-400">
                      {new Date(selectedPart.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short"
                      })}
                    </span>
                  </div>
                </div>

                {/* Key attributes/Specification grid */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide border-l-3 border-indigo-600 pl-2">
                    Details & Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-1">
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Brand</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{selectedPart.carBrand}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Model Compatibility</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{selectedPart.carModel}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Category</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{selectedPart.category}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Condition</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{selectedPart.condition}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">State</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{selectedPart.state || "All India"}</span>
                    </div>
                    <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">District / Town</span>
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                        {selectedPart.area ? `${selectedPart.area} (${selectedPart.district || ""})` : selectedPart.district || "All Districts"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description block */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide border-l-3 border-indigo-600 pl-2">
                    Description
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium pt-1">
                    {selectedPart.description}
                  </p>
                </div>

                {/* Verified Seller info */}
                <div 
                  onClick={() => setShowReviews(true)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                  id="part-detail-seller-card"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      userId={selectedPart.sellerId}
                      name={selectedPart.contactName}
                      photoURL={selectedPart.sellerPhoto || selectedPart.sellerAvatar}
                      size="lg"
                      showVerifiedBadge
                    />
                    <div>
                      <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-black tracking-widest block uppercase leading-none">Verified Seller</span>
                      <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 mt-1">{selectedPart.contactName}</h5>
                      
                      {/* Rating details button */}
                      {sellerRating ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star size={11} className="fill-amber-500 text-amber-500" />
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                            {sellerRating.count > 0 ? `${sellerRating.average} (${sellerRating.count} reviews)` : "New Seller (No reviews)"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Click to view public profile</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                </div>

                {/* Map approximate location card */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide border-l-3 border-indigo-600 pl-2">
                    Posted In
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold">
                    <MapPin size={14} className="text-indigo-600 dark:text-indigo-400" />
                    <span>{selectedPart.district || selectedPart.location}, {selectedPart.state || "All India"}</span>
                  </div>
                  <GMap
                    lat={selectedPart.lat}
                    lng={selectedPart.lng}
                    state={selectedPart.state}
                    district={selectedPart.district}
                    height="180px"
                  />
                </div>
              </div>
            </div>

            {/* Toast Notification */}
            {toast && (
              <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full shadow-lg font-extrabold text-xs flex items-center gap-2 transition-all animate-bounce ${
                toast.type === "error" ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
              }`}>
                <span>{toast.message}</span>
              </div>
            )}

            {/* Sticky Bottom Call / Chat Action Bar - Elevated above bottom nav bar */}
            <div 
              className="absolute bottom-[66px] sm:bottom-[70px] inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 flex items-center gap-3 z-30 shadow-[0_-6px_20px_rgba(0,0,0,0.08)]"
              id="ad-details-action-bar-hs"
            >
              {(() => {
                const currentUid = auth?.currentUser?.uid || currentUser?.uid || currentUser?.id || null;
                const currentEmail = (auth?.currentUser?.email || currentUser?.email || "").toLowerCase();
                const listingOwnerId = selectedPart.ownerId || (selectedPart as any).sellerId || (selectedPart as any).userId || null;
                const listingSellerEmail = (selectedPart.sellerEmail || "").toLowerCase();

                const isOwner = Boolean(
                  (currentUid && listingOwnerId && (currentUid === listingOwnerId || String(currentUid) === String(listingOwnerId))) ||
                  (currentEmail && listingSellerEmail && currentEmail === listingSellerEmail) ||
                  currentUser?.isAdmin ||
                  currentUser?.isSuperAdmin ||
                  currentUser?.role === "admin" ||
                  currentEmail === "wwwautoparts2@gmail.com" ||
                  currentEmail === "ym1950394@gmail.com" ||
                  currentEmail === "www.allahforgiveness877@gmail.com"
                );

                if (isOwner) {
                  return (
                    <>
                      <button
                        onClick={() => {
                          setEditingPart(selectedPart);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                        id="edit-own-listing-btn"
                      >
                        <Edit3 size={15} />
                        <span>Edit Listing</span>
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to permanently delete this listing? This will delete images and data from everywhere.")) {
                            try {
                              setIsDeletingPart(true);
                              const targetId = selectedPart.id;
                              const ok = await deleteSparePartListing(targetId);
                              if (ok) {
                                setEditingPart(null);
                                setSelectedPart(null);
                                if (onPartDeleted) {
                                  onPartDeleted(targetId);
                                }
                                try {
                                  window.history.replaceState({ index: 0, screen: { type: "tab", tab: "home" } }, "", "/");
                                } catch (e) {}
                                showToast("Listing deleted successfully");
                              } else {
                                showToast("Failed to delete listing.", "error");
                              }
                            } catch (err: any) {
                              showToast("Error deleting listing: " + (err.message || String(err)), "error");
                            } finally {
                              setIsDeletingPart(false);
                            }
                          }
                        }}
                        disabled={isDeletingPart}
                        className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                        id="delete-own-listing-btn"
                      >
                        <Trash2 size={15} />
                        <span>{isDeletingPart ? "Deleting..." : "Delete Listing"}</span>
                      </button>
                    </>
                  );
                }

                return (
                  <>
                    <button
                      onClick={() => {
                        if (selectedPart.sold) return;
                        if (onStartChat) {
                          onStartChat(selectedPart);
                        }
                        setSelectedPart(null);
                      }}
                      disabled={selectedPart.sold}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] cursor-pointer ${
                        selectedPart.sold
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60"
                          : "bg-teal-600 hover:bg-teal-500 text-white"
                      }`}
                      id="inapp-chat-btn"
                    >
                      <MessageSquare size={15} />
                      <span>{selectedPart.sold ? t("soldOut") : "Chat Now"}</span>
                    </button>
                    <a
                      href={selectedPart.contactPhone ? `tel:${selectedPart.contactPhone}` : undefined}
                      onClick={(e) => {
                        if (!selectedPart.contactPhone) {
                          e.preventDefault();
                          alert("No contact phone provided for this seller.");
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-xs transition-all active:scale-[0.98] text-center cursor-pointer"
                      id="call-seller-btn"
                    >
                      <Phone size={15} />
                      <span>{t("callSeller")}</span>
                    </a>
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seller Profile View Overlay */}
      <AnimatePresence>
        {showReviews && selectedPart && (
          <SellerProfileView
            key="seller-profile-view-hs"
            sellerId={selectedPart.sellerId}
            sellerName={selectedPart.contactName}
            currentUser={currentUser}
            onClose={() => setShowReviews(false)}
            onStartChat={onStartChat}
            allParts={parts}
            onSelectPart={(part) => handleViewPart(part)}
            onOpenUserProfile={onOpenUserProfile}
          />
        )}
      </AnimatePresence>

      {/* Advanced Filter Drawer */}
      <AnimatePresence>
        {showFiltersModal && (
          <motion.div
            key="filters-backdrop-hs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFiltersModal(false)}
            className="absolute inset-0 bg-black/60 z-30 flex items-end"
            id="filters-backdrop"
          >
            <motion.div
              key="filters-content-hs"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-[32px] w-full max-h-[85%] overflow-y-auto p-5 space-y-5 shadow-2xl relative text-slate-900"
              id="filters-modal-body"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <SlidersHorizontal size={16} className="text-indigo-600" />
                  Advanced Filter
                </h3>
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full"
                  id="close-filters-btn"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 1. Brand Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  1. Select Car Brand
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Brands">All Brands (India)</option>
                  {Object.keys(brands).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* 2. Model Dropdown (Disabled if Brand is All Brands) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  2. Select Specific Model
                </label>
                <select
                  value={selectedModel}
                  disabled={selectedBrand === "All Brands"}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-55 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Models">All Models</option>
                  {availableModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {selectedBrand === "All Brands" && (
                  <span className="text-[9px] text-slate-400 font-medium block">Choose a Brand first to view specific models.</span>
                )}
              </div>

              {/* 3. Category Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  3. Part Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedPartName("All Parts");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Categories">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* 3b. Specific Part Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  3b. Specific Spare Part
                </label>
                <select
                  value={selectedPartName}
                  disabled={selectedCategory === "All Categories"}
                  onChange={(e) => setSelectedPartName(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-55 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="All Parts">All Parts</option>
                  {(selectedCategory !== "All Categories" ? CAR_SPARE_PARTS_BY_CATEGORY[selectedCategory] || [] : []).map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
                {selectedCategory === "All Categories" && (
                  <span className="text-[9px] text-slate-400 font-medium block">Choose a Category first to view specific spare parts.</span>
                )}
              </div>

              {/* 4. Condition Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  4. Part Condition
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["All Conditions", "Brand New", "Like New", "Used (Good)", "For Scrap/Spares"].map((cond) => (
                    <button
                      key={cond}
                      onClick={() => setSelectedCondition(cond)}
                      className={`py-1.5 px-1 text-[10px] font-bold rounded-xl border text-center transition-all truncate ${
                        selectedCondition === cond
                          ? "bg-blue-50 border-blue-200 text-[#2563EB] font-bold shadow-2xs"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                      title={cond}
                    >
                      {cond === "All Conditions" ? "All" : cond}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Cascading Location Filter */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  5. Location (Cascading Filter)
                </span>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 block">STATE</span>
                    <select
                      value={selectedState}
                      onChange={(e) => {
                        setSelectedState(e.target.value);
                        setSelectedDistrict("All Districts");
                      }}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="All States">All India</option>
                      {INDIAN_STATES_AND_DISTRICTS.map((s) => (
                        <option key={s.state} value={s.state}>{s.state}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-500 block">DISTRICT</span>
                    <select
                      value={selectedDistrict}
                      disabled={selectedState === "All States"}
                      onChange={(e) => setSelectedDistrict(e.target.value)}
                      className="w-full bg-white disabled:opacity-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="All Districts">All Districts</option>
                      {(INDIAN_STATES_AND_DISTRICTS.find(s => s.state === selectedState)?.districts || []).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedBrand("All Brands");
                    setSelectedModel("All Models");
                    setSelectedCategory("All Categories");
                    setSelectedPartName("All Parts");
                    setSelectedState("All States");
                    setSelectedDistrict("All Districts");
                    setSelectedCondition("All Conditions");
                    setShowFiltersModal(false);
                  }}
                  className="flex-1 py-3 border border-slate-200 text-slate-500 font-bold text-xs rounded-2xl hover:bg-slate-50 transition-all text-center"
                  id="filter-reset-all-btn"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-sm text-center"
                  id="filter-apply-all-btn"
                >
                  Show Results
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightweight Location Filter Bottom Sheet Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div
            key="location-modal-backdrop-hs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLocationModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center"
            id="location-selector-backdrop"
          >
            <motion.div
              key="location-modal-content-hs"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl relative text-slate-900 overflow-hidden"
              id="location-selector-modal-body"
            >
              {/* Grab Handle */}
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1" />

              {/* Modal Header */}
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#2563EB]" />
                    Filter by Location
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Current: <span className="font-bold text-[#2563EB]">{getLocationDisplayText()}</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-colors cursor-pointer"
                  id="close-location-modal-btn"
                >
                  <X size={15} />
                </button>
              </div>

              {/* 3 Core Mode Cards: Nearby (GPS), Select District, All India */}
              <div className="p-3 border-b border-slate-100 bg-slate-50/60 space-y-2 shrink-0">
                <div className="grid grid-cols-3 gap-2">
                  {/* 1. Nearby (GPS) */}
                  <button
                    type="button"
                    onClick={() => {
                      setLocationFilterMode("nearby");
                      if (!userCoords && !userDetectedDistrict) {
                        handleDetectLocationClick();
                      } else {
                        setShowLocationModal(false);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      locationFilterMode === "nearby" && (userCoords || userDetectedDistrict)
                        ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 text-[#2563EB]"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                    id="loc-sheet-mode-nearby"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        locationFilterMode === "nearby" && (userCoords || userDetectedDistrict) ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        <Navigation size={12} className={isDetectingLocation ? "animate-spin" : ""} />
                      </div>
                      {locationFilterMode === "nearby" && (userCoords || userDetectedDistrict) && (
                        <Check size={12} className="text-[#2563EB]" />
                      )}
                    </div>
                    <div>
                      <span className="text-[11px] font-black block leading-tight">Nearby (GPS)</span>
                      <span className="text-[9px] text-slate-500 font-medium block truncate mt-0.5">
                        {isDetectingLocation ? "Detecting..." : userDetectedArea || userDetectedDistrict || "Auto-detect"}
                      </span>
                    </div>
                  </button>

                  {/* 2. Select District */}
                  <button
                    type="button"
                    onClick={() => {
                      setLocationFilterMode("district");
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      locationFilterMode === "district" && selectedDistrict !== "All Districts"
                        ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 text-[#2563EB]"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                    id="loc-sheet-mode-district"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        locationFilterMode === "district" && selectedDistrict !== "All Districts" ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        <Layers size={12} />
                      </div>
                      {locationFilterMode === "district" && selectedDistrict !== "All Districts" && (
                        <Check size={12} className="text-[#2563EB]" />
                      )}
                    </div>
                    <div>
                      <span className="text-[11px] font-black block leading-tight">District</span>
                      <span className="text-[9px] text-slate-500 font-medium block truncate mt-0.5">
                        {selectedDistrict !== "All Districts" ? selectedDistrict : "Pick District"}
                      </span>
                    </div>
                  </button>

                  {/* 3. All India */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedState("All States");
                      setSelectedDistrict("All Districts");
                      setLocationFilterMode("state");
                      localStorage.setItem("autoparts_selected_state", "All States");
                      localStorage.setItem("autoparts_selected_district", "All Districts");
                      setShowLocationModal(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedState === "All States" && locationFilterMode !== "nearby"
                        ? "bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 text-[#2563EB]"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                    id="loc-sheet-mode-allindia"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                        selectedState === "All States" && locationFilterMode !== "nearby" ? "bg-[#2563EB] text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        <Compass size={12} />
                      </div>
                      {selectedState === "All States" && locationFilterMode !== "nearby" && (
                        <Check size={12} className="text-[#2563EB]" />
                      )}
                    </div>
                    <div>
                      <span className="text-[11px] font-black block leading-tight">All India</span>
                      <span className="text-[9px] text-slate-500 font-medium block truncate mt-0.5">
                        Whole Country
                      </span>
                    </div>
                  </button>
                </div>

                {/* Radius Selector when Nearby mode is active */}
                {locationFilterMode === "nearby" && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 mt-1">
                    <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                      Nearby Radius:
                    </span>
                    <div className="flex items-center gap-1">
                      {[10, 25, 50, 100].map((radius) => (
                        <button
                          key={radius}
                          type="button"
                          onClick={() => {
                            setNearbyRadiusKm(radius);
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                            nearbyRadiusKm === radius
                              ? "bg-[#2563EB] text-white shadow-2xs"
                              : "bg-slate-200/80 text-slate-600 hover:bg-slate-300"
                          }`}
                        >
                          {radius} km
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Search Box */}
              <div className="p-3 border-b border-slate-100 shrink-0 bg-white space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={locSearchQuery}
                    onChange={(e) => {
                      setLocSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        setLocActiveState(null);
                      }
                    }}
                    placeholder="Search Indian states or districts (e.g. Pune, Delhi)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    id="location-search-input"
                  />
                  {locSearchQuery && (
                    <button
                      onClick={() => setLocSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {locationDetectError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[10px] text-rose-600 flex items-center gap-1.5">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{locationDetectError}</span>
                  </div>
                )}
              </div>

              {/* Modal Content / Lists */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {locSearchQuery.trim() ? (
                  /* --- SEARCH RESULTS VIEW --- */
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-1">
                      Search Results
                    </span>

                    {/* All India option if matched */}
                    {("all india".includes(locSearchQuery.trim().toLowerCase()) || "india".includes(locSearchQuery.trim().toLowerCase())) && (
                      <button
                        onClick={() => {
                          setSelectedState("All States");
                          setSelectedDistrict("All Districts");
                          setLocationFilterMode("state");
                          localStorage.setItem("autoparts_selected_state", "All States");
                          localStorage.setItem("autoparts_selected_district", "All Districts");
                          setShowLocationModal(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between border border-transparent hover:border-slate-100 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <Compass size={14} className="text-sky-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-800">All India</span>
                        </div>
                        <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Default</span>
                      </button>
                    )}

                    {/* State & District matches */}
                    {(() => {
                      const query = locSearchQuery.trim().toLowerCase();
                      const items: React.ReactNode[] = [];
                      
                      INDIAN_STATES_AND_DISTRICTS.forEach((s) => {
                        // Check state name match
                        if (s.state.toLowerCase().includes(query)) {
                          items.push(
                            <button
                              key={`state-${s.state}`}
                              onClick={() => {
                                setLocActiveState(s.state);
                                setLocSearchQuery("");
                              }}
                              className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between border border-transparent hover:border-slate-100 cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5">
                                <MapPin size={14} className="text-[#2563EB] shrink-0" />
                                <span className="text-xs font-bold text-slate-800">{s.state}</span>
                              </div>
                              <span className="text-[9px] bg-blue-50 text-[#2563EB] px-1.5 py-0.5 rounded font-mono font-bold uppercase">State ({s.districts.length})</span>
                            </button>
                          );
                        }

                        // Check district matches
                        s.districts.forEach((d) => {
                          if (d.toLowerCase().includes(query)) {
                            items.push(
                              <button
                                key={`dist-${s.state}-${d}`}
                                onClick={() => {
                                  setSelectedState(s.state);
                                  setSelectedDistrict(d);
                                  setLocationFilterMode("district");
                                  localStorage.setItem("autoparts_selected_state", s.state);
                                  localStorage.setItem("autoparts_selected_district", d);
                                  setShowLocationModal(false);
                                }}
                                className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between border border-transparent hover:border-slate-100 cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5">
                                  <MapPin size={14} className="text-emerald-500 shrink-0" />
                                  <span className="text-xs font-bold text-slate-800">
                                    {s.state} <span className="text-slate-400 font-medium">›</span> {d}
                                  </span>
                                </div>
                                <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-mono font-bold uppercase">District</span>
                              </button>
                            );
                          }
                        });
                      });

                      if (items.length === 0 && !("all india".includes(query) || "india".includes(query))) {
                        return (
                          <div className="text-center py-8">
                            <span className="text-xs text-slate-400 font-medium">No states or districts match your search</span>
                          </div>
                        );
                      }

                      return items;
                    })()}
                  </div>
                ) : locActiveState ? (
                  /* --- DISTRICTS LIST FOR ACTIVE STATE --- */
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <button
                        onClick={() => setLocActiveState(null)}
                        className="text-xs font-bold text-[#2563EB] hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                        id="loc-back-to-states-btn"
                      >
                        ← Back to States
                      </button>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {locActiveState} Districts
                      </span>
                    </div>

                    {/* All Districts of this State option */}
                    <button
                      onClick={() => {
                        setSelectedState(locActiveState);
                        setSelectedDistrict("All Districts");
                        setLocationFilterMode("state");
                        localStorage.setItem("autoparts_selected_state", locActiveState);
                        localStorage.setItem("autoparts_selected_district", "All Districts");
                        setShowLocationModal(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100 transition-colors flex items-center justify-between border border-transparent hover:border-slate-200 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Compass size={14} className="text-[#2563EB] shrink-0" />
                        <span className="text-xs font-bold text-slate-800">All Districts in {locActiveState}</span>
                      </div>
                      <span className="text-[9px] bg-blue-50 text-[#2563EB] px-1.5 py-0.5 rounded font-mono font-bold uppercase">All State</span>
                    </button>

                    {/* List of Districts */}
                    {(INDIAN_STATES_AND_DISTRICTS.find(s => s.state === locActiveState)?.districts || []).map((d) => {
                      const isCurrentlySelected = selectedState === locActiveState && selectedDistrict === d && locationFilterMode === "district";
                      return (
                        <button
                          key={d}
                          onClick={() => {
                            setSelectedState(locActiveState);
                            setSelectedDistrict(d);
                            setLocationFilterMode("district");
                            localStorage.setItem("autoparts_selected_state", locActiveState);
                            localStorage.setItem("autoparts_selected_district", d);
                            setShowLocationModal(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-colors flex items-center justify-between border cursor-pointer ${
                            isCurrentlySelected 
                              ? "bg-blue-50 border-blue-200 text-[#2563EB]" 
                              : "border-transparent hover:bg-slate-50 hover:border-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <MapPin size={14} className={isCurrentlySelected ? "text-[#2563EB] shrink-0" : "text-slate-400 shrink-0"} />
                            <span className="text-xs font-bold">{d}</span>
                          </div>
                          {isCurrentlySelected && (
                            <span className="text-[9px] bg-[#2563EB] text-white px-1.5 py-0.5 rounded font-mono font-bold uppercase">Selected</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* --- DEFAULT STATES LIST --- */
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1 mb-1.5">
                      Select State & District
                    </span>

                    {/* List of States */}
                    {INDIAN_STATES_AND_DISTRICTS.map((s) => {
                      const isStateSelected = selectedState === s.state;
                      return (
                        <button
                          key={s.state}
                          onClick={() => {
                            setLocActiveState(s.state);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-colors flex items-center justify-between border cursor-pointer ${
                            isStateSelected 
                              ? "bg-blue-50 border-blue-200 text-[#2563EB]" 
                              : "border-transparent hover:bg-slate-50 hover:border-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <MapPin size={14} className={isStateSelected ? "text-[#2563EB] shrink-0" : "text-slate-400 shrink-0"} />
                            <span className="text-xs font-bold">{s.state}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono font-bold">
                              {s.districts.length} districts
                            </span>
                            <ChevronRight size={12} className="text-slate-400" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        part={selectedPart}
        initialIndex={detailImageIndex}
      />

      {editingPart && (
        <EditListingModal
          part={editingPart}
          onClose={() => setEditingPart(null)}
          onSave={handleSaveListingChanges}
          onDelete={async (id) => {
            try {
              const ok = await deleteSparePartListing(id);
              if (ok) {
                setEditingPart(null);
                setSelectedPart(null);
                if (onPartDeleted) {
                  onPartDeleted(id);
                }
                try {
                  window.history.replaceState({ index: 0, screen: { type: "tab", tab: "home" } }, "", "/");
                } catch (e) {}
                showToast("Listing deleted successfully");
              } else {
                showToast("Failed to delete listing.", "error");
              }
            } catch (err: any) {
              showToast("Error deleting listing: " + (err.message || String(err)), "error");
            }
          }}
        />
      )}

      {deleteError && (
        <div className="fixed bottom-4 left-4 right-4 bg-rose-600 text-white p-3 rounded-xl shadow-lg z-50 text-xs flex items-center justify-between">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="font-bold underline">Dismiss</button>
        </div>
      )}
    </div>
  );
}
