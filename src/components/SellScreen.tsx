import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  Tag, 
  MapPin, 
  User as UserIcon, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle,
  Car,
  UploadCloud,
  X,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Loader2,
  Star
} from "lucide-react";
import { User, SparePart } from "../types";
import { createSparePartListing, uploadProductImage, subscribeToTaxonomyConfig } from "../lib/firebase";
import { INDIAN_STATES_AND_DISTRICTS } from "../data/indianLocations";
import MapLocationModal from "./MapLocationModal";
import GMap from "./GMap";
import { getApproxCoordinates, detectUserLocationWithReverseGeocode, reverseGeocodeLatLng } from "../utils/locationHelper";
import { useLanguage } from "../lib/LanguageContext";
import { translateDynamic } from "../lib/translations";
import BrandLogo from "./BrandLogo";
import { requestCameraPermissionJIT } from "../utils/permissionUtils";
import { compressImageFile } from "../utils/imageCompressor";

interface SellScreenProps {
  currentUser: User;
  onPublishSuccess: (newPart: SparePart) => void;
  parts: SparePart[];
}

export default function SellScreen({ currentUser, onPublishSuccess, parts }: SellScreenProps) {
  const { t, language } = useLanguage();

  // Form Field State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(""); // Stores numeric string e.g. "2500"
  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carVariant, setCarVariant] = useState("");
  const [category, setCategory] = useState("");
  const [partName, setPartName] = useState("");
  const [condition, setCondition] = useState<"Brand New" | "Like New" | "Used (Good)" | "For Scrap/Spares">("Brand New");
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [contactName, setContactName] = useState(currentUser.name || "");
  const [contactPhone, setContactPhone] = useState(currentUser.phone || "");

  useEffect(() => {
    if (currentUser.name) {
      setContactName(currentUser.name);
    }
    if (currentUser.phone) {
      setContactPhone(currentUser.phone);
    }
  }, [currentUser.name, currentUser.phone]);

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [directImageUrlInput, setDirectImageUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const [submittedAttempt, setSubmittedAttempt] = useState(false);
  const [isTaxonomyLoading, setIsTaxonomyLoading] = useState(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);

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

  useEffect(() => {
    setIsTaxonomyLoading(true);
    const unsub = subscribeToTaxonomyConfig((full) => {
      setTaxonomy({
        categories: full.categories || [],
        brands: full.brands || {},
        subcategories: full.subcategories || {},
        variants: full.variants || {},
        states: full.states || [],
        districts: full.districts || {}
      });
      setIsTaxonomyLoading(false);
    });
    return () => unsub();
  }, []);
  
  // Coordinates State
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [showMapModal, setShowMapModal] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic dropdown options derived from taxonomy state
  const availableModels = carBrand ? taxonomy.brands[carBrand] || [] : [];
  const availableVariants = carModel ? (taxonomy.variants[carModel] || taxonomy.variants[`${carBrand}_${carModel}`] || ["Base", "Mid", "Top Spec", "VXi", "ZXi", "SX", "Alpha", "GT", "LXi"]) : [];
  const availablePartNames = category ? taxonomy.subcategories[category] || [] : [];
  const availableDistricts = selectedState ? taxonomy.districts[selectedState] || [] : [];

  // Helper to format currency in Indian numbering format (e.g., 2500 -> 2,500 ; 857895 -> 8,57,895)
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
    // Strip out currency symbols (₹, Rs, etc.), commas, dots, spaces, letters
    const rawDigits = raw.replace(/[^0-9]/g, "");
    setPrice(rawDigits);
  };

  const updateAutoTitle = (brand: string, model: string, variant: string, part: string) => {
    const partsList = [brand, model, variant, part].filter(Boolean);
    if (partsList.length >= 2) {
      setTitle(partsList.join(" "));
    }
  };

  const handleBrandChange = (brand: string) => {
    setCarBrand(brand);
    setCarModel("");
    setCarVariant("");
    updateAutoTitle(brand, "", "", partName);
  };

  const handleModelChange = (model: string) => {
    setCarModel(model);
    setCarVariant("");
    updateAutoTitle(carBrand, model, "", partName);
  };

  const handleVariantChange = (v: string) => {
    setCarVariant(v);
    updateAutoTitle(carBrand, carModel, v, partName);
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setPartName("");
    updateAutoTitle(carBrand, carModel, carVariant, "");
  };

  const handlePartNameChange = (part: string) => {
    setPartName(part);
    updateAutoTitle(carBrand, carModel, carVariant, part);
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
      setError("Maximum 6 images allowed per listing.");
      return;
    }

    setError(null);
    const newBase64s: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Compress client-side to max 800px width/height and strictly under 300KB
        const compressedBase64 = await compressImageFile(file, 800, 800, 0.8, 300 * 1024);
        newBase64s.push(compressedBase64);
      }
      setUploadedImages(prev => [...prev, ...newBase64s]);
    } catch (err: any) {
      setError(err.message || "Failed to process image files.");
    }
    // reset input
    e.target.value = "";
  };

  const handleAddDirectUrl = () => {
    const url = directImageUrlInput.trim();
    if (!url) return;
    if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:image/")) {
      setError("Please enter a valid image URL (e.g. https://... or data:image/...)");
      return;
    }
    if (uploadedImages.length >= 6) {
      setError("Maximum 6 images allowed per listing.");
      return;
    }
    setError(null);
    setUploadedImages(prev => [...prev, url]);
    setDirectImageUrlInput("");
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleMoveImage = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= uploadedImages.length) return;
    setUploadedImages(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleSetCoverPhoto = (index: number) => {
    if (index === 0) return;
    setUploadedImages(prev => {
      const copy = [...prev];
      const target = copy.splice(index, 1)[0];
      return [target, ...copy];
    });
  };

  // Smart Gemini AI Auto-Fill Handler
  const handleAutoFillAI = async () => {
    setIsAutoFilling(true);
    setError(null);
    setAiSuccessMessage(null);
    try {
      const primaryImg = uploadedImages.length > 0 ? uploadedImages[0] : null;
      const response = await fetch("/api/ai/autofill-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: primaryImg,
          currentBrand: carBrand,
          currentModel: carModel,
          currentCategory: category,
          currentPartName: partName
        })
      });
      const result = await response.json();
      if (result.success && result.data) {
        const d = result.data;
        if (d.title) setTitle(d.title);
        if (d.carBrand && !carBrand) setCarBrand(d.carBrand);
        if (d.carModel && !carModel) setCarModel(d.carModel);
        if (d.category && !category) setCategory(d.category);
        if (d.partName && !partName) setPartName(d.partName);
        if (d.condition) setCondition(d.condition as any);
        if (d.suggestedPrice && !price) setPrice(String(d.suggestedPrice));
        if (d.description) setDescription(d.description);

        setAiSuccessMessage("✨ AI analyzed the part and auto-filled details successfully!");
        setTimeout(() => setAiSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      console.warn("AI Auto-fill error:", err);
      setError("Could not complete AI auto-fill. You can still enter details manually.");
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    setError(null);
    try {
      const loc = await detectUserLocationWithReverseGeocode(INDIAN_STATES_AND_DISTRICTS);
      setSelectedState(loc.state);
      setSelectedDistrict(loc.district);
      if (loc.area) {
        setSelectedArea(loc.area);
      }
      setLat(loc.lat);
      setLng(loc.lng);
    } catch (err: any) {
      setError("Could not auto-detect location. Please select State and District manually.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const isSubmittingRef = useRef(false);

  const handlePublish = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmittedAttempt(true);
    setError(null);

    // Validation
    if (uploadedImages.length === 0) {
      setError("Please upload at least 1 photo of the spare part.");
      return;
    }
    if (!carBrand || !carModel || !category || !partName) {
      setError("Please select all vehicle and part fitment options.");
      return;
    }
    if (!title.trim()) {
      setError("Please provide an Ad Title.");
      return;
    }
    const cleanPriceDigits = String(price).replace(/[^0-9.]/g, "");
    const priceNum = parseFloat(cleanPriceDigits);
    if (!cleanPriceDigits || isNaN(priceNum) || priceNum <= 0) {
      setError("Please specify a valid Price in ₹.");
      return;
    }
    if (!description.trim()) {
      setError("Please provide a short Description.");
      return;
    }
    if (!selectedState || !selectedDistrict) {
      setError("Please select your State and District / City.");
      return;
    }
    if (!contactName.trim() || !contactPhone.trim() || contactPhone.trim().length < 8) {
      setError("Please enter a valid Seller Name and Phone Number.");
      return;
    }

    if (isSubmittingRef.current || isUploading) {
      return;
    }

    const isDuplicate = parts.some(
      p => p.sellerId === currentUser.id &&
           (p.title || "").trim().toLowerCase() === title.trim().toLowerCase() &&
           p.price === priceNum &&
           (p.description || "").trim().toLowerCase() === description.trim().toLowerCase()
    );
    if (isDuplicate) {
      setError("You have already published a duplicate listing with these details.");
      return;
    }

    isSubmittingRef.current = true;
    setIsUploading(true);
    setUploadProgress("Initiating photo upload...");

    try {
      const cloudinaryUrls: string[] = [];
      const totalImages = uploadedImages.length;
      for (let i = 0; i < totalImages; i++) {
        const img = uploadedImages[i];
        if (img.startsWith("data:image/")) {
          setUploadProgress(`Uploading photo ${i + 1} of ${totalImages}...`);
          try {
            const uploadedUrl = await uploadProductImage(img);
            cloudinaryUrls.push(uploadedUrl || img);
          } catch (uploadErr) {
            console.warn(`Photo ${i + 1} Cloudinary upload failed/timed out, using direct image fallback:`, uploadErr);
            cloudinaryUrls.push(img);
          }
        } else {
          // Direct image URL provided by user
          cloudinaryUrls.push(img);
        }
      }

      setUploadProgress("Saving ad details to marketplace...");
      
      let finalLat = lat;
      let finalLng = lng;
      if (finalLat === undefined || finalLng === undefined || finalLat === 0 || finalLng === 0) {
        const approx = getApproxCoordinates(selectedState, selectedDistrict);
        finalLat = approx.lat;
        finalLng = approx.lng;
      }

      const readableLoc = selectedArea.trim()
        ? `${selectedArea.trim()}, ${selectedDistrict}`
        : `${selectedDistrict}, ${selectedState}`;

      const savedPart = await createSparePartListing({
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        carBrand,
        carModel,
        carVariant: carVariant || undefined,
        category,
        partName,
        condition,
        location: readableLoc,
        state: selectedState,
        district: selectedDistrict,
        area: selectedArea.trim() || undefined,
        lat: finalLat,
        lng: finalLng,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        imageUrl: cloudinaryUrls[0],
        imageUrls: cloudinaryUrls,
        sellerId: currentUser.id,
        sellerEmail: currentUser.email,
        sellerPhoto: currentUser.photoURL || currentUser.profilePhoto || "",
        sellerName: currentUser.name || contactName.trim()
      });

      setUploadProgress(null);
      setShowSuccess(true);
      
      setTimeout(() => {
        onPublishSuccess(savedPart);
        resetForm();
      }, 1800);

    } catch (err: any) {
      setError(err.message || "Failed to publish listing. Please check internet connection.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      isSubmittingRef.current = false;
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setCarBrand("");
    setCarModel("");
    setCarVariant("");
    setCategory("");
    setPartName("");
    setCondition("Brand New");
    setSelectedState("");
    setSelectedDistrict("");
    setSelectedArea("");
    setContactName(currentUser.name || "");
    setContactPhone(currentUser.phone || "");
    setLat(undefined);
    setLng(undefined);
    setUploadedImages([]);
    setUploadProgress(null);
    setShowSuccess(false);
    setError(null);
    setSubmittedAttempt(false);
  };

  if (showSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center animate-fade-in" id="sell-success-container">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <CheckCircle2 size={38} className="animate-bounce" />
        </div>
        <h2 className="text-xl font-black tracking-tight text-white">✅ Ad posted successfully.</h2>
        <p className="text-xs text-slate-300 mt-2 max-w-xs leading-relaxed font-medium">
          Your spare part listing is now live across India! Buyers can contact you directly via phone or in-app chat.
        </p>
        <span className="text-[11px] text-[#60A5FA] mt-6 font-mono font-bold animate-pulse">Redirecting to marketplace...</span>
      </div>
    );
  }

  const userActiveAds = parts.filter(p => 
    p.sellerId === currentUser.id && 
    p.sold !== true && 
    (Date.now() - p.createdAt) <= 90 * 24 * 60 * 60 * 1000
  );
  const isLimitReached = userActiveAds.length >= 5;

  if (isLimitReached) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full overflow-hidden" id="sell-screen-container">
        <div className="bg-[#0F172A] text-white px-4 py-3 sticky top-0 z-10 shadow-xs border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" variant="icon" theme="dark" showTagline={false} />
            <div>
              <h2 className="text-sm font-black text-white">Sell Spare Part</h2>
              <p className="text-[9px] text-slate-400">Post ads across India</p>
            </div>
          </div>
          <Sparkles size={16} className="text-[#60A5FA]" />
        </div>

        <div className="p-4 flex-1 overflow-y-auto flex flex-col justify-center items-center text-center max-w-md mx-auto">
          <div className="w-12 h-12 bg-amber-50 text-amber-500 border border-amber-200 rounded-2xl flex items-center justify-center mb-3">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-base font-black text-slate-800">5 Active Ads Limit Reached</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            You currently have 5 active listings. Delete or mark an old ad as sold to post new parts.
          </p>
          <div className="mt-4 p-3.5 bg-white border border-slate-200 rounded-2xl w-full text-left shadow-xs">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Your Active Ads:</h4>
            <div className="space-y-2">
              {userActiveAds.map(ad => (
                <div key={ad.id} className="flex gap-2.5 items-center text-xs p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded bg-slate-200 overflow-hidden shrink-0">
                    {ad.imageUrl && <img src={ad.imageUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="font-bold text-slate-700 truncate flex-1">{ad.title}</span>
                  <span className="font-mono font-black text-slate-900">₹{ad.price.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const CONDITION_OPTIONS = [
    { id: "Brand New", label: "Brand New", icon: "✨" },
    { id: "Like New", label: "Like New", icon: "👍" },
    { id: "Used (Good)", label: "Used (Good)", icon: "🔧" },
    { id: "For Scrap/Spares", label: "For Scrap / Spares", icon: "♻" }
  ] as const;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 text-slate-900 h-full overflow-hidden" id="sell-screen-container">
      {/* Top App Header */}
      <div className="bg-[#0F172A] text-white px-4 py-2.5 shrink-0 shadow-xs border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandLogo size="sm" variant="icon" theme="dark" showTagline={false} />
          <div>
            <h2 className="text-sm font-black text-white tracking-tight">Post Your Ad</h2>
            <p className="text-[10px] text-slate-400 font-medium">Sell genuine spare parts fast</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isTaxonomyLoading && (
            <div className="flex items-center gap-1 text-[9px] text-slate-300 font-semibold bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              <Loader2 size={9} className="animate-spin text-slate-300" />
              <span>Syncing...</span>
            </div>
          )}
          <span className="text-[10px] font-mono font-black bg-slate-800 text-slate-200 px-2.5 py-0.5 rounded-full border border-slate-700">
            Free Listing
          </span>
        </div>
      </div>

      {/* Main Single-Page Scrollable Form */}
      <form noValidate onSubmit={handlePublish} className="flex-1 overflow-y-auto p-3.5 sm:p-5 pb-28 max-w-2xl mx-auto w-full space-y-4">
        {/* Error Notification */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 shadow-xs animate-shake">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
            <span className="font-semibold leading-normal">{error}</span>
          </div>
        )}

        {/* AI Success Notification */}
        {aiSuccessMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 shadow-xs animate-fade-in">
            <Sparkles size={16} className="text-emerald-600 shrink-0 animate-spin" />
            <span className="font-bold">{aiSuccessMessage}</span>
          </div>
        )}

        {/* 1. Photos Section */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Camera size={15} className="text-slate-900" />
                Upload Photos *
              </span>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">Upload clear photos of the spare part</p>
            </div>
            <span className="text-[10px] font-black font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
              {uploadedImages.length} / 6 Photos
            </span>
          </div>

          {/* Upload Progress Indicator */}
          {uploadProgress && (
            <div className="text-xs text-slate-900 font-bold bg-slate-100 p-2 rounded-xl border border-slate-300 flex items-center gap-2 animate-pulse">
              <Loader2 size={13} className="animate-spin text-slate-900" />
              <span>{uploadProgress}</span>
            </div>
          )}

          {/* Upload Box when empty */}
          {uploadedImages.length === 0 && (
            <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-all bg-slate-50/70 hover:bg-slate-50 flex flex-col items-center justify-center ${
              submittedAttempt && uploadedImages.length === 0 ? "border-rose-400 bg-rose-50/20" : "border-slate-300 hover:border-slate-900"
            }`}>
              <UploadCloud size={26} className="text-slate-700 mb-1" />
              <p className="text-xs font-black text-slate-900">Tap to select or take photos</p>
              <p className="text-[10px] text-slate-500 mt-0.5">JPG, PNG up to 6 photos. First photo is cover.</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageFilesChange}
                className="hidden"
                id="image-file-picker"
              />
              <label
                htmlFor="image-file-picker"
                onClick={handlePhotoPickerClick}
                className="mt-2.5 px-3.5 py-1.5 bg-white hover:bg-slate-900 hover:text-white text-slate-900 border-2 border-slate-900 rounded-xl text-xs font-bold cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                id="btn-upload-file"
              >
                <Camera size={13} />
                <span>Choose Photos</span>
              </label>
            </div>
          )}

          {/* Responsive 3-Column Preview Grid */}
          {uploadedImages.length > 0 && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, slotIndex) => {
                  const imgUrl = uploadedImages[slotIndex];
                  if (imgUrl) {
                    const isCover = slotIndex === 0;
                    return (
                      <div 
                        key={slotIndex} 
                        className={`aspect-square rounded-xl bg-slate-900 border overflow-hidden relative group shadow-xs ${
                          isCover ? "border-slate-900 ring-2 ring-slate-900/20" : "border-slate-200"
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Upload ${slotIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Cover Badge */}
                        {isCover && (
                          <div className="absolute top-1 left-1 bg-slate-900 text-white text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                            <Star size={8} className="fill-white" />
                            <span>Cover</span>
                          </div>
                        )}

                        {/* Top Right Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(slotIndex)}
                          className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-md transition-transform hover:scale-110 cursor-pointer"
                          title="Remove photo"
                          id={`remove-img-${slotIndex}`}
                        >
                          <X size={11} />
                        </button>

                        {/* Bottom Actions Overlay */}
                        <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 backdrop-blur-xs p-1 flex items-center justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {!isCover && (
                            <button
                              type="button"
                              onClick={() => handleSetCoverPhoto(slotIndex)}
                              className="text-[8px] font-bold text-slate-100 hover:text-white bg-slate-800 px-1 py-0.5 rounded cursor-pointer"
                              title="Make Cover"
                            >
                              Cover
                            </button>
                          )}
                          <div className="flex items-center gap-0.5 ml-auto">
                            {slotIndex > 0 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(slotIndex, "left")}
                                className="p-0.5 text-white hover:text-slate-300 cursor-pointer"
                                title="Move Left"
                              >
                                <ChevronLeft size={12} />
                              </button>
                            )}
                            {slotIndex < uploadedImages.length - 1 && (
                              <button
                                type="button"
                                onClick={() => handleMoveImage(slotIndex, "right")}
                                className="p-0.5 text-white hover:text-slate-300 cursor-pointer"
                                title="Move Right"
                              >
                                <ChevronRight size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Next Slot Picker
                  if (slotIndex === uploadedImages.length && uploadedImages.length < 6) {
                    return (
                      <div key={slotIndex} className="aspect-square">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageFilesChange}
                          className="hidden"
                          id={`add-more-slot-${slotIndex}`}
                        />
                        <label
                          htmlFor={`add-more-slot-${slotIndex}`}
                          onClick={handlePhotoPickerClick}
                          className="w-full h-full rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-900 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center text-slate-500 hover:text-slate-900 transition-all cursor-pointer p-1.5 text-center"
                        >
                          <Camera size={18} className="mb-0.5" />
                          <span className="text-[9.5px] font-black">+ Add</span>
                        </label>
                      </div>
                    );
                  }

                  return (
                    <div key={slotIndex} className="aspect-square rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center text-slate-300">
                      <span className="text-[9px] font-mono font-bold">{slotIndex + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direct Image URL Option / Fallback */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowUrlInput(prev => !prev)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
              id="btn-toggle-url-input"
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
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-900 font-medium"
                />
                <button
                  type="button"
                  onClick={handleAddDirectUrl}
                  disabled={!directImageUrlInput.trim() || uploadedImages.length >= 6}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs transition-all"
                >
                  Add URL
                </button>
              </div>
            )}
          </div>

          {/* Smart AI Auto-Fill Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleAutoFillAI}
              disabled={isAutoFilling}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer disabled:opacity-70"
              id="btn-ai-autofill"
            >
              {isAutoFilling ? (
                <>
                  <Loader2 size={15} className="animate-spin text-white" />
                  <span className="text-xs font-black">AI Analyzing Photo & Auto-Filling...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} className="text-amber-300 animate-pulse" />
                  <span className="text-xs font-black tracking-wide">✨ Auto-Fill Details with AI</span>
                </>
              )}
            </button>
            <p className="text-[9.5px] text-slate-400 text-center mt-1 font-medium">
              Automatically populates title, brand, model & specs to save you time
            </p>
          </div>
        </div>

        {/* 2. Vehicle & Category Fitment (Compact 2-Column Grid) */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Car size={15} className="text-slate-900" />
              Vehicle & Part Fitment *
            </span>
            {isTaxonomyLoading && (
              <Loader2 size={13} className="animate-spin text-slate-600" />
            )}
          </div>

          {/* 2-Column Row 1: Brand & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Brand */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Car Brand *</label>
              <select
                value={carBrand}
                onChange={(e) => handleBrandChange(e.target.value)}
                className={`w-full bg-slate-50 focus:bg-white border rounded-xl py-2 px-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer transition-all ${
                  submittedAttempt && !carBrand ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                }`}
                required
                id="listing-brand"
              >
                <option value="">Select Brand</option>
                {Object.keys(taxonomy.brands).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Car Model *</label>
              <select
                value={carModel}
                disabled={!carBrand}
                onChange={(e) => handleModelChange(e.target.value)}
                className={`w-full border rounded-xl py-2 px-2.5 text-xs font-bold transition-all ${
                  !carBrand 
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                    : submittedAttempt && !carModel
                    ? "border-rose-400 bg-rose-50/30 text-slate-900"
                    : "bg-slate-50 focus:bg-white border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer"
                }`}
                required
                id="listing-model"
              >
                <option value="">{carBrand ? "Select Model" : "Select Brand First"}</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2-Column Row 2: Variant & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Variant */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Variant (Optional)</label>
              <select
                value={carVariant}
                disabled={!carModel}
                onChange={(e) => handleVariantChange(e.target.value)}
                className={`w-full border rounded-xl py-2 px-2.5 text-xs font-bold transition-all ${
                  !carModel 
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                    : "bg-slate-50 focus:bg-white border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer"
                }`}
                id="listing-variant"
              >
                <option value="">{carModel ? "Select Variant" : "Select Model"}</option>
                {availableVariants.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Part Category *</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={`w-full bg-slate-50 focus:bg-white border rounded-xl py-2 px-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer transition-all ${
                  submittedAttempt && !category ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                }`}
                required
                id="listing-category"
              >
                <option value="">Select Category</option>
                {taxonomy.categories.map((cat) => (
                  <option key={cat} value={cat}>{translateDynamic(cat, language)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Specific Part Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-600 uppercase block">Specific Spare Part *</label>
            <select
              value={partName}
              disabled={!category}
              onChange={(e) => handlePartNameChange(e.target.value)}
              className={`w-full border rounded-xl py-2 px-2.5 text-xs font-bold transition-all ${
                !category 
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                  : submittedAttempt && !partName
                  ? "border-rose-400 bg-rose-50/30 text-slate-900"
                  : "bg-slate-50 focus:bg-white border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer"
              }`}
              required
              id="listing-part-name"
            >
              <option value="">{category ? "Select Specific Part" : "Select Category First"}</option>
              {availablePartNames.map((part) => (
                <option key={part} value={part}>{part}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Details & Price */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs space-y-3">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Tag size={15} className="text-slate-900" />
            Details, Condition & Price *
          </span>

          {/* Ad Title */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-600 uppercase block">Ad Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mahindra XUV700 Front Bumper Assembly"
              className={`w-full bg-slate-50 focus:bg-white border rounded-xl py-2 px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all ${
                submittedAttempt && !title.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
              }`}
              required
              id="listing-title"
            />
          </div>

          {/* Compact 2-Column: Price & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
            {/* Price */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Price (₹ INR) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 text-xs font-black font-mono">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={price ? formatIndianCurrency(price) : ""}
                  onChange={handlePriceChange}
                  placeholder="e.g. 2,500"
                  className={`w-full bg-slate-50 focus:bg-white border rounded-xl py-2 pl-7 pr-3 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 font-mono transition-all ${
                    submittedAttempt && (!price || parseFloat(String(price).replace(/[^0-9.]/g, "") || "0") <= 0) ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                  }`}
                  id="listing-price"
                />
              </div>
            </div>

            {/* Condition Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Condition *</label>
              <div className="grid grid-cols-2 gap-1.5">
                {CONDITION_OPTIONS.map((opt) => {
                  const isSelected = condition === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCondition(opt.id as any)}
                      className={`py-1.5 px-2 text-[11px] rounded-xl border flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs font-extrabold"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 font-bold"
                      }`}
                      id={`condition-opt-${opt.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    >
                      <span className="text-xs">{opt.icon}</span>
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Description *</label>
              <span className="text-[9px] font-mono font-bold text-slate-400">{description.length}/1000</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              placeholder="Original OEM part in great working condition. Perfect direct fit with all brackets intact."
              rows={3}
              className={`w-full bg-slate-50 focus:bg-white border rounded-xl py-2 px-3 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all ${
                submittedAttempt && !description.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
              }`}
              required
              id="listing-description"
            />
          </div>
        </div>

        {/* 4. Location Section with Interactive Map */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={15} className="text-slate-900" />
              Item Location *
            </span>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={isDetectingLocation}
              className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:border-slate-900 text-slate-800 hover:text-slate-900 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50 shadow-2xs"
              id="btn-use-current-location"
            >
              {isDetectingLocation ? (
                <Loader2 size={11} className="animate-spin text-slate-800" />
              ) : (
                <Navigation size={11} className="fill-slate-800 text-slate-800" />
              )}
              <span>{isDetectingLocation ? "Detecting..." : "Use GPS"}</span>
            </button>
          </div>

          {/* 2-Column: State & District */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">State *</label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedDistrict("");
                }}
                className={`w-full bg-slate-50 focus:bg-white border rounded-xl py-2 px-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer transition-all ${
                  submittedAttempt && !selectedState ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                }`}
                required
                id="listing-state"
              >
                <option value="">Select State</option>
                {INDIAN_STATES_AND_DISTRICTS.map((s) => (
                  <option key={s.state} value={s.state}>{s.state}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">District / City *</label>
              <select
                value={selectedDistrict}
                disabled={!selectedState}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className={`w-full border rounded-xl py-2 px-2.5 text-xs font-bold transition-all ${
                  !selectedState 
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" 
                    : submittedAttempt && !selectedDistrict
                    ? "border-rose-400 bg-rose-50/30 text-slate-900"
                    : "bg-slate-50 focus:bg-white border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 cursor-pointer"
                }`}
                required
                id="listing-district"
              >
                <option value="">{selectedState ? "Select District" : "Select State First"}</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub-Area / Town */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-600 uppercase block">
              Sub-Area / Town <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              placeholder="e.g. Pallapatti, Town Hall, Sector 18"
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all"
              id="listing-sub-area"
            />
          </div>

          {/* Interactive Map */}
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-600 uppercase block">
                Map Location (Tap or drag to adjust pin)
              </label>
              <button
                type="button"
                onClick={() => setShowMapModal(true)}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
              >
                Expand Map
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs relative">
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
                height="175px"
              />
            </div>
          </div>
        </div>

        {/* 5. Seller Contact */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs space-y-3">
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <UserIcon size={15} className="text-slate-900" />
            Seller Contact Information *
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Seller Name *</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className={`w-full bg-slate-50 focus:bg-white border rounded-xl py-2 px-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all ${
                  submittedAttempt && !contactName.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                }`}
                required
                id="listing-contact-name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block">Phone Number *</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className={`w-full bg-slate-50 focus:bg-white border rounded-xl py-2 px-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 font-mono transition-all ${
                  submittedAttempt && !contactPhone.trim() ? "border-rose-400 bg-rose-50/30" : "border-slate-200"
                }`}
                required
                id="listing-contact-phone"
              />
            </div>
          </div>
        </div>

        {/* In-Form Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isUploading}
            className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-black py-3.5 rounded-xl text-xs tracking-wider uppercase transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            id="listing-submit-btn"
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Posting Ad...</span>
              </>
            ) : (
              <>
                <span>🚀 POST YOUR AD NOW</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Map Picker Modal */}
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
