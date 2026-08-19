import React, { useState, useEffect } from "react";
import { 
  X, MessageSquare, ShieldCheck, Calendar, 
  MapPin, Package, Image as ImageIcon, ArrowLeft,
  UserPlus, UserCheck, Users, Sparkles
} from "lucide-react";
import { User, SparePart } from "../types";
import { 
  fetchUserProfile, 
  followUser, 
  unfollowUser, 
  checkIsFollowing, 
  fetchUserFollowCounts 
} from "../lib/firebase";
import UserAvatar from "./UserAvatar";

interface SellerProfileViewProps {
  key?: string;
  sellerId: string;
  sellerName: string;
  currentUser: User | null;
  onClose: () => void;
  onStartChat?: (part: SparePart) => void;
  allParts: SparePart[];
  onSelectPart?: (part: SparePart) => void;
  onOpenUserProfile?: (userId: string, userName: string) => void;
}

export default function SellerProfileView({
  sellerId,
  sellerName,
  currentUser,
  onClose,
  onStartChat,
  allParts,
  onSelectPart,
  onOpenUserProfile
}: SellerProfileViewProps) {
  const [sellerProfile, setSellerProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Statistics & Filtering
  const sellerParts = allParts.filter(p => (p.sellerId === sellerId || p.ownerId === sellerId));
  const activeAds = sellerParts.filter(p => !p.sold && p.status !== "sold" && !(p as any).isDeleted);
  const displayName = sellerProfile?.name || sellerProfile?.displayName || sellerName || "Seller";
  const displayPhoto = sellerProfile?.photoURL || sellerProfile?.profilePhoto || "";
  const refPart = activeAds[0] || sellerParts[0];

  useEffect(() => {
    let isMounted = true;
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const [profileData, followCounts, followingStatus] = await Promise.all([
          fetchUserProfile(sellerId),
          fetchUserFollowCounts(sellerId),
          currentUser?.id ? checkIsFollowing(currentUser.id, sellerId) : Promise.resolve(false)
        ]);

        if (isMounted) {
          setSellerProfile(profileData || null);
          setFollowersCount(followCounts.followersCount || 0);
          setFollowingCount(followCounts.followingCount || 0);
          setIsFollowing(followingStatus);
        }
      } catch (err) {
        console.error("Failed to load user profile data:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfileData();

    const handleFollowsUpdated = async () => {
      try {
        const [followCounts, followingStatus] = await Promise.all([
          fetchUserFollowCounts(sellerId),
          currentUser?.id ? checkIsFollowing(currentUser.id, sellerId) : Promise.resolve(false)
        ]);
        if (isMounted) {
          setFollowersCount(followCounts.followersCount || 0);
          setFollowingCount(followCounts.followingCount || 0);
          setIsFollowing(followingStatus);
        }
      } catch (err) {
        console.warn("Failed to reload follow data:", err);
      }
    };

    window.addEventListener("autoparts_follows_updated", handleFollowsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("autoparts_follows_updated", handleFollowsUpdated);
    };
  }, [sellerId, currentUser?.id]);

  const handleToggleFollow = async () => {
    if (!currentUser?.id) {
      alert("Please log in to follow sellers and stay updated on their latest parts.");
      return;
    }
    if (currentUser.id === sellerId) {
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(currentUser.id, sellerId);
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        await followUser(currentUser.id, sellerId, currentUser.name || currentUser.displayName || "Buyer");
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (err) {
      console.error("Error toggling follow status:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const getJoinedDate = () => {
    const ts = sellerProfile?.createdAt || (sellerParts.length > 0 ? sellerParts[sellerParts.length - 1].createdAt : null);
    if (ts) {
      try {
        const date = new Date(ts);
        return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      } catch (e) {
        return "2026";
      }
    }
    return "2026";
  };

  const handlePartClick = (part: SparePart) => {
    if (onSelectPart) {
      onSelectPart(part);
      onClose();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  const isOwnProfile = currentUser?.id === sellerId;

  return (
    <div className="fixed inset-0 bg-slate-100/90 backdrop-blur-xs flex flex-col z-45 animate-fade-in" id="public-user-profile-view-root">
      {/* Top Compact Navigation Bar */}
      <div className="bg-[#0B1220] text-white py-2.5 px-3.5 flex items-center justify-between shadow-sm sticky top-0 z-20 border-b border-[#18233C]">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
            id="close-public-profile-btn"
            title="Back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xs font-black text-white truncate max-w-[220px]">{displayName}</h2>
            <span className="text-[9px] font-bold text-slate-400 block -mt-0.5">Auto Parts Member</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors cursor-pointer"
          title="Close"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 pb-20 overflow-y-auto max-w-xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-2.5">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Loading Profile...</span>
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-3">
            
            {/* 1. Compact Social Header Card */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-3.5">
                {/* Max 64px compact avatar */}
                <div className="shrink-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shadow-xs relative">
                    <UserAvatar
                      userId={sellerId}
                      name={displayName}
                      photoURL={displayPhoto}
                      size="lg"
                      showVerifiedBadge={false}
                    />
                  </div>
                </div>

                {/* Single Streamlined Column Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900 truncate tracking-tight">{displayName}</h3>
                    <span title="Verified Member" className="inline-flex shrink-0">
                      <ShieldCheck size={15} className="text-blue-600 fill-blue-50" />
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-[11px] text-slate-500 font-medium mt-1 flex-wrap">
                    {(sellerProfile?.district || sellerProfile?.state || refPart?.district || refPart?.state) && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <MapPin size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[130px]">
                          {sellerProfile?.district || refPart?.district || ""}{sellerProfile?.state || refPart?.state ? `, ${sellerProfile?.state || refPart?.state}` : ""}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-slate-500">
                      <Calendar size={11} className="text-slate-400 shrink-0" />
                      <span>Joined {getJoinedDate()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Social Media Metrics: Followers, Following, Active Listings in 1 unified bar */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/80 rounded-lg p-2 mt-3 border border-slate-100">
                <div className="text-center px-1">
                  <span className="text-xs sm:text-sm font-black text-slate-900 block leading-tight">{followersCount}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Followers</span>
                </div>
                <div className="text-center px-1">
                  <span className="text-xs sm:text-sm font-black text-slate-900 block leading-tight">{followingCount}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Following</span>
                </div>
                <div className="text-center px-1">
                  <span className="text-xs sm:text-sm font-black text-blue-600 block leading-tight">{activeAds.length}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Active Listings</span>
                </div>
              </div>

              {/* 3. Compact 2-Column Action Buttons Row */}
              {!isOwnProfile && (
                <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100">
                  {/* Follow / Following Button */}
                  <button
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                      isFollowing
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 active:scale-[0.98]"
                        : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white"
                    }`}
                    id="public-profile-follow-btn"
                  >
                    {followLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isFollowing ? (
                      <>
                        <UserCheck size={14} className="text-slate-700" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} className="text-white" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>

                  {/* Chat Action Button */}
                  {onStartChat && refPart ? (
                    <button
                      onClick={() => {
                        onStartChat(refPart);
                        onClose();
                      }}
                      className="w-full bg-[#0B1220] hover:bg-slate-900 active:scale-[0.98] text-white font-black py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      id="public-profile-chat-btn"
                    >
                      <MessageSquare size={14} className="text-blue-400" />
                      <span className="truncate">Chat</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-slate-100 text-slate-400 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <MessageSquare size={14} className="text-slate-400" />
                      <span>Chat</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 4. Clean Active Listings Feed directly under action bar without extra clutter */}
            <div className="space-y-2 pt-0.5">
              <div className="flex items-center justify-between px-0.5">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={13} className="text-blue-600" />
                  Active Listings ({activeAds.length})
                </h4>
              </div>

              {activeAds.length === 0 ? (
                <div className="bg-white p-6 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center space-y-1.5 shadow-xs">
                  <Package size={24} className="text-slate-300" />
                  <p className="text-xs text-slate-600 font-bold">No active spare parts listed right now.</p>
                  <p className="text-[10px] text-slate-400">Follow this seller to get notified when new parts arrive.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {activeAds.map((part) => (
                    <div
                      key={part.id}
                      onClick={() => handlePartClick(part)}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col relative cursor-pointer hover:border-blue-500 hover:shadow-sm transition-all group"
                      id={`public-part-card-${part.id}`}
                    >
                      {/* Image Box - 1:1 Square */}
                      <div className="w-full aspect-square bg-slate-900 relative overflow-hidden rounded-t-xl">
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
                              const skeleton = (e.target as HTMLImageElement).parentElement?.querySelector('.animate-pulse');
                              if (skeleton) skeleton.classList.add('hidden');
                            }}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-200 relative z-1"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-blue-400 p-2 relative z-1">
                            <ImageIcon size={18} className="text-blue-400" />
                            <span className="text-[8px] font-bold uppercase text-center text-blue-300 block truncate w-full mt-1">
                              {part.partName || part.category}
                            </span>
                          </div>
                        )}
                        {part.condition && (
                          <span className="absolute top-1.5 left-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase z-10">
                            {part.condition}
                          </span>
                        )}
                      </div>

                      <div className="p-2 flex-1 flex flex-col justify-between space-y-1 bg-white">
                        <div>
                          <h5 className="text-[11px] font-extrabold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                            {part.title}
                          </h5>
                          <span className="text-[9px] text-slate-500 font-semibold block truncate mt-0.5">
                            {part.carBrand} • {part.carModel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-xs font-black text-blue-700">
                            {formatPrice(part.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
