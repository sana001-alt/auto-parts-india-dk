export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  photoURL?: string;
  phone?: string;
  role?: 'admin' | 'seller' | 'buyer';
  fcmToken?: string | null;
  fcmTokenLastUpdated?: any;
  platform?: string;
  createdAt?: number | any;
}

export interface SparePart {
  id?: string;
  title: string;
  carBrand: string;
  carModel: string;
  category: string;
  condition: string;
  price: number;
  location: string;
  contactName?: string;
  contactPhone?: string;
  description?: string;
  imageUrl?: string;
  sellerId: string;
  sellerEmail?: string;
  createdAt: number | any;
  updatedAt?: number | any;
  approved?: boolean;
  verified?: boolean;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: number;
}

export interface ChatConversation {
  id: string;
  partTitle: string;
  partImageUrl?: string;
  lastMessageText: string;
  lastMessageAt: number;
  lastSenderId: string;
  participants: string[];
}

export interface AppBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  actionText: string;
  active: boolean;
}
