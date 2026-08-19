import React, { useState, useEffect } from "react";
import { 
  X, 
  UploadCloud, 
  Check, 
  Camera, 
  Image as ImageIcon, 
  Sparkles, 
  AlertCircle, 
  FileText, 
  Compass, 
  MapPin, 
  Layers, 
  Phone, 
  User as UserIcon,
  Trash2
} from "lucide-react";
import { SparePart, INDIAN_CAR_BRANDS, CAR_PART_CATEGORIES, CAR_SPARE_PARTS_BY_CATEGORY, DEFAULT_MODEL_VARIANTS } from "../types";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import { uploadProductImage, fetchFullTaxonomyConfig, subscribeToTaxonomyConfig, deleteSparePartListing } from "../lib/firebase";
import { useLanguage } from "../lib/LanguageContext";
import { translateDynamic } from "../lib/translations";
import MapLocationModal from "./MapLocationModal";
import GMap from "./GMap";
import { getApproxCoordinates, reverseGeocodeLatLng } from "../utils/locationHelper";
import { requestCameraPermissionJIT } from "../utils/permissionUtils";
import { compressImageFile } from "../utils/imageCompressor";

interface EditListingModalProps {
  part: SparePart;
  onClose: () => void;
  onSave: (partId: string, updates: Partial<SparePart>) => Promise<void>;
  onDelete?: (partId: string) => Promise<void>;
}

export default function EditListingModal({ part, onClose, onSave, onDelete }: EditListingModalProps) {
  const { t, language } = useLanguage();
  const [title, setTitle] = useState(part.title || "");
  const [description, setDescription] = useState(part.description || "");
  const [price, setPrice] = useState(part.price?.toString() || "");
  const [carBrand, setCarBrand] = useState(part.carBrand || "");
  const [carModel, setCarModel] = useState(part.carModel || "");
  const [carVariant, setCarVariant] = useState(part.carVariant || "");
  const [category, setCategory] = useState(part.category || "");
  const [partName, setPartName] = useState(part.partName || "");
  const [condition, setCondition] = useState<"Brand New" | "Like New" | "Used (Good)" | "For Scrap/Spares">(part.condition || "Brand New");
  const [selectedState, setSelectedState] = useState(part.state || "");
  const [selectedDistrict, setSelectedDistrict] = useState(part.district || "");
  const [selectedArea, setSelectedArea] = useState(part.area || "");
  const [contactName, setContactName] = useState(part.contactName || "");
  const [contactPhone, setContactPhone] = useState(part.contactPhone || "");
  const [uploadedImages, setUploadedImages] = useState<string[]>(part.imageUrls || (part.imageUrl ? [part.imageUrl] : []));
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Dynamic taxonomy state
  const [taxonomy, setTaxonomy] = useState<{
    categories: string[];
    brands: Record<string, string[]>;
    subcategories: Record<string, string[]>;
    variants: Record<string, string[]>;
    states: string[];
    districts: Record<string, string[]>;
  }>({
    categories: [],
    brands: {},
    subcategories: {},
    variants: {},
    states: [],
    districts: {}
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const unsub = subscribeToTaxonomyConfig((full) => {
      setTaxonomy({
        categories: full.categories || [],
        brands: full.brands || {},
        subcategories: full.subcategories || {},
        variants: full.variants || {},
        states: full.states || [],
        districts: full.districts || {}
      });
    });
    return () => unsub();
  }, []);

  // Coordinates State
  const [lat, setLat] = useState<number | undefined>(part.lat);
  const [lng, setLng] = useState<number | undefined>(part.lng);
  const [showMapModal, setShowMapModal] = useState(false);

  // Sync local states if part prop changes or refreshes
  useEffect(() => {
    if (part) {
      setTitle(part.title || "");
      setDescription(part.description || "");
      setPrice(part.price !== undefined && part.price !== null ? String(part.price) : "");
      setCarBrand(part.carBrand || "");
      setCarModel(part.carModel || "");
      setCarVariant(part.carVariant || "");
      setCategory(part.category || "");
      setPartName(part.partName || "");
      setCondition(part.condition || "Brand New");
      setSelectedState(part.state || "");
      setSelectedDistrict(part.district || "");
      setSelectedArea(part.area || "");
      setContactName(part.contactName || part.sellerName || "");
      setContactPhone(part.contactPhone || "");
      setUploadedImages(
        part.imageUrls && part.imageUrls.length > 0
          ? part.imageUrls
          : part.images && part.images.length > 0
          ? part.images
          : part.imageUrl
          ? [part.imageUrl]
          : []
      );
      setLat(part.lat);
      setLng(part.lng);
    }
  }, [part]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [directImageUrlInput, setDirectImageUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Robust options with immediate fallback to static data and pre-filled current values
  const allBrands = Object.keys(taxonomy.brands || {}).length > 0 
    ? Object.keys(taxonomy.brands) 
    : Object.keys(INDIAN_CAR_BRANDS);
  const brandOptions = Array.from(new Set([carBrand, ...allBrands])).filter(Boolean);

  const fallbackModels = carBrand && (INDIAN_CAR_BRANDS as any)[carBrand] ? (INDIAN_CAR_BRANDS as any)[carBrand] : [];
  const dynamicModels = carBrand && taxonomy.brands ? taxonomy.brands[carBrand] || [] : [];
  const allModels = dynamicModels.length > 0 ? dynamicModels : fallbackModels;
  const modelOptions = Array.from(new Set([carModel, ...allModels])).filter(Boolean);

  const dynamicVariants = carModel 
    ? (taxonomy.variants?.[carModel] || taxonomy.variants?.[`${carBrand}_${carModel}`] || []) 
    : [];
  const fallbackVariants = (carModel && (DEFAULT_MODEL_VARIANTS as any)[carModel]) ? (DEFAULT_MODEL_VARIANTS as any)[carModel] : ["Base", "Mid", "Top Spec", "VXi", "ZXi", "SX", "Alpha", "GT", "LXi"];
  const allVariants = dynamicVariants.length > 0 ? dynamicVariants : fallbackVariants;
  const variantOptions = Array.from(new Set([carVariant, ...allVariants])).filter(Boolean);

  const dynamicCategories = taxonomy.categories || [];
  const allCategories = dynamicCategories.length > 0 ? dynamicCategories : CAR_PART_CATEGORIES;
  const categoryOptions = Array.from(new Set([category, ...allCategories])).filter(Boolean);

  const dynamicParts = category && taxonomy.subcategories ? taxonomy.subcategories[category] || [] : [];
  const fallbackParts = category && (CAR_SPARE_PARTS_BY_CATEGORY as any)[category] ? (CAR_SPARE_PARTS_BY_CATEGORY as any)[category] : [];
  const allParts = dynamicParts.length > 0 ? dynamicParts : fallbackParts;
  const partNameOptions = Array.from(new Set([partName, ...allParts])).filter(Boolean);

  const dynamicStates = taxonomy.states || [];
  const fallbackStates = INDIAN_STATES_AND_DISTRICTS.map((s) => s.state);
  const allStates = dynamicStates.length > 0 ? dynamicStates : fallbackStates;
  const stateOptions = Array.from(new Set([selectedState, ...allStates])).filter(Boolean);

  const dynamicDistricts = selectedState && taxonomy.districts ? taxonomy.districts[selectedState] || [] : [];
  const fallbackDistricts = selectedState ? (INDIAN_STATES_AND_DISTRICTS.find((s) => s.state === selectedState)?.districts || []) : [];
  const allDistricts = dynamicDistricts.length > 0 ? dynamicDistricts : fallbackDistricts;
  const districtOptions = Array.from(new Set([selectedDistrict, ...allDistricts])).filter(Boolean);

  const formatIndianCurrency = (val: string | number | undefined | null) => {
    if (val === undefined || val === null || val === "") return "";
    const clean = String(val).replace(/[^0-9]/g, "");
    if (!clean) return "";
    const num = parseInt(clean, 10);
    if (isNaN(num)) return "";
    return num.toLocaleString("en-IN");
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const rawDigits = raw.replace(/[^0-9]/g, "");
    setPrice(rawDigits);
  };

  const handleBrandChange = (brand: string) => {
    setCarBrand(brand);
    setCarModel("");
    setCarVariant("");
  };

  const handleModelChange = (model: string) => {
    setCarModel(model);
    setCarVariant("");
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPartName("");
  };

  const handlePhotoPickerClick = async (e: React.MouseEvent) => {
    const res = await requestCameraPermissionJIT();
    if (!res.granted) {
      e.preventDefault();
      setError(res.message || "Camera & Photos permission is needed to attach spare part images.");
    }
  };

  const handleImageFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 6 || uploadedImages.length + files.length > 6) {
      setError("Maximum 6 images allowed.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const uploadedUrls: string[] = [];
    const initialCount = uploadedImages.length;
    const totalFiles = files.length;

    try {
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const currentProgressNum = initialCount + i + 1;
        setUploadProgress(`Uploading: ${currentProgressNum}/6`);

        // Client-side compression to max 800px width/height and < 300KB
        const base64Data = await compressImageFile(file, 800, 800, 0.8, 300 * 1024);
        try {
          const cloudinaryUrl = await uploadProductImage(base64Data);
          uploadedUrls.push(cloudinaryUrl || base64Data);
        } catch (uploadErr) {
          console.warn("Cloudinary upload failed/timeout; using compressed image fallback:", uploadErr);
          uploadedUrls.push(base64Data);
        }
      }
      setUploadedImages(prev => [...prev, ...uploadedUrls]);
    } catch (err: any) {
      setError(err.message || "Failed to process one or more images. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleAddDirectUrl = () => {
    const url = directImageUrlInput.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:image/")) {
      setError("Please enter a valid image URL (e.g. https://... or data:image/...)");
      return;
    }
    if (uploadedImages.length >= 6) {
      setError("Maximum 6 images allowed.");
      return;
    }
    setError(null);
    setUploadedImages(prev => [...prev, url]);
    setDirectImageUrlInput("");
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    // Validation - only block if mandatory fields are cleared
    if (!title.trim() || !price || !carBrand || !carModel || !category || !partName || !selectedState || !selectedDistrict || !contactName.trim() || !contactPhone.trim()) {
      setError("Please fill in all mandatory details (Title, Brand, Model, Category, Price, and Contact Info).");
      return;
    }

    const cleanPriceDigits = String(price).replace(/[^0-9.]/g, "");
    const priceNum = parseFloat(cleanPriceDigits);
    if (!cleanPriceDigits || isNaN(priceNum) || priceNum <= 0) {
      setError("Please specify a valid positive price in ₹.");
      return;
    }

    if (uploadedImages.length === 0) {
      setError("Please upload at least one photo of the spare part.");
      return;
    }

    setIsSaving(true);

    try {
      let finalLat = lat;
      let finalLng = lng;
      // Only re-calculate if both are missing or zero
      if ((finalLat === undefined || finalLat === 0) && (finalLng === undefined || finalLng === 0)) {
        const approx = getApproxCoordinates(selectedState, selectedDistrict);
        finalLat = approx.lat;
        finalLng = approx.lng;
      }

      const primaryImage = uploadedImages[0] || "";
      const readableLoc = selectedArea.trim()
        ? `${selectedArea.trim()}, ${selectedDistrict}`
        : `${selectedDistrict}, ${selectedState}`;

      const updates: Partial<SparePart> = {
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        carBrand: carBrand.trim(),
        carModel: carModel.trim(),
        carVariant: carVariant ? carVariant.trim() : "",
        category: category.trim(),
        partName: partName.trim(),
        condition,
        location: readableLoc,
        state: selectedState,
        district: selectedDistrict,
        area: selectedArea.trim() || undefined,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        imageUrl: primaryImage,
        imageUrls: uploadedImages || [],
        images: uploadedImages || [] // Sync with legacy field
      };

      if (typeof finalLat === "number") updates.lat = finalLat;
      if (typeof finalLng === "number") updates.lng = finalLng;

      await onSave(part.id, updates);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmPermanentDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      if (onDelete) {
        await onDelete(part.id);
      } else {
        await deleteSparePartListing(part.id);
      }
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete listing.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" id="edit-listing-modal-overlay" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-100" id="edit-listing-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex flex-row items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight text-white">Edit Advertisement</h2>
            <p className="text-[10px] text-slate-400">Update your spare part details</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
            id="close-edit-modal-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 p-4 space-y-4 overflow-y-auto" id="edit-listing-form">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs text-rose-600 flex flex-row items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              <span className="text-xs text-rose-600 font-medium flex-1">{error}</span>
            </div>
          )}

          {/* Product photos section */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
            <div className="flex flex-row justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Product Photos (Max 6)
              </span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {uploadedImages.length}/6
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1.5">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative aspect-square bg-slate-200 rounded-xl overflow-hidden shadow-sm border border-slate-100">
                  <img src={img} alt="Product" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-slate-950/70 text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                    title="Remove Photo"
                  >
                    <X size={10} />
                  </button>
                  {idx === 0 && (
                    <div className="absolute bottom-0 inset-x-0 bg-indigo-600 text-white text-[8px] font-black tracking-widest text-center py-0.5 uppercase">
                      Primary
                    </div>
                  )}
                </div>
              ))}

              {uploadedImages.length < 6 && (
                <label 
                  onClick={handlePhotoPickerClick}
                  className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  isUploading 
                    ? "border-slate-300 bg-slate-100/50 cursor-not-allowed" 
                    : "border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/10"
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageFilesChange}
                    disabled={isUploading}
                    className="hidden"
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[8px] text-slate-500 font-extrabold uppercase mt-1">{uploadProgress || "Uploading"}</span>
                    </div>
                  ) : (
                    <>
                      <Camera size={18} className="text-slate-400" />
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Add Photo</span>
                    </>
                  )}
                </label>
              )}
            </div>

            {/* Direct Image URL Option / Fallback */}
            <div className="pt-2 border-t border-slate-200/70">
              <button
                type="button"
                onClick={() => setShowUrlInput(prev => !prev)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
                id="btn-edit-toggle-url"
              >
                <span>{showUrlInput ? "− Hide Image URL Input" : "+ Or Add Image by Direct URL"}</span>
              </button>

              {showUrlInput && (
                <div className="mt-2 flex gap-2 items-center">
                  <input
                    type="url"
                    value={directImageUrlInput}
                    onChange={(e) => setDirectImageUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDirectUrl();
                      }
                    }}
                    placeholder="https://example.com/part-photo.jpg"
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddDirectUrl}
                    disabled={!directImageUrlInput.trim() || uploadedImages.length >= 6}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs transition-all"
                  >
                    Add URL
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ad Title */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">ADVERTISEMENT TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Maruti Suzuki Swift Headlight Right Side"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Brand, Model & Variant */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block">CAR BRAND</label>
              <div className="relative">
                <Layers size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                <select
                  value={carBrand}
                  onChange={(e) => handleBrandChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                  required
                >
                  <option value="">Choose Brand</option>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block">CAR MODEL</label>
              <div className="relative">
                <Layers size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                <select
                  value={carModel}
                  disabled={!carBrand}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                  required
                >
                  <option value="">Choose Model</option>
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block">VARIANT</label>
              <div className="relative">
                <Layers size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                <select
                  value={carVariant}
                  disabled={!carModel}
                  onChange={(e) => setCarVariant(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-1 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                >
                  <option value="">Variant</option>
                  {variantOptions.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Category & Specific Part */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block">PART CATEGORY</label>
              <div className="relative">
                <Compass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                  required
                >
                  <option value="">{t("selectCategory")}</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>{translateDynamic(cat, language)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block">SPECIFIC SPARE PART</label>
              <div className="relative">
                <Compass size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                <select
                  value={partName}
                  disabled={!category}
                  onChange={(e) => setPartName(e.target.value)}
                  className="w-full bg-slate-50 disabled:opacity-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                  required
                >
                  <option value="">Select Specific Part</option>
                  {partNameOptions.map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Condition */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">PART CONDITION</label>
            <div className="grid grid-cols-2 gap-2">
              {(["Brand New", "Like New", "Used (Good)", "For Scrap/Spares"] as const).map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setCondition(opt)}
                  className={`py-2 px-1 rounded-xl border flex flex-row items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    condition === opt
                      ? "bg-indigo-50 border-indigo-500 text-indigo-600 font-extrabold"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {condition === opt && <Check size={11} className="text-indigo-600 shrink-0" />}
                  <span className={`text-[11px] font-bold ${condition === opt ? "text-indigo-600 font-extrabold" : "text-slate-500"}`}>
                    {opt}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Price & State & District */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 block">PRICE (₹ INR)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-700 text-xs font-black font-mono z-10 pointer-events-none">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={price ? formatIndianCurrency(price) : ""}
                  onChange={handlePriceChange}
                  placeholder="e.g. 4,500"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-8 pr-4 text-xs font-bold text-slate-700 font-mono focus:outline-none focus:border-indigo-500"
                  id="edit-listing-price"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">STATE</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                  <select
                    value={selectedState}
                    onChange={(e) => {
                      setSelectedState(e.target.value);
                      setSelectedDistrict("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                    required
                  >
                    <option value="">Choose State</option>
                    {stateOptions.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">DISTRICT / CITY</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                  <select
                    value={selectedDistrict}
                    disabled={!selectedState}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-slate-50 disabled:opacity-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none font-bold"
                    required
                  >
                    <option value="">Choose District</option>
                    {districtOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">SUB-AREA / TOWN</label>
                <input
                  type="text"
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  placeholder="e.g. Pallapatti, Town Hall"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-700 font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Interactive Leaflet Map Picker */}
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 block">MAP PIN (DRAG OR TAP TO ADJUST)</label>
                <button
                  type="button"
                  onClick={() => setShowMapModal(true)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
                >
                  Fullscreen
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-2xs relative">
                <GMap
                  lat={lat}
                  lng={lng}
                  state={selectedState}
                  district={selectedDistrict}
                  interactive={true}
                  showDetectBtn={true}
                  onLocationSelect={async (newLat, newLng) => {
                    setLat(newLat);
                    setLng(newLng);
                    try {
                      const geocoded = await reverseGeocodeLatLng(newLat, newLng, INDIAN_STATES_AND_DISTRICTS);
                      if (geocoded.state && !selectedState) setSelectedState(geocoded.state);
                      if (geocoded.district && !selectedDistrict) setSelectedDistrict(geocoded.district);
                      if (geocoded.area && !selectedArea) setSelectedArea(geocoded.area);
                    } catch (e) {
                      // ignore
                    }
                  }}
                  height="200px"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block">AD DESCRIPTION</label>
            <div className="relative">
              <FileText size={15} className="absolute left-3 top-3 text-slate-400 z-10 pointer-events-none" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specify details..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Seller Contact Info
            </span>

            <div className="grid grid-cols-1 gap-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">NAME</label>
                <div className="relative">
                  <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Seller contact name"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 block">CONTACT PHONE</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 XXXXX"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-row gap-2.5 pt-2 shrink-0">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving || isUploading || isDeleting}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-extrabold px-3 py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex flex-row items-center gap-1.5 shrink-0 disabled:opacity-50"
              title="Delete Listing"
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline">{isDeleting ? "Deleting..." : "Delete Ad"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSaving || isUploading || isDeleting}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-2xl text-xs uppercase tracking-wider shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" id="delete-confirmation-modal">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 size={24} />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-slate-900 text-base">Delete Listing?</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Are you sure you want to permanently delete <span className="font-bold text-slate-700">"{title || part.title}"</span>? This will remove all photos and details from Firestore and Cloudinary. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPermanentDelete}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-extrabold text-white shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMapModal && (
        <MapLocationModal
          initialLat={lat}
          initialLng={lng}
          state={selectedState}
          district={selectedDistrict}
          onConfirm={async (selectedLat, selectedLng) => {
            setLat(selectedLat);
            setLng(selectedLng);
            try {
              const geocoded = await reverseGeocodeLatLng(selectedLat, selectedLng, INDIAN_STATES_AND_DISTRICTS);
              if (geocoded.state && !selectedState) setSelectedState(geocoded.state);
              if (geocoded.district && !selectedDistrict) setSelectedDistrict(geocoded.district);
              if (geocoded.area && !selectedArea) setSelectedArea(geocoded.area);
            } catch (e) {
              // ignore
            }
          }}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
}
