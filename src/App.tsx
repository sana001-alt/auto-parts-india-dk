import React, { useState, useEffect, useCallback } from "react";
import { 
  Home as HomeIcon, 
  PlusCircle, 
  Plus,
  User as UserIcon,
  Compass,
  Sparkles,
  Info,
  Calendar,
  X,
  Phone,
  MessageSquare,
  Car,
  MapPin,
  Maximize2,
  Star,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Share2,
  Heart,
  Image as ImageIcon,
  Tag,
  Layers,
  Package,
  Edit3,
  Trash2,
  CheckCircle2
} from "lucide-react";
import AuthScreen from "./components/AuthScreen";
import HomeScreen from "./components/HomeScreen";
import SellScreen from "./components/SellScreen";
import ProfileScreen from "./components/ProfileScreen";
import ChatsScreen from "./components/ChatsScreen";
import ChatRoomWindow from "./components/ChatRoomWindow";
import ImageGalleryModal from "./components/ImageGalleryModal";
import InAppNotification from "./components/InAppNotification";
import SellerProfileView from "./components/SellerProfileView";
import GMap from "./components/GMap";
import NotificationsScreen from "./components/NotificationsScreen";
import AdminDashboardScreen from "./components/AdminDashboardScreen";
import { User, SparePart, Chat, Message, AppVersionConfig, Announcement } from "./types";
import { fetchSpareParts, subscribeToAuth, getOrCreateChat, fetchUserChats, fetchSellerReviews, updateSparePartListing, updateUserProfile, subscribeToUserChats, subscribeToSpareParts, deleteSparePartListing, subscribeToUserNotifications, markChatNotificationsAsRead, subscribeToUserFavorites, addFavorite, removeFavorite, markMessagesAsDelivered, fetchAppVersionConfig, setUserPresence, subscribeToAnnouncements, registerFCMToken, setupFCMForegroundListener, saveFCMNotificationToFirestore, auth } from "./lib/firebase";
import { playNotificationSound, triggerVibration, showPushNotification, requestNotificationPermission } from "./utils/audioNotification";
import { CURRENT_APP_VERSION, evaluateUpdateStatus } from "./utils/versionUtils";
import { UpdateDialogModal } from "./components/UpdateDialogModal";
import { motion, AnimatePresence } from "motion/react";
import EditListingModal from "./components/EditListingModal";
import { useLanguage } from "./lib/LanguageContext";
import { translateDynamic } from "./lib/translations";
import BrandLogo from "./components/BrandLogo";
import UserAvatar from "./components/UserAvatar";
import SplashScreen from "./components/SplashScreen";

import SearchScreen from "./components/SearchScreen";
import PullToRefresh from "./components/PullToRefresh";
import { Search as SearchIcon } from "lucide-react";

export type NavScreen = 
  | { type: "tab"; tab: "home" | "search" | "sell" | "messages" | "profile" | "chats" | "chat" | "myads" | "account" }
  | { type: "chat_room"; chat: Chat }
  | { type: "part_detail"; part: SparePart }
  | { type: "admin_dashboard" }
  | { type: "notifications" };

export function screenToPath(screen: NavScreen): string {
  if (!screen) return "/";
  switch (screen.type) {
    case "tab":
      if (screen.tab === "home") return "/";
      if (screen.tab === "search") return "/search";
      if (screen.tab === "sell") return "/sell";
      if (screen.tab === "chat" || screen.tab === "messages" || screen.tab === "chats") return "/chat";
      if (screen.tab === "myads") return "/myads";
      if (screen.tab === "account" || screen.tab === "profile") return "/account";
      return `/${screen.tab}`;
    case "chat_room":
      return `/chat/${screen.chat.id}`;
    case "part_detail":
      return `/part/${screen.part.id}`;
    case "admin_dashboard":
      return "/admin";
    case "notifications":
      return "/notifications";
    default:
      return "/";
  }
}

function parseInitialScreenFromUrl(): NavScreen[] {
  try {
    const pathname = window.location.pathname;
    const search = new URLSearchParams(window.location.search);
    const partQuery = search.get("part");

    if (partQuery) {
      return [
        { type: "tab", tab: "home" },
        { 
          type: "part_detail", 
          part: { id: partQuery, title: "Loading...", price: 0, category: "", carBrand: "", carModel: "", description: "", condition: "Used (Good)", location: "", imageUrl: "", sellerId: "", sellerEmail: "", contactName: "", contactPhone: "", state: "", district: "", status: "approved", createdAt: Date.now() } 
        }
      ];
    }

    if (pathname.startsWith("/part/")) {
      const partId = pathname.substring("/part/".length).trim();
      if (partId) {
        return [
          { type: "tab", tab: "home" },
          { 
            type: "part_detail", 
            part: { id: partId, title: "Loading...", price: 0, category: "", carBrand: "", carModel: "", description: "", condition: "Used (Good)", location: "", imageUrl: "", sellerId: "", sellerEmail: "", contactName: "", contactPhone: "", state: "", district: "", status: "approved", createdAt: Date.now() } 
          }
        ];
      }
    }

    if (pathname.startsWith("/chat/")) {
      const chatId = pathname.substring("/chat/".length).trim();
      if (chatId) {
        return [
          { type: "tab", tab: "home" },
          { 
            type: "chat_room", 
            chat: { id: chatId, partId: "", buyerId: "", sellerId: "", partTitle: "", partPrice: 0, partImageUrl: "", sellerName: "", buyerName: "", lastMessageText: "", lastMessageAt: Date.now() } 
          }
        ];
      }
    }

    const lower = pathname.toLowerCase();
    if (lower === "/search") return [{ type: "tab", tab: "home" }, { type: "tab", tab: "search" }];
    if (lower === "/sell") return [{ type: "tab", tab: "home" }, { type: "tab", tab: "sell" }];
    if (lower === "/chat" || lower === "/chats" || lower === "/messages") return [{ type: "tab", tab: "home" }, { type: "tab", tab: "chat" }];
    if (lower === "/myads" || lower === "/my-ads") return [{ type: "tab", tab: "home" }, { type: "tab", tab: "myads" }];
    if (lower === "/account" || lower === "/profile") return [{ type: "tab", tab: "home" }, { type: "tab", tab: "account" }];
    if (lower === "/admin") return [{ type: "tab", tab: "home" }, { type: "admin_dashboard" }];
    if (lower === "/notifications") return [{ type: "tab", tab: "home" }, { type: "notifications" }];
  } catch (e) {
    console.error("Error parsing initial route:", e);
  }

  return [{ type: "tab", tab: "home" }];
}

export default function App() {
  const { t, language } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [logoutMessage, setLogoutMessage] = useState<string | null>(null);

  const [navStack, setNavStack] = useState<NavScreen[]>(() => {
    const initial = parseInitialScreenFromUrl();
    const top = initial[initial.length - 1];
    const path = screenToPath(top);
    try {
      window.history.replaceState({ index: initial.length - 1, screen: top }, "", path);
    } catch (e) {}
    return initial;
  });

  const currentScreen = navStack[navStack.length - 1] || { type: "tab", tab: "home" };

  const activeTab = (() => {
    for (let i = navStack.length - 1; i >= 0; i--) {
      if (navStack[i].type === "tab") {
        const tab = (navStack[i] as { type: "tab"; tab: "home" | "search" | "sell" | "messages" | "profile" | "chats" | "chat" | "myads" | "account" }).tab;
        if (tab === "messages" || tab === "chats") return "chat";
        if (tab === "profile") return "account";
        return tab;
      }
    }
    return "home";
  })();

  const activeChat = currentScreen.type === "chat_room" ? currentScreen.chat : null;
  const detailedPart = currentScreen.type === "part_detail" ? currentScreen.part : null;
  const showAdminDashboard = currentScreen.type === "admin_dashboard";

  const pushScreen = useCallback((screen: NavScreen) => {
    setNavStack((prev) => {
      const top = prev[prev.length - 1];
      if (top) {
        if (top.type === "tab" && screen.type === "tab" && top.tab === screen.tab) return prev;
        if (top.type === "chat_room" && screen.type === "chat_room" && top.chat.id === screen.chat.id) return prev;
        if (top.type === "part_detail" && screen.type === "part_detail" && top.part.id === screen.part.id) return prev;
        if (top.type === "admin_dashboard" && screen.type === "admin_dashboard") return prev;
        if (top.type === "notifications" && screen.type === "notifications") return prev;
      }
      const nextStack = [...prev, screen];
      const path = screenToPath(screen);
      try {
        window.history.pushState({ index: nextStack.length - 1, screen }, "", path);
      } catch (e) {
        console.warn("Failed to push history state:", e);
      }
      return nextStack;
    });
  }, []);

  const goBack = useCallback(() => {
    if (window.history.state && typeof window.history.state.index === "number" && window.history.state.index > 0) {
      window.history.back();
    } else {
      setNavStack((prev) => {
        if (prev.length > 1) {
          const nextStack = prev.slice(0, -1);
          const topScreen = nextStack[nextStack.length - 1];
          const nextPath = screenToPath(topScreen);
          try {
            window.history.replaceState({ index: nextStack.length - 1, screen: topScreen }, "", nextPath);
          } catch (e) {}
          return nextStack;
        }
        return [{ type: "tab", tab: "home" }];
      });
    }
  }, []);

  const [parts, setParts] = useState<SparePart[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  const [partsError, setPartsError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [detailImageIndex, setDetailImageIndex] = useState(0);

  const [activeNotification, setActiveNotification] = useState<{ chat: Chat; text: string; id: string } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  useEffect(() => {
    setAnnouncementsLoading(true);
    const unsub = subscribeToAnnouncements(currentUser?.id || null, (list) => {
      setAnnouncements(list);
      setAnnouncementsLoading(false);
    });
    return () => unsub();
  }, [currentUser?.id]);

  const unreadAnnouncementsCount = announcements.filter((a) => !a.isRead).length;

  const [detailedSellerRating, setDetailedSellerRating] = useState<{ average: number; count: number } | null>(null);
  const [showShareToast, setShowShareToast] = useState(false);
  const [showDetailedReviews, setShowDetailedReviews] = useState(false);
  const [viewingPublicUser, setViewingPublicUser] = useState<{ id: string; name: string } | null>(null);

  const [versionConfig, setVersionConfig] = useState<AppVersionConfig | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isForceUpdate, setIsForceUpdate] = useState(false);

  useEffect(() => {
    const checkVersionOnLaunch = async () => {
      try {
        const config = await fetchAppVersionConfig();
        setVersionConfig(config);
        const result = evaluateUpdateStatus(CURRENT_APP_VERSION, config);
        if (result.hasUpdate) {
          setShowUpdateModal(true);
          setIsForceUpdate(result.isForceUpdate);
        }
      } catch (err) {
        console.warn("Initial app version check warning:", err);
      }
    };
    checkVersionOnLaunch();
  }, []);

  const currentUserRef = React.useRef<User | null>(null);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (parts.length > 0) {
      setNavStack((prev) =>
        prev.map((item) => {
          if (item.type === "part_detail" && (item.part.title === "Loading..." || !item.part.contactName)) {
            const found = parts.find((p) => p.id === item.part.id);
            if (found) {
              return { ...item, part: found };
            }
          }
          return item;
        })
      );
    }
  }, [parts]);

  useEffect(() => {
    const onPopState = () => {
      if (showUpdateModal && isForceUpdate) {
        return;
      }
      if (showUpdateModal && !isForceUpdate) {
        setShowUpdateModal(false);
        return;
      }
      if (isGalleryOpen) {
        setIsGalleryOpen(false);
        return;
      }
      if (showDetailedReviews) {
        setShowDetailedReviews(false);
        return;
      }
      if (viewingPublicUser) {
        setViewingPublicUser(null);
        return;
      }
      setNavStack((prevStack) => {
        if (prevStack.length > 1) {
          const nextStack = prevStack.slice(0, -1);
          const topScreen = nextStack[nextStack.length - 1];
          const targetPath = screenToPath(topScreen);
          if (window.location.pathname !== targetPath) {
            try {
              window.history.replaceState(
                { index: nextStack.length - 1, screen: topScreen },
                "",
                targetPath
              );
            } catch (e) {}
          }
          return nextStack;
        }
        return prevStack;
      });
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [showUpdateModal, isForceUpdate, isGalleryOpen, showDetailedReviews, viewingPublicUser]);

  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [partToDelete, setPartToDelete] = useState<SparePart | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" } | null>(null);
  const [isDeletingPart, setIsDeletingPart] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleSaveListingChanges = async (partId: string, updates: Partial<SparePart>) => {
    try {
      const ok = await updateSparePartListing(partId, updates);
      if (ok) {
        setEditingPart(null);
        setNavStack(prev => prev.map(item => {
          if (item.type === "part_detail" && item.part.id === partId) {
            return { ...item, part: { ...item.part, ...updates } };
          }
          return item;
        }));
        setParts(prev => prev.map(p => p.id === partId ? { ...p, ...updates } : p));
        showToast("Listing updated successfully");
      }
    } catch (err: any) {
      setDeleteError(err.message || "Failed to update listing.");
      showToast("Error updating listing: " + (err.message || String(err)), "error");
      throw err;
    }
  };

  useEffect(() => {
    const updateRating = () => {
      const sId = detailedPart?.sellerId;
      if (sId) {
        fetchSellerReviews(sId).then((revs) => {
          const count = revs.length;
          const average = count > 0 
            ? parseFloat((revs.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1))
            : 0;
          setDetailedSellerRating({ average, count });
        });
      } else {
        setDetailedSellerRating(null);
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
  }, [detailedPart]);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setFavorites([]);
      return;
    }

    const unsubscribe = subscribeToUserFavorites(
      currentUser.id,
      (userFavorites) => {
        setFavorites(userFavorites);
      },
      (err) => {
        console.error("Error subscribing to user favorites:", err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    requestNotificationPermission();
    setUserPresence(currentUser.id, true);

    const handleOnline = () => setUserPresence(currentUser.id, true);
    const handleOffline = () => setUserPresence(currentUser.id, false);
    const handleVisibility = () => {
      if (document.hidden) {
        setUserPresence(currentUser.id, false);
      } else {
        setUserPresence(currentUser.id, true);
      }
    };
    const handleBeforeUnload = () => setUserPresence(currentUser.id, false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      setUserPresence(currentUser.id, false);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;

    let unsubFCM: (() => void) | null = null;

    async function initFCM() {
      try {
        const token = await registerFCMToken(currentUser.id);
        if (token) {
          console.log("[FCM Phase 1] Token registered and saved to Firestore for user:", currentUser.id);
        }

        unsubFCM = setupFCMForegroundListener(async (payload) => {
          const title = payload.notification?.title || payload.data?.title || "Auto Parts Notification";
          const body = payload.notification?.body || payload.data?.body || payload.data?.message || "";
          const chatId = payload.data?.chatId;

          if (chatId) {
            const chatObj: Chat = {
              id: chatId,
              partId: payload.data?.partId || chatId.split("_")[2] || "",
              partTitle: payload.data?.partTitle || "Auto Part",
              partImageUrl: payload.data?.partImageUrl || "",
              partPrice: Number(payload.data?.partPrice) || 0,
              buyerId: payload.data?.buyerId || "",
              buyerName: payload.data?.buyerName || "Buyer",
              sellerId: payload.data?.sellerId || "",
              sellerName: payload.data?.sellerName || "Seller",
              lastMessageText: body,
              lastMessageAt: Date.now(),
              lastSenderId: payload.data?.senderId || ""
            };

            setActiveNotification({
              chat: chatObj,
              text: body,
              id: `fcm_${Date.now()}`
            });
          } else {
            setActiveNotification({
              chat: {
                id: `general_${Date.now()}`,
                partId: "",
                partTitle: title,
                partImageUrl: "",
                partPrice: 0,
                buyerId: "",
                buyerName: title,
                sellerId: "",
                sellerName: "",
                lastMessageText: body,
                lastMessageAt: Date.now(),
                lastSenderId: ""
              },
              text: body,
              id: `fcm_${Date.now()}`
            });
          }

          try {
            playNotificationSound();
            triggerVibration();
          } catch (e) {}

          await saveFCMNotificationToFirestore(currentUser.id, title, body, payload.data);
        });
      } catch (err) {
        console.warn("[FCM Phase 1] Notice during setup:", err);
      }
    }

    initFCM();

    return () => {
      if (unsubFCM) unsubFCM();
    };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) {
      setUnreadCounts({});
      return;
    }

    const unsubscribe = subscribeToUserNotifications(
      currentUser.id,
      (notifications) => {
        const nextUnreadCounts: Record<string, number> = {};
        const uniqueChatsToMarkDelivered = new Set<string>();
        
        notifications.forEach((notification) => {
          nextUnreadCounts[notification.chatId] = (nextUnreadCounts[notification.chatId] || 0) + 1;
          
          if (!activeChat || activeChat.id !== notification.chatId) {
            uniqueChatsToMarkDelivered.add(notification.chatId);
          }
          
          const isFresh = Date.now() - notification.createdAt < 30000;
          const lastNotifiedAtStr = sessionStorage.getItem(`autoparts_notified_at_${notification.chatId}`);
          const lastNotifiedAt = lastNotifiedAtStr ? parseInt(lastNotifiedAtStr, 10) : 0;
          
          if (isFresh && notification.createdAt > lastNotifiedAt) {
            sessionStorage.setItem(`autoparts_notified_at_${notification.chatId}`, notification.createdAt.toString());
            
            const chatObj: Chat = {
              id: notification.chatId,
              partId: notification.chatId.split("_")[2] || "",
              partTitle: notification.partTitle,
              partImageUrl: notification.partImageUrl,
              partPrice: notification.partPrice,
              buyerId: notification.buyerId,
              buyerName: notification.buyerName,
              sellerId: notification.sellerId,
              sellerName: notification.sellerName,
              lastMessageText: notification.text,
              lastMessageAt: notification.createdAt,
              lastSenderId: notification.senderId
            };
            
            setActiveNotification({
              chat: chatObj,
              text: notification.text,
              id: notification.id
            });

            playNotificationSound();
            triggerVibration([150, 60, 150]);

            const senderName = notification.senderId === notification.buyerId ? notification.buyerName : notification.sellerName;
            showPushNotification({
              title: `💬 New Message from ${senderName}`,
              body: notification.text,
              icon: notification.partImageUrl || "/favicon.ico",
              tag: `chat_${notification.chatId}`,
              onClick: () => {
                pushScreen({ type: "tab", tab: "chats" });
                pushScreen({ type: "chat_room", chat: chatObj });
              }
            });
          }
        });

        uniqueChatsToMarkDelivered.forEach((chatId) => {
          markMessagesAsDelivered(chatId, currentUser.id);
        });
        
        setUnreadCounts(nextUnreadCounts);
      },
      (err) => {
        console.error("Error subscribing to user notifications:", err);
      }
    );

    return () => unsubscribe();
  }, [currentUser, activeChat]);

  useEffect(() => {
    if (activeChat && currentUser) {
      markChatNotificationsAsRead(activeChat.id, currentUser.id);
      
      if (activeNotification && activeNotification.chat.id === activeChat.id) {
        setActiveNotification(null);
      }
    }
  }, [activeChat, currentUser, unreadCounts, activeNotification]);

  useEffect(() => {
    setPartsLoading(true);
    setPartsError(null);
    const unsubscribe = subscribeToSpareParts(
      (data) => {
        setParts(data);
        setPartsLoading(false);
        setPartsError(null);
      },
      (err) => {
        console.error("Failed to listen to spare parts updates", err);
        setPartsError(err?.message || "Failed to load spare parts. Please check your connection.");
        setPartsLoading(false);
      }
    );

    const handleCustomUpdate = async () => {
      try {
        const data = await fetchSpareParts();
        setParts(data);
        setPartsError(null);
      } catch (e) {
        console.warn("Failed to reload parts on custom update:", e);
      }
    };

    window.addEventListener("autoparts_listings_updated", handleCustomUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener("autoparts_listings_updated", handleCustomUpdate);
    };
  }, []);

  const loadPartsData = async () => {
    setPartsLoading(true);
    setPartsError(null);
    try {
      const data = await fetchSpareParts();
      setParts(data);
      setPartsLoading(false);
    } catch (err: any) {
      console.error("Failed to manual load spare parts:", err);
      setPartsError(err?.message || "Failed to load spare parts. Please try again.");
      setPartsLoading(false);
    }
  };

  const handleFavoriteToggle = async (partId: string) => {
    if (!currentUser) {
      pushScreen({ type: "auth" });
      return;
    }

    try {
      if (favorites.includes(partId)) {
        await removeFavorite(currentUser.id, partId);
      } else {
        await addFavorite(currentUser.id, partId);
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handlePublishSuccess = (newPart: SparePart) => {
    setParts((prevParts) => {
      if (prevParts.some(p => p.id === newPart.id)) return prevParts;
      const titleClean = (newPart.title || "").trim().toLowerCase();
      const descClean = (newPart.description || "").trim().toLowerCase();
      const isDup = prevParts.some(p => 
        p.sellerId === newPart.sellerId &&
        (p.title || "").trim().toLowerCase() === titleClean &&
        p.price === newPart.price &&
        (p.description || "").trim().toLowerCase() === descClean
      );
      if (isDup) return prevParts;
      return [newPart, ...prevParts];
    });
    pushScreen({ type: "tab", tab: "home" });
  };

  const handlePartDeleted = async (deletedPartId: string) => {
    setParts((prevParts) => prevParts.filter((p) => p.id !== deletedPartId));
    if (favorites.includes(deletedPartId)) {
      if (currentUser) {
        try {
          await removeFavorite(currentUser.id, deletedPartId);
        } catch (err) {
          console.error("Failed to remove deleted part from favorites:", err);
        }
      } else {
        setFavorites((prev) => prev.filter((id) => id !== deletedPartId));
      }
    }
    setEditingPart(null);
    setPartToDelete(null);
    setNavStack((prevStack) => {
      const filtered = prevStack.filter(item => !(item.type === "part_detail" && item.part.id === deletedPartId));
      if (filtered.length > 0) {
        return filtered;
      }
      return [{ type: "tab", tab: "home" }];
    });
    try {
      window.history.replaceState({ index: 0, screen: { type: "tab", tab: "home" } }, "", "/");
    } catch (e) {}
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("autoparts_current_user", JSON.stringify(updatedUser));
    const usersRaw = localStorage.getItem("autoparts_users");
    if (usersRaw) {
      const usersList: any[] = JSON.parse(usersRaw);
      const updatedUsers = usersList.map((u) => 
        u.id === updatedUser.id 
          ? { 
              ...u, 
              ...updatedUser
            } 
          : u
      );
      localStorage.setItem("autoparts_users", JSON.stringify(updatedUsers));
    }

    // Immediately propagate updated name & avatar to all listings created by this user
    setParts((prevParts) => {
      const newParts = prevParts.map((p) => {
        if (p.sellerId === updatedUser.id) {
          return {
            ...p,
            contactName: updatedUser.name,
            sellerName: updatedUser.name,
            sellerPhoto: updatedUser.photoURL || updatedUser.profilePhoto || "",
            sellerAvatar: updatedUser.photoURL || updatedUser.profilePhoto || ""
          };
        }
        return p;
      });
      try {
        localStorage.setItem("autoparts_listings", JSON.stringify(newParts));
      } catch (e) {}
      return newParts;
    });

    // Update navStack if currently looking at own part details
    setNavStack((prev) => prev.map((item) => {
      if (item.type === "part_detail" && item.part.sellerId === updatedUser.id) {
        return {
          ...item,
          part: {
            ...item.part,
            contactName: updatedUser.name,
            sellerName: updatedUser.name
          }
        };
      }
      return item;
    }));

    try {
      window.dispatchEvent(new CustomEvent("autoparts_profile_updated", { detail: updatedUser }));
    } catch (e) {}

    try {
      await updateUserProfile(updatedUser.id, {
        name: updatedUser.name,
        displayName: updatedUser.name,
        phone: updatedUser.phone,
        state: updatedUser.state,
        district: updatedUser.district,
        lat: updatedUser.lat,
        lng: updatedUser.lng,
        photoURL: updatedUser.photoURL || updatedUser.profilePhoto || "",
        profilePhoto: updatedUser.profilePhoto || updatedUser.photoURL || "",
        profileImageUrl: updatedUser.profileImageUrl !== undefined ? updatedUser.profileImageUrl : (updatedUser.photoURL || null),
        photoDeleted: updatedUser.photoDeleted ?? (!updatedUser.photoURL && !updatedUser.profilePhoto)
      });
    } catch (e) {
      console.error("Failed to update user profile in Firestore:", e);
    }
  };

  const handleToggleSold = async (partId: string) => {
    const partToToggle = parts.find(p => p.id === partId);
    if (!partToToggle) return;
    const nextSoldState = !(partToToggle.sold === true || partToToggle.status === "sold");
    const nextStatus = nextSoldState ? "sold" : "active";

    try {
      await updateSparePartListing(partId, { 
        sold: nextSoldState, 
        status: nextStatus 
      });

      setParts((prevParts) => 
        prevParts.map((p) => p.id === partId ? { ...p, sold: nextSoldState, status: nextStatus } : p)
      );
      const localData = localStorage.getItem("autoparts_listings");
      if (localData) {
        const list: SparePart[] = JSON.parse(localData);
        const updated = list.map((p) => p.id === partId ? { ...p, sold: nextSoldState, status: nextStatus } : p);
        localStorage.setItem("autoparts_listings", JSON.stringify(updated));
      }
      setNavStack(prev => prev.map(item => {
        if (item.type === "part_detail" && item.part.id === partId) {
          return { ...item, part: { ...item.part, sold: nextSoldState, status: nextStatus } };
        }
        return item;
      }));
    } catch (err) {
      console.error("Error toggling sold state for part:", partId, err);
    }
  };

  const handleUpdatePrice = async (partId: string, newPrice: number) => {
    await updateSparePartListing(partId, { price: newPrice });
    
    setParts((prevParts) => 
      prevParts.map((p) => p.id === partId ? { ...p, price: newPrice } : p)
    );
    const localData = localStorage.getItem("autoparts_listings");
    if (localData) {
      const list: SparePart[] = JSON.parse(localData);
      const updated = list.map((p) => p.id === partId ? { ...p, price: newPrice } : p);
      localStorage.setItem("autoparts_listings", JSON.stringify(updated));
    }
    setNavStack(prev => prev.map(item => {
      if (item.type === "part_detail" && item.part.id === partId) {
        return { ...item, part: { ...item.part, price: newPrice } };
      }
      return item;
    }));
  };

  const handleTabClick = useCallback((tab: "home" | "search" | "sell" | "chat" | "myads" | "account") => {
    // 1. Clear all profile overlays and detail states
    setViewingPublicUser(null);
    setShowDetailedReviews(false);
    setEditingPart(null);
    setPartToDelete(null);
    setIsGalleryOpen(false);

    // 2. Clear navigation stack of transient screens (part details, chats, etc) 
    // to ensure user doesn't "go back" into the seller profile or ad detail.
    // Resetting to just the target tab satisfies "Navigate directly to the selected tab"
    const newTab: NavScreen = { type: "tab", tab };
    setNavStack([newTab]);

    // 3. Update browser history to reflect a clean state
    const path = screenToPath(newTab);
    try {
      window.history.replaceState({ index: 0, screen: newTab }, "", path);
    } catch (e) {
      console.warn("Failed to replace history state on tab click:", e);
    }
  }, []);

  const handleAuthSuccess = (user: User) => {
    setLogoutMessage(null);
    setCurrentUser(user);
    loadPartsData();
  };

  const handleLogout = (msg?: string) => {
    setLogoutMessage(msg || "Signed out successfully.");
    setCurrentUser(null);
    setNavStack([{ type: "tab", tab: "home" }]);
  };

  const handleStartChat = async (part: SparePart) => {
    if (!currentUser) {
      alert("Please sign in to message sellers.");
      return;
    }
    try {
      const chat = await getOrCreateChat(part, currentUser);
      pushScreen({ type: "chat_room", chat });
    } catch (err: any) {
      alert(err.message || "Failed to start chat.");
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "Brand New":
        return "bg-emerald-500 text-white border-emerald-600";
      case "Like New":
        return "bg-cyan-500 text-white border-cyan-600";
      case "Used (Good)":
        return "bg-amber-500 text-white border-amber-600";
      case "For Scrap/Spares":
        return "bg-rose-500 text-white border-rose-600";
      default:
        return "bg-slate-500 text-white border-slate-600";
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-950 text-slate-900 flex flex-col items-center justify-center font-sans relative" id="app-root">
      {/* Native Mobile High-Quality Splash Screen */}
      <AnimatePresence>
        {showSplashScreen && (
          <SplashScreen 
            minDurationMs={2500} 
            isReady={!authLoading} 
            onFinish={() => setShowSplashScreen(false)} 
          />
        )}
      </AnimatePresence>

      {authLoading && !showSplashScreen ? (
        <div className="w-full max-w-md h-[100dvh] flex flex-col items-center justify-center bg-[#070D18] text-white relative overflow-hidden border-x border-slate-800/20 shadow-2xl" id="splash-loading-fallback">
          <div className="flex flex-col items-center justify-center text-center z-10">
            <BrandLogo size="xl" variant="full" theme="dark" showTagline={true} className="mb-6" />
          </div>
          <div className="absolute bottom-12 flex flex-col items-center z-10">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
              Connecting Marketplace...
            </span>
          </div>
        </div>
      ) : !currentUser ? (
        <div className="w-full max-w-md h-[100dvh] flex flex-col relative overflow-hidden border-x border-slate-800/20 shadow-2xl">
          <AuthScreen 
            onAuthSuccess={handleAuthSuccess} 
            logoutMessage={logoutMessage}
            onClearLogoutMessage={() => setLogoutMessage(null)}
          />
        </div>
      ) : currentUser.isBlocked ? (
        <div className="w-full max-w-md h-[100dvh] flex flex-col items-center justify-center bg-slate-50 text-slate-800 px-6 text-center border-x border-slate-800/20 shadow-2xl" id="suspended-screen">
          <h2 className="text-xl font-black tracking-tight text-slate-900">Account Suspended</h2>
          <p className="text-slate-500 text-xs mt-2 max-w-sm leading-relaxed font-medium">
            Your marketplace account has been suspended by a Super Administrator for policy or terms violations. If you believe this was an error, please contact support.
          </p>
          <button
            onClick={async () => {
              const { signOut: firebaseSignOut } = await import("./lib/firebase");
              await firebaseSignOut();
              handleLogout("Signed out successfully.");
            }}
            className="mt-6 bg-[#0056D2] hover:bg-blue-700 text-white font-black px-6 py-2.5 rounded-full text-xs shadow-md transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      ) : showAdminDashboard && (currentUser.email === "wwwautoparts2@gmail.com" || currentUser.email === "ym1950394@gmail.com" || currentUser.isSuperAdmin || currentUser.isAdmin || currentUser.role === "admin") ? (
        <div className="w-full max-w-md h-[100dvh] flex flex-col relative overflow-hidden border-x border-slate-800/20 shadow-2xl">
          <AdminDashboardScreen
            currentUser={currentUser}
            allParts={parts}
            onPartUpdated={async () => {
              const { fetchSpareParts } = await import("./lib/firebase");
              const allParts = await fetchSpareParts();
              setParts(allParts);
            }}
            onBackToApp={goBack}
          />
        </div>
      ) : (
        <div className="w-full max-w-md h-[100dvh] max-h-[100dvh] bg-slate-50 flex flex-col relative overflow-hidden border-x border-slate-800/40 shadow-2xl" id="app-shell">
          
          <InAppNotification
            notification={activeNotification}
            onClose={() => setActiveNotification(null)}
            onClick={(chat) => {
              pushScreen({ type: "tab", tab: "chats" });
              pushScreen({ type: "chat_room", chat });
              setActiveNotification(null);
            }}
          />

          <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col w-full">
            <AnimatePresence mode="wait">
              {activeTab === "home" && (
                <motion.div 
                  key="screen-home"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute inset-0 flex flex-col overflow-hidden"
                >
                  <HomeScreen 
                    parts={parts} 
                    partsLoading={partsLoading}
                    partsError={partsError}
                    onRetry={loadPartsData}
                    favorites={favorites}
                    onFavoriteToggle={handleFavoriteToggle} 
                    onStartChat={handleStartChat}
                    currentUser={currentUser}
                    onPartDeleted={handlePartDeleted}
                    onViewPart={(part) => pushScreen({ type: "part_detail", part })}
                    unreadNotificationCount={unreadAnnouncementsCount}
                    onOpenNotifications={() => pushScreen({ type: "notifications" })}
                    onOpenUserProfile={(id, name) => setViewingPublicUser({ id, name })}
                  />
                </motion.div>
              )}

              {activeTab === "search" && (
                <motion.div 
                  key="screen-search"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute inset-0 flex flex-col overflow-hidden"
                >
                  <SearchScreen
                    parts={parts}
                    partsLoading={partsLoading}
                    onRefresh={loadPartsData}
                    favorites={favorites}
                    onFavoriteToggle={handleFavoriteToggle}
                    onViewPart={(part) => pushScreen({ type: "part_detail", part })}
                    onStartChat={handleStartChat}
                    currentUser={currentUser}
                    onOpenUserProfile={(id, name) => setViewingPublicUser({ id, name })}
                  />
                </motion.div>
              )}

              {activeTab === "sell" && (
                <motion.div 
                  key="screen-sell"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute inset-0 flex flex-col overflow-hidden"
                >
                  <SellScreen 
                    currentUser={currentUser} 
                    onPublishSuccess={handlePublishSuccess} 
                    parts={parts}
                  />
                </motion.div>
              )}

              {activeTab === "chat" && (
                <motion.div 
                  key="screen-chat"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute inset-0 flex flex-col overflow-hidden"
                >
                  <ChatsScreen
                    currentUser={currentUser}
                    onSelectChat={(chat) => pushScreen({ type: "chat_room", chat })}
                    unreadCounts={unreadCounts}
                    onOpenUserProfile={(id, name) => setViewingPublicUser({ id, name })}
                  />
                </motion.div>
              )}

              {activeTab === "myads" && (
                <motion.div 
                  key="screen-myads"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute inset-0 flex flex-col overflow-hidden"
                >
                  <ProfileScreen
                    currentUser={currentUser}
                    activeTab="myads"
                    onTabChange={(tab) => handleTabClick(tab as any)}
                    onLogout={handleLogout}
                    parts={parts}
                    favorites={favorites}
                    onPartDeleted={handlePartDeleted}
                    onFavoriteToggle={handleFavoriteToggle}
                    onViewPart={(part) => pushScreen({ type: "part_detail", part })}
                    onUpdateUser={handleUpdateUser}
                    onToggleSold={handleToggleSold}
                    onUpdatePrice={handleUpdatePrice}
                    onOpenAdminDashboard={() => pushScreen({ type: "admin_dashboard" })}
                    onOpenUserProfile={(id, name) => setViewingPublicUser({ id, name })}
                  />
                </motion.div>
              )}

              {activeTab === "account" && (
                <motion.div 
                  key="screen-account"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute inset-0 flex flex-col overflow-hidden"
                >
                  <ProfileScreen
                    currentUser={currentUser}
                    activeTab="account"
                    onTabChange={(tab) => handleTabClick(tab as any)}
                    onLogout={handleLogout}
                    parts={parts}
                    favorites={favorites}
                    onPartDeleted={handlePartDeleted}
                    onFavoriteToggle={handleFavoriteToggle}
                    onViewPart={(part) => pushScreen({ type: "part_detail", part })}
                    onUpdateUser={handleUpdateUser}
                    onToggleSold={handleToggleSold}
                    onUpdatePrice={handleUpdatePrice}
                    onOpenAdminDashboard={() => pushScreen({ type: "admin_dashboard" })}
                    onOpenUserProfile={(id, name) => setViewingPublicUser({ id, name })}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Native Mobile Bottom Navigation Bar */}
          {!activeChat && (
            <div 
              className="fixed bottom-0 inset-x-0 z-[1000] px-3 pt-1 max-w-md mx-auto w-full pointer-events-auto shrink-0"
              style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom, 8px))" }}
              id="native-bottom-nav-bar"
            >
              <div className="h-14 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 rounded-2xl flex flex-row items-center justify-around px-1 relative shadow-lg shadow-slate-950/10">
                {/* 1. Home Tab */}
                <button
                  onClick={() => handleTabClick("home")}
                  className="flex-1 flex flex-col items-center justify-center py-1 relative cursor-pointer active:scale-90 transition-transform"
                  id="nav-tab-home"
                >
                  <HomeIcon size={18} className={activeTab === "home" ? "text-[#2563EB]" : "text-slate-500"} />
                  <span className={`text-[10px] mt-0.5 tracking-tight ${activeTab === "home" ? "text-[#2563EB] font-bold" : "text-slate-500 font-medium"}`}>
                    Home
                  </span>
                </button>

                {/* 2. Chat Tab */}
                <button
                  onClick={() => handleTabClick("chat")}
                  className="flex-1 flex flex-col items-center justify-center py-1 relative cursor-pointer active:scale-90 transition-transform"
                  id="nav-tab-chat"
                >
                  <div className="relative">
                    <MessageSquare size={18} className={activeTab === "chat" ? "text-[#2563EB]" : "text-slate-500"} />
                    {(Object.values(unreadCounts) as number[]).reduce((sum, count) => sum + count, 0) > 0 && (
                      <div className="absolute -top-1.5 -right-2 bg-rose-600 text-white h-4 min-w-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                        <span className="text-white text-[8px] font-black leading-none">
                          {(Object.values(unreadCounts) as number[]).reduce((sum, count) => sum + count, 0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] mt-0.5 tracking-tight ${activeTab === "chat" ? "text-[#2563EB] font-bold" : "text-slate-500 font-medium"}`}>
                    Chat
                  </span>
                </button>

                {/* 3. Sell Floating Action Button */}
                <div className="flex-1 flex flex-col items-center justify-center relative -mt-3.5">
                  <button
                    onClick={() => handleTabClick("sell")}
                    className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center p-0 border-2 border-white dark:border-slate-900 shadow-md hover:scale-105 active:scale-90 transition-transform cursor-pointer"
                    id="nav-tab-sell"
                  >
                    <Plus size={22} strokeWidth={3} className="text-slate-950" />
                  </button>
                  <span className={`text-[10px] mt-0.5 font-bold tracking-tight ${activeTab === "sell" ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300"}`}>
                    Sell
                  </span>
                </div>

                {/* 4. My Ads Tab */}
                <button
                  onClick={() => handleTabClick("myads")}
                  className="flex-1 flex flex-col items-center justify-center py-1 relative cursor-pointer active:scale-90 transition-transform"
                  id="nav-tab-myads"
                >
                  <Package size={18} className={activeTab === "myads" ? "text-[#2563EB]" : "text-slate-500"} />
                  <span className={`text-[10px] mt-0.5 tracking-tight ${activeTab === "myads" ? "text-[#2563EB] font-bold" : "text-slate-500 font-medium"}`}>
                    My Ads
                  </span>
                </button>

                {/* 5. Account Tab */}
                <button
                  onClick={() => handleTabClick("account")}
                  className="flex-1 flex flex-col items-center justify-center py-1 relative cursor-pointer active:scale-90 transition-transform"
                  id="nav-tab-account"
                >
                  <UserIcon size={18} className={activeTab === "account" ? "text-[#2563EB]" : "text-slate-500"} />
                  <span className={`text-[10px] mt-0.5 tracking-tight ${activeTab === "account" ? "text-[#2563EB] font-bold" : "text-slate-500 font-medium"}`}>
                    Account
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Master Detail Overlay */}
          {detailedPart && (
            <div className="absolute inset-0 bg-slate-50 z-30 flex flex-col text-slate-900 overflow-hidden" id="master-detail-backdrop">
              {showShareToast && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-full shadow-lg font-bold flex flex-row items-center gap-2 z-[99]">
                  <Sparkles size={14} className="text-amber-400" />
                  <span className="text-white text-xs font-bold">Link copied to clipboard!</span>
                </div>
              )}

              {/* Sticky Top Header Bar */}
              <div className="sticky top-0 bg-white border-b border-slate-100 px-3.5 py-2.5 flex flex-row items-center justify-between z-20 shadow-xs">
                <div className="flex flex-row items-center gap-2">
                  <button
                    onClick={goBack}
                    className="p-1.5 rounded-full text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    id="close-master-detail-btn"
                  >
                    <ArrowLeft size={22} strokeWidth={2.5} className="text-slate-800" />
                  </button>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-xs text-slate-900 uppercase">Ad Details</span>
                    <span className="text-[10px] text-slate-400 font-bold font-mono">ID: {detailedPart.id.substring(0, 8).toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex flex-row items-center gap-2">
                  <button
                    onClick={(e) => {
                      const shareUrl = window.location.origin + "?part=" + detailedPart.id;
                      if (navigator.share) {
                        navigator.share({
                          title: detailedPart.title,
                          text: `Check out this ${detailedPart.carBrand} ${detailedPart.carModel} ${detailedPart.title} on Autoparts India!`,
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
                    className="p-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Share2 size={20} className="text-slate-700" />
                  </button>

                  <button
                    onClick={() => handleFavoriteToggle(detailedPart.id)}
                    className="p-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Heart
                      size={20}
                      className={favorites.includes(detailedPart.id) ? "fill-red-500 text-red-500" : "text-slate-700"}
                    />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto pb-44 bg-slate-50">
                {(() => {
                  const imageList: string[] = [];
                  if (detailedPart.imageUrls && detailedPart.imageUrls.length > 0) {
                    detailedPart.imageUrls.forEach(url => {
                      if (url && !imageList.includes(url)) {
                        imageList.push(url);
                      }
                    });
                  } else if (detailedPart.imageUrl) {
                    imageList.push(detailedPart.imageUrl);
                  }

                  return (
                    <div className="h-80 w-full bg-slate-950 relative flex items-center justify-center border-b border-slate-200">
                      <div 
                        role="button"
                        tabIndex={0}
                        className="w-full h-full relative flex items-center justify-center cursor-pointer group outline-none"
                        onClick={() => setIsGalleryOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setIsGalleryOpen(true);
                          }
                        }}
                        title="Click main image to open fullscreen gallery"
                      >
                        {imageList[detailImageIndex] ? (
                          <img
                            src={imageList[detailImageIndex]}
                            alt={detailedPart.title}
                            className="w-full h-full max-h-80 object-contain"
                          />
                        ) : (
                          <div className="w-full h-full min-h-[220px] bg-slate-900 flex flex-col items-center justify-center text-indigo-400 gap-2 p-4">
                            <ImageIcon size={36} className="text-indigo-400" />
                            <span className="text-xs font-bold uppercase text-indigo-400">{detailedPart.partName || detailedPart.category}</span>
                          </div>
                        )}

                        {/* VIEW FULLSCREEN Button */}
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

                        <div className="absolute bottom-4 right-4 bg-black/60 text-[11px] font-bold text-white px-2.5 py-1 rounded-md font-mono z-10">
                          <span className="text-white text-[11px] font-bold">{detailImageIndex + 1} / {imageList.length}</span>
                        </div>

                        {detailedPart.sold && (
                          <div className="absolute inset-0 bg-slate-950/65 flex items-center justify-center z-20">
                            <span className="text-xs font-black tracking-widest text-white bg-rose-600 px-4 py-2 rounded-md uppercase border border-rose-500">
                              SOLD OUT
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Navigation arrows for multiple images */}
                      {imageList.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailImageIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1));
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-indigo-600 text-white rounded-full transition-all z-10 cursor-pointer shadow-md flex items-center justify-center border border-white/10"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailImageIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0));
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-indigo-600 text-white rounded-full transition-all z-10 cursor-pointer shadow-md flex items-center justify-center border border-white/10"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })()}

                <div className="space-y-3 mt-3 px-3">
                  <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-1.5">
                    <div className="flex flex-row justify-between items-start">
                      <span className="text-2xl font-black text-slate-900">
                        {formatPrice(detailedPart.price)}
                      </span>
                      <div className={`px-2.5 py-0.5 rounded border ${getConditionColor(detailedPart.condition)}`}>
                        <span className="text-[9px] font-black uppercase text-white">{detailedPart.condition}</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mt-1">
                      {detailedPart.title}
                    </p>
                    <div className="flex flex-row items-center justify-between text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100">
                      <div className="flex flex-row items-center gap-1">
                        <MapPin size={13} className="text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-500">{detailedPart.district || detailedPart.location}, {detailedPart.state || "All India"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase">
                      Details & Specifications
                    </h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1">
                      <div className="flex flex-col border-b border-slate-100 pb-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Brand</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.carBrand}</span>
                      </div>
                      <div className="flex flex-col border-b border-slate-100 pb-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Model Compatibility</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.carModel}</span>
                      </div>
                      <div className="flex flex-col border-b border-slate-100 pb-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Category</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.category}</span>
                      </div>
                      <div className="flex flex-col border-b border-slate-100 pb-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Condition</span>
                        <span className="text-xs font-extrabold text-slate-800 mt-0.5">{detailedPart.condition}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase">
                      Description
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {detailedPart.description}
                    </p>
                  </div>

                  {/* Interactive OpenStreetMap Location Section */}
                  <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-3" id="part-location-map-section">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-blue-600" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase">
                            Item Location
                          </h4>
                          <span className="text-[11px] text-slate-500 font-medium block">
                            {detailedPart.district || detailedPart.location}, {detailedPart.state || "India"}
                          </span>
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${detailedPart.lat || 28.6139},${detailedPart.lng || 77.2090}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors shadow-2xs cursor-pointer active:scale-95"
                        id="open-map-directions-link"
                      >
                        <Compass size={13} className="text-blue-600" />
                        <span>Directions</span>
                      </a>
                    </div>

                    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-2xs relative">
                      <GMap
                        lat={detailedPart.lat}
                        lng={detailedPart.lng}
                        state={detailedPart.state}
                        district={detailedPart.district}
                        height="220px"
                        interactive={false}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => setViewingPublicUser({ id: detailedPart.sellerId, name: detailedPart.contactName })}
                    className="w-full bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex flex-row items-center justify-between text-left cursor-pointer hover:bg-slate-50 transition-colors group"
                    id="part-detail-seller-btn"
                  >
                    <div className="flex flex-row items-center gap-3">
                      <UserAvatar
                        userId={detailedPart.sellerId}
                        name={detailedPart.contactName}
                        photoURL={detailedPart.sellerPhoto || detailedPart.sellerAvatar}
                        size="lg"
                        showVerifiedBadge
                      />
                      <div>
                        <span className="text-[9px] text-blue-600 font-black tracking-widest uppercase block">Verified Member</span>
                        <span className="text-xs font-black text-slate-800 mt-0.5 block group-hover:text-blue-600 transition-colors">{detailedPart.contactName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-600 text-xs font-bold transition-colors">
                      <span className="text-[11px]">View Profile</span>
                      <ChevronRight size={16} />
                    </div>
                  </button>
                </div>
              </div>

              {/* Sticky Bottom Action Bar - Visibly elevated above bottom navigation bar */}
              <div 
                className="absolute bottom-[66px] sm:bottom-[70px] inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 flex flex-row items-center gap-3 z-30 shadow-[0_-6px_20px_rgba(0,0,0,0.08)]"
                id="ad-details-action-bar"
              >
                {(() => {
                  const currentUid = auth?.currentUser?.uid || currentUser?.uid || currentUser?.id || null;
                  const currentEmail = (auth?.currentUser?.email || currentUser?.email || "").toLowerCase();
                  const listingOwnerId = detailedPart.ownerId || (detailedPart as any).sellerId || (detailedPart as any).userId || null;
                  const listingSellerEmail = (detailedPart.sellerEmail || "").toLowerCase();

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
                    const isSold = detailedPart.sold === true || detailedPart.status === "sold";
                    return (
                      <>
                        <button
                          onClick={() => setEditingPart(detailedPart)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3 px-2 rounded-xl font-black text-xs uppercase text-center cursor-pointer transition-all shadow-xs flex items-center justify-center gap-1.5"
                          id="edit-own-listing-btn"
                        >
                          <Edit3 size={15} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleToggleSold(detailedPart.id)}
                          className={`flex-1 active:scale-[0.98] text-white py-3 px-2 rounded-xl font-black text-xs uppercase text-center cursor-pointer transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                            isSold
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-amber-600 hover:bg-amber-700"
                          }`}
                          id="toggle-sold-own-listing-btn"
                        >
                          <CheckCircle2 size={15} />
                          <span>{isSold ? "Mark Active" : "Mark Sold"}</span>
                        </button>
                        <button
                          onClick={() => setPartToDelete(detailedPart)}
                          disabled={isDeletingPart}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white py-3 px-2 rounded-xl font-black text-xs uppercase text-center cursor-pointer transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                          id="delete-own-listing-btn"
                        >
                          <Trash2 size={15} />
                          <span>{isDeletingPart && partToDelete?.id === detailedPart.id ? "Deleting..." : "Delete"}</span>
                        </button>
                      </>
                    );
                  }

                  return (
                    <>
                      <button
                        onClick={() => {
                          if (detailedPart.sold) return;
                          handleStartChat(detailedPart);
                        }}
                        disabled={detailedPart.sold}
                        className={`flex-1 flex flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-xs uppercase cursor-pointer transition-all shadow-xs active:scale-[0.98] ${
                          detailedPart.sold 
                            ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed" 
                            : "bg-teal-600 hover:bg-teal-700 text-white"
                        }`}
                        id="inapp-chat-btn"
                      >
                        <MessageSquare size={15} className={detailedPart.sold ? "text-slate-400" : "text-white"} />
                        <span className={`font-black text-xs uppercase ${detailedPart.sold ? "text-slate-400" : "text-white"}`}>
                          {detailedPart.sold ? t("soldOut") : "Chat Now"}
                        </span>
                      </button>
                      <a
                        href={detailedPart.contactPhone ? `tel:${detailedPart.contactPhone}` : undefined}
                        onClick={(e) => {
                          if (!detailedPart.contactPhone) {
                            e.preventDefault();
                            alert("No phone number provided for this seller.");
                          }
                        }}
                        className="flex-1 flex flex-row items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3 px-3 rounded-xl font-black text-xs uppercase text-center transition-all shadow-xs cursor-pointer"
                        id="call-seller-btn"
                      >
                        <Phone size={15} className="text-white" />
                        <span className="text-white font-black text-xs uppercase">{t("callSeller")}</span>
                      </a>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Public User / Seller Profile Overlay */}
          {viewingPublicUser && (
            <SellerProfileView
              key={`public-profile-${viewingPublicUser.id}`}
              sellerId={viewingPublicUser.id}
              sellerName={viewingPublicUser.name}
              currentUser={currentUser}
              onClose={() => setViewingPublicUser(null)}
              onStartChat={handleStartChat}
              allParts={parts}
              onSelectPart={(part) => {
                setViewingPublicUser(null);
                pushScreen({ type: "part_detail", part });
              }}
            />
          )}

          {/* Seller Profile Overlay */}
          {showDetailedReviews && detailedPart && !viewingPublicUser && (
            <SellerProfileView
              key="seller-profile-app-overlay"
              sellerId={detailedPart.sellerId}
              sellerName={detailedPart.contactName}
              currentUser={currentUser}
              onClose={() => setShowDetailedReviews(false)}
              onStartChat={handleStartChat}
              allParts={parts}
              onSelectPart={(part) => pushScreen({ type: "part_detail", part })}
            />
          )}

          {/* Active Chat room overlay */}
          {activeChat && (
            <div className="absolute inset-0 z-40 bg-slate-50">
              <ChatRoomWindow
                chat={activeChat}
                currentUser={currentUser}
                onClose={goBack}
                onOpenUserProfile={(id, name) => setViewingPublicUser({ id, name })}
              />
            </div>
          )}

          {/* Notifications Screen overlay */}
          {currentScreen.type === "notifications" && (
            <div className="absolute inset-0 z-40 bg-slate-50 flex flex-col">
              <NotificationsScreen
                announcements={announcements}
                isLoading={announcementsLoading}
                currentUser={currentUser}
                onBack={goBack}
              />
            </div>
          )}

          {/* Image Gallery Modal */}
          <ImageGalleryModal
            isOpen={isGalleryOpen}
            onClose={() => setIsGalleryOpen(false)}
            part={detailedPart}
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
                    await handlePartDeleted(id);
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

          {partToDelete && (
            <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" id="app-delete-listing-dialog">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-xs">
                  <Trash2 size={24} />
                </div>
                <div className="text-center space-y-1.5">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Delete Listing?</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Are you sure you want to permanently delete <span className="font-bold text-slate-700 dark:text-slate-200">"{partToDelete.title}"</span>? All listing data and photos will be removed from Firestore. This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setPartToDelete(null)}
                    disabled={isDeletingPart}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsDeletingPart(true);
                        const targetId = partToDelete.id;
                        const ok = await deleteSparePartListing(targetId);
                        if (ok) {
                          setPartToDelete(null);
                          setEditingPart(null);
                          await handlePartDeleted(targetId);
                          showToast("Listing deleted successfully");
                        } else {
                          showToast("Failed to delete listing.", "error");
                        }
                      } catch (err: any) {
                        showToast("Error deleting listing: " + (err.message || String(err)), "error");
                      } finally {
                        setIsDeletingPart(false);
                      }
                    }}
                    disabled={isDeletingPart}
                    className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-extrabold text-white shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isDeletingPart ? "Deleting..." : "Yes, Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {toast && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200" id="app-toast">
              <span className={`w-2 h-2 rounded-full ${toast.type === "error" ? "bg-rose-400" : "bg-emerald-400"}`} />
              <span>{toast.message}</span>
            </div>
          )}

          {deleteError && (
            <div className="fixed bottom-4 left-4 right-4 bg-rose-600 text-white p-3 rounded-xl z-50 text-xs flex flex-row items-center justify-between">
              <span className="text-white text-xs">{deleteError}</span>
              <button onClick={() => setDeleteError(null)} className="text-white font-bold underline text-xs cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* App Update Dialog Modal */}
          {showUpdateModal && versionConfig && (
            <UpdateDialogModal
              versionConfig={versionConfig}
              isForceUpdate={isForceUpdate}
              onClose={() => {
                if (!isForceUpdate) {
                  setShowUpdateModal(false);
                }
              }}
            />
          )}

        </div>
      )}
    </div>
  );
}
