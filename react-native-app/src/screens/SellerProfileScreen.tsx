import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, Button, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/Ionicons';
import { DEFAULT_AVATAR } from '../constants';
import { 
  auth, 
  db, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc 
} from '../services/firebase';

export default function SellerProfileScreen({ route, navigation }: any) {
  const { seller, sellerId: paramSellerId, sellerName: paramSellerName } = route.params || {};
  const sellerId = seller?.id || paramSellerId;
  const sellerName = seller?.name || paramSellerName || 'Automotive Seller';
  const sellerPhoto = seller?.photoURL || seller?.profilePhoto || null;
  const sellerLocation = seller?.location || seller?.district || 'India';

  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const currentUser = auth.currentUser;
  const isOwnProfile = currentUser?.uid === sellerId;

  useEffect(() => {
    if (!sellerId) return;

    let isMounted = true;
    const fetchSellerData = async () => {
      setLoading(true);
      try {
        // 1. Fetch seller listings
        const q = query(
          collection(db, 'products', 'listings', 'items'),
          where('sellerId', '==', sellerId)
        );
        const snap = await getDocs(q);
        const items: any[] = [];
        snap.forEach(d => {
          items.push({ id: d.id, ...d.data() });
        });

        // 2. Fetch followers & following counts
        const followersQ = query(collection(db, 'follows'), where('followingId', '==', sellerId));
        const followingQ = query(collection(db, 'follows'), where('followerId', '==', sellerId));
        const [followersSnap, followingSnap] = await Promise.all([
          getDocs(followersQ),
          getDocs(followingQ)
        ]);

        // 3. Check follow status if logged in
        let followingStatus = false;
        if (currentUser?.uid && currentUser.uid !== sellerId) {
          const followDoc = await getDoc(doc(db, 'follows', `${currentUser.uid}_${sellerId}`));
          followingStatus = followDoc.exists();
        }

        if (isMounted) {
          setActiveListings(items.filter(it => !it.sold));
          setFollowersCount(followersSnap.size);
          setFollowingCount(followingSnap.size);
          setIsFollowing(followingStatus);
        }
      } catch (err) {
        console.warn('Error fetching seller profile in RN:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSellerData();

    return () => {
      isMounted = false;
    };
  }, [sellerId, currentUser?.uid]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to follow this seller.');
      return;
    }
    if (isOwnProfile) return;

    setFollowLoading(true);
    const followId = `${currentUser.uid}_${sellerId}`;
    try {
      if (isFollowing) {
        await deleteDoc(doc(db, 'follows', followId));
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        await setDoc(doc(db, 'follows', followId), {
          id: followId,
          followerId: currentUser.uid,
          followingId: sellerId,
          followerName: currentUser.displayName || 'Buyer',
          createdAt: Date.now(),
        });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update follow status.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleStartChat = () => {
    if (!currentUser) {
      Alert.alert('Sign In Required', 'Please sign in to message this seller.');
      return;
    }
    const samplePart = activeListings[0] || {
      id: 'general',
      title: 'Direct Seller Inquiry',
      price: 0,
      imageUrl: '',
      sellerId: sellerId,
      sellerName: sellerName,
    };
    navigation.navigate('ChatRoom', { part: samplePart });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* 1. Compact Header Card */}
      <Surface style={styles.headerCard} elevation={1}>
        <View style={styles.profileRow}>
          {/* Max 64px avatar */}
          <Image 
            source={{ uri: sellerPhoto || DEFAULT_AVATAR }} 
            style={styles.avatarImg}
            resizeMode="cover"
          />

          {/* Streamlined single column info */}
          <View style={styles.infoCol}>
            <View style={styles.nameRow}>
              <Text 
                variant="titleMedium" 
                style={styles.sellerName}
              >
                {sellerName}
              </Text>
              <Icon name="checkmark-circle" size={16} color="#1565FF" style={{ marginLeft: 4 }} />
            </View>
            <View style={styles.metaRow}>
              <Icon name="location-outline" size={12} color="#64748B" />
              <Text 
                style={styles.metaText}
              >
                {sellerLocation}
              </Text>
              <Text style={styles.metaDot}>•</Text>
              <Icon name="calendar-outline" size={12} color="#64748B" />
              <Text style={styles.metaText}>Member 2026</Text>
            </View>
          </View>
        </View>

        {/* 2. Social Metrics Row: Followers, Following, Active Listings */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricNumber}>{followersCount}</Text>
            <Text style={styles.metricLabel}>Followers</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricNumber}>{followingCount}</Text>
            <Text style={styles.metricLabel}>Following</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricNumber, { color: '#1565FF' }]}>{activeListings.length}</Text>
            <Text style={styles.metricLabel}>Active Parts</Text>
          </View>
        </View>

        {/* 3. Dynamic Action Buttons Row (Follow + Chat) */}
        {!isOwnProfile && (
          <View style={styles.actionRow}>
            <Button
              mode={isFollowing ? 'outlined' : 'contained'}
              onPress={handleToggleFollow}
              loading={followLoading}
              buttonColor={isFollowing ? undefined : '#1565FF'}
              textColor={isFollowing ? '#0F172A' : '#FFFFFF'}
              style={styles.actionBtn}
              icon={isFollowing ? 'account-check' : 'account-plus'}
              compact
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
            <Button
              mode="contained"
              onPress={handleStartChat}
              buttonColor="#0B1220"
              textColor="#FFFFFF"
              style={styles.actionBtn}
              icon="chat"
              compact
            >
              Chat
            </Button>
          </View>
        )}
      </Surface>

      {/* 4. Active Listings Feed directly under action bar */}
      <View style={styles.listingsSection}>
        <Text variant="titleSmall" style={styles.sectionHeading}>
          ACTIVE LISTINGS ({activeListings.length})
        </Text>

        {loading ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#1565FF" />
          </View>
        ) : activeListings.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={0}>
            <Icon name="cube-outline" size={32} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No active spare parts listed</Text>
            <Text style={styles.emptySub}>Follow this seller to get notified about future parts.</Text>
          </Surface>
        ) : (
          <View style={styles.grid}>
            {activeListings.map((part) => (
              <TouchableOpacity
                key={part.id}
                style={styles.partCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ProductDetail', { part })}
              >
                <Image
                  source={{ uri: part.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=300' }}
                  style={styles.partImage}
                />
                <View style={styles.partInfo}>
                  <Text style={styles.partTitle} numberOfLines={2}>{part.title}</Text>
                  <Text style={styles.partBrand} numberOfLines={1}>{part.carBrand} {part.carModel}</Text>
                  <Text style={styles.partPrice}>₹{Number(part.price || 0).toLocaleString('en-IN')}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerCard: {
    margin: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    padding: 0,
    margin: 0,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerName: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 3,
  },
  metaDot: {
    color: '#CBD5E1',
    marginHorizontal: 4,
    fontSize: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flex: 1,
    borderRadius: 8,
  },
  listingsSection: {
    paddingHorizontal: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  partCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0F172A',
  },
  partInfo: {
    padding: 8,
  },
  partTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0F172A',
    lineHeight: 15,
  },
  partBrand: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  partPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1565FF',
    marginTop: 4,
  },
});
