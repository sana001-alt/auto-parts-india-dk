import React, { useState, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  Car,
  Tag,
  ChevronDown,
  Layers,
  Heart,
  MessageSquare,
  Sparkles,
  RotateCcw,
  Check
} from "lucide-react";
import { SparePart, User } from "../types";
import { subscribeToTaxonomyConfig, FullTaxonomyConfig } from "../lib/firebase";
import UserAvatar from "./UserAvatar";
import PullToRefresh from "./PullToRefresh";
import { useLanguage } from "../lib/LanguageContext";
import { translateDynamic } from "../lib/translations";
import { formatLocationBadgeWithDistance, LatLng } from "../utils/locationHelper";

interface SearchScreenProps {
  parts: SparePart[];
  partsLoading?: boolean;
  currentUser: User | null;
  favorites: string[];
  onFavoriteToggle?: (partId: string) => void;
  onViewPart?: (part: SparePart) => void;
  onStartChat?: (part: SparePart) => void;
  onOpenUserProfile?: (userId: string, userName: string) => void;
  onRefresh?: () => Promise<void> | void;
}

export default function SearchScreen({
  parts,
  partsLoading = false,
  currentUser,
  favorites,
  onFavoriteToggle,
  onViewPart,
  onStartChat,
  onOpenUserProfile,
  onRefresh
}: SearchScreenProps) {
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedBrand, setSelectedBrand] = useState("All Brands");
  const [selectedModel, setSelectedModel] = useState("All Models");
  const [selectedCondition, setSelectedCondition] = useState("All Conditions");
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [sortBy, setSortBy] = useState<"newest" | "price_low" | "price_high">("newest");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const [taxonomy, setTaxonomy] = useState<FullTaxonomyConfig>({
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
    const unsub = subscribeToTaxonomyConfig((config) => {
      setTaxonomy(config);
    });
    return () => unsub();
  }, []);

  const activeFiltersCount = [
    selectedCategory !== "All Categories",
    selectedBrand !== "All Brands",
    selectedModel !== "All Models",
    selectedCondition !== "All Conditions",
    selectedState !== "All States",
    selectedDistrict !== "All Districts"
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All Categories");
    setSelectedBrand("All Brands");
    setSelectedModel("All Models");
    setSelectedCondition("All Conditions");
    setSelectedState("All States");
    setSelectedDistrict("All Districts");
    setSortBy("newest");
  };

  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      // Exclude sold, expired, or deleted parts from search
      const isSold = part.sold === true || part.status === "sold";
      const isExpired = (Date.now() - part.createdAt) > 90 * 24 * 60 * 60 * 1000;
      const isDeleted = (part as any).isDeleted === true;
      if (isSold || isExpired || isDeleted) return false;

      // Search text query matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (part.title || "").toLowerCase().includes(q);
        const matchBrand = (part.carBrand || "").toLowerCase().includes(q);
        const matchModel = (part.carModel || "").toLowerCase().includes(q);
        const matchCategory = (part.category || "").toLowerCase().includes(q);
        const matchPartName = (part.partName || "").toLowerCase().includes(q);
        const matchDescription = (part.description || "").toLowerCase().includes(q);
        const matchLocation = (part.location || "").toLowerCase().includes(q);
        const matchDistrict = (part.district || "").toLowerCase().includes(q);
        const matchArea = (part.area || "").toLowerCase().includes(q);
        const matchState = (part.state || "").toLowerCase().includes(q);

        if (
          !matchTitle &&
          !matchBrand &&
          !matchModel &&
          !matchCategory &&
          !matchPartName &&
          !matchDescription &&
          !matchLocation &&
          !matchDistrict &&
          !matchArea &&
          !matchState
        ) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== "All Categories" && part.category !== selectedCategory) {
        return false;
      }

      // Brand filter
      if (selectedBrand !== "All Brands" && part.carBrand !== selectedBrand) {
        return false;
      }

      // Model filter
      if (selectedModel !== "All Models" && part.carModel !== selectedModel) {
        return false;
      }

      // Condition filter
      if (selectedCondition !== "All Conditions" && part.condition !== selectedCondition) {
        return false;
      }

      // State filter
      if (selectedState !== "All States" && part.state !== selectedState) {
        return false;
      }

      // District filter
      if (selectedDistrict !== "All Districts" && part.district !== selectedDistrict) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "price_low") return a.price - b.price;
      if (sortBy === "price_high") return b.price - a.price;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [
    parts,
    searchQuery,
    selectedCategory,
    selectedBrand,
    selectedModel,
    selectedCondition,
    selectedState,
    selectedDistrict,
    sortBy
  ]);

  const quickCategories = [
    "All Categories",
    "Engine & Drivetrain",
    "Body & Chassis",
    "Brakes & Wheels",
    "Suspension & Steering",
    "Electrical & Lighting",
    "AC & Heating",
    "Interior Accessories"
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-hidden select-none">
      {/* Native App Top Header */}
      <div className="shrink-0 bg-white dark:bg-slate-850 px-4 pt-3 pb-2 border-b border-slate-200/80 dark:border-slate-800 shadow-xs z-10">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              {translateDynamic("Search Parts", language)}
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {filteredParts.length} {translateDynamic("spare parts available", language)}
            </p>
          </div>

          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold rounded-full active:scale-95 transition-all"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Search Bar & Filter Button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={translateDynamic("Search brand, model, part name...", language)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all border border-slate-200/60 dark:border-slate-700/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsFilterSheetOpen(true)}
            className={`relative p-2.5 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${
              activeFiltersCount > 0
                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
            }`}
            aria-label="Open Filters"
          >
            <SlidersHorizontal size={18} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 pb-1">
          {quickCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? "All Categories" : cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50"
                }`}
              >
                {cat === "All Categories" ? translateDynamic("All", language) : cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Results Container with Native Pull to Refresh */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <PullToRefresh
          onRefresh={async () => {
            if (onRefresh) await onRefresh();
          }}
          className="px-3 py-3"
        >
          {filteredParts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <Search size={26} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {translateDynamic("No auto parts found", language)}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                {translateDynamic("Try adjusting your keyword or filter options to discover more listings.", language)}
              </p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform"
                >
                  {translateDynamic("Clear All Filters", language)}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 pb-20">
              {filteredParts.map((part) => {
                const isFavorite = favorites.includes(part.id);
                return (
                  <div
                    key={part.id}
                    onClick={() => onViewPart && onViewPart(part)}
                    className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col cursor-pointer active:scale-[0.98] transition-transform shadow-xs hover:shadow-md"
                  >
                    {/* Image Box - 1:1 Aspect Ratio (Square) */}
                    <div className="relative aspect-square w-full bg-slate-900 overflow-hidden rounded-t-2xl">
                      {/* Shimmer skeleton before loaded */}
                      <div className="absolute inset-0 bg-slate-800 animate-pulse pointer-events-none z-0" />

                      <img
                        src={part.imageUrl || (part.imageUrls && part.imageUrls[0]) || "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=400"}
                        alt={part.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onLoad={(e) => {
                          const skeleton = (e.target as HTMLImageElement).parentElement?.querySelector('.animate-pulse');
                          if (skeleton) skeleton.classList.add('hidden');
                        }}
                        onError={(e) => {
                          const skeleton = (e.target as HTMLImageElement).parentElement?.querySelector('.animate-pulse');
                          if (skeleton) skeleton.classList.add('hidden');
                        }}
                        className="w-full h-full object-cover object-center relative z-1"
                      />
                      {/* Price Badge */}
                      <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-white font-black text-xs z-10">
                        ₹{part.price.toLocaleString("en-IN")}
                      </div>

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onFavoriteToggle) onFavoriteToggle(part.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white active:scale-90 transition-transform z-10"
                        aria-label="Toggle Favorite"
                      >
                        <Heart
                          size={14}
                          className={isFavorite ? "fill-rose-500 text-rose-500" : "text-white"}
                        />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {part.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 flex items-center gap-1">
                          <Car size={11} className="shrink-0 text-blue-500" />
                          <span>{part.carBrand} {part.carModel}</span>
                        </p>
                      </div>

                      {(() => {
                        const locBadge = formatLocationBadgeWithDistance(part);
                        return (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 line-clamp-1 flex items-center gap-0.5 max-w-[70%]" title={locBadge.text}>
                              <MapPin size={10} className="shrink-0 text-blue-500" />
                              <span className="truncate">{locBadge.text}</span>
                            </span>

                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
                              {part.condition.includes("New") ? "New" : "Used"}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PullToRefresh>
      </div>

      {/* Native Bottom Sheet Modal for Filters */}
      {isFilterSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsFilterSheetOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-850 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Sheet Drag Pill */}
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {translateDynamic("Filter Auto Parts", language)}
              </h3>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white active:scale-95"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Brand Filter */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Car Brand
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setSelectedModel("All Models");
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="All Brands">All Brands</option>
                  {Object.keys(taxonomy.brands || {}).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Model Filter */}
              {selectedBrand !== "All Brands" && taxonomy.brands[selectedBrand] && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Car Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="All Models">All Models</option>
                    {taxonomy.brands[selectedBrand].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Filter */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Part Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="All Categories">All Categories</option>
                  {taxonomy.categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Condition Filter */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Condition
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["All Conditions", "Brand New", "Used (Good)"].map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setSelectedCondition(cond)}
                      className={`py-2 px-2 rounded-xl text-center font-bold text-[11px] border active:scale-95 transition-all ${
                        selectedCondition === cond
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {cond === "All Conditions" ? "All" : cond}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Sort By
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "newest", label: "Newest" },
                    { id: "price_low", label: "Price: Low" },
                    { id: "price_high", label: "Price: High" }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSortBy(s.id as any)}
                      className={`py-2 px-2 rounded-xl text-center font-bold text-[11px] border active:scale-95 transition-all ${
                        sortBy === s.id
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 shrink-0 bg-slate-50 dark:bg-slate-900">
              <button
                onClick={resetFilters}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 text-xs active:scale-95 transition-all"
              >
                Reset
              </button>
              <button
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-transform"
              >
                Show {filteredParts.length} Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
