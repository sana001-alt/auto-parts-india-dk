import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, SegmentedButtons } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  db,
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from '../services/firebase';
import EditListingModal from '../components/EditListingModal';
import { DEFAULT_AVATAR } from '../constants';

export default function AdminScreen({ navigation }: any) {
  const [tab, setTab] = useState('listings');
  const [listings, setListings] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    // Listen to spareParts
    const qListings = query(collection(db, 'spareParts'), orderBy('createdAt', 'desc'));
    const unsubListings = onSnapshot(qListings, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setListings(list);
      setLoading(false);
    });

    // Listen to banners
    const qBanners = collection(db, 'banners');
    const unsubBanners = onSnapshot(qBanners, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setBanners(list);
    });

    // Listen to users
    const qUsers = collection(db, 'users');
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setUsers(list);
    });

    return () => {
      unsubListings();
      unsubBanners();
      unsubUsers();
    };
  }, []);

  const handleToggleApprove = async (item: any) => {
    try {
      const itemRef = doc(db, 'spareParts', item.id);
      const newStatus = item.approved === false ? true : false;
      await updateDoc(itemRef, {
        approved: newStatus,
        verified: newStatus,
        status: newStatus ? 'approved' : 'pending',
      });
      Alert.alert('Status Updated', `Listing is now ${newStatus ? 'Approved' : 'Pending'}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update approval');
    }
  };

  const handleDeleteListing = (id: string, title: string) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete "${title}"? This action is permanent.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'spareParts', id));
              Alert.alert('Deleted', 'Listing removed from marketplace.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete listing.');
            }
          },
        },
      ]
    );
  };

  const handleToggleBanner = async (banner: any) => {
    try {
      const bannerRef = doc(db, 'banners', banner.id);
      const newActive = banner.active === false ? true : false;
      await updateDoc(bannerRef, {
        active: newActive,
        activeStatus: newActive,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update banner.');
    }
  };

  const renderListingCard = ({ item }: { item: any }) => (
    <View style={styles.listingCard}>
      <Image
        source={{
          uri:
            item.imageUrl ||
            'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=300',
        }}
        style={styles.listingImage}
      />
      <View style={styles.listingInfo}>
        <View style={styles.cardHeader}>
          <Text style={styles.listingTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.approved !== false ? '#DCFCE7' : '#FEF3C7' },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: item.approved !== false ? '#15803D' : '#B45309' },
              ]}
            >
              {item.approved !== false ? 'Approved' : 'Pending'}
            </Text>
          </View>
        </View>

        <Text style={styles.listingMeta}>
          {item.carBrand} {item.carModel} • ₹{item.price?.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.listingSeller} numberOfLines={1}>
          Seller: {item.contactName || item.sellerEmail || 'Unknown'}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: item.approved !== false ? '#FEF3C7' : '#DCFCE7' },
            ]}
            onPress={() => handleToggleApprove(item)}
          >
            <Ionicons
              name={item.approved !== false ? 'close-circle-outline' : 'checkmark-circle-outline'}
              size={15}
              color={item.approved !== false ? '#B45309' : '#15803D'}
            />
            <Text
              style={[
                styles.actionBtnText,
                { color: item.approved !== false ? '#B45309' : '#15803D' },
              ]}
            >
              {item.approved !== false ? 'Unapprove' : 'Approve'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EFF6FF' }]}
            onPress={() => {
              setSelectedListing(item);
              setEditModalVisible(true);
            }}
          >
            <Ionicons name="create-outline" size={15} color="#1565FF" />
            <Text style={[styles.actionBtnText, { color: '#1565FF' }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
            onPress={() => handleDeleteListing(item.id, item.title)}
          >
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
            <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Moderation</Text>
        <Text style={styles.subtitle}>Manage marketplace listings, users, and banners</Text>
      </View>

      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'listings', label: `Listings (${listings.length})` },
          { value: 'banners', label: `Banners (${banners.length})` },
          { value: 'users', label: `Users (${users.length})` },
        ]}
        style={styles.segmented}
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1565FF" />
        </View>
      ) : tab === 'listings' ? (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderListingCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No listings found in database.</Text>
            </View>
          }
        />
      ) : tab === 'banners' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {banners.map((b) => (
            <View key={b.id} style={styles.bannerItem}>
              {b.imageUrl ? (
                <Image source={{ uri: b.imageUrl }} style={styles.bannerImage} />
              ) : (
                <View style={[styles.bannerImage, { backgroundColor: '#1E293B' }]} />
              )}
              <View style={styles.bannerInfo}>
                <Text style={styles.bannerTitle}>{b.title}</Text>
                <Text style={styles.bannerSubtitle}>{b.subtitle || 'No subtitle'}</Text>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: b.active !== false ? '#DCFCE7' : '#F1F5F9' },
                  ]}
                  onPress={() => handleToggleBanner(b)}
                >
                  <Ionicons
                    name={b.active !== false ? 'radio-button-on' : 'radio-button-off'}
                    size={14}
                    color={b.active !== false ? '#15803D' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      { color: b.active !== false ? '#15803D' : '#64748B' },
                    ]}
                  >
                    {b.active !== false ? 'Active Carousel' : 'Inactive'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {banners.length === 0 && (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No banners configured in Firestore.</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {users.map((u) => (
            <View key={u.id} style={styles.userCard}>
              <Image 
                source={{ uri: u.photoURL || u.profilePhoto || DEFAULT_AVATAR }} 
                style={styles.userAvatarImg}
                resizeMode="cover"
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.userName}>{u.name || u.email || 'Registered User'}</Text>
                <Text style={styles.userMeta}>Email: {u.email || 'N/A'}</Text>
                {u.phone && <Text style={styles.userMeta}>Phone: {u.phone}</Text>}
              </View>
            </View>
          ))}
          {users.length === 0 && (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No users registered yet.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Edit Listing Modal */}
      {selectedListing && (
        <EditListingModal
          visible={editModalVisible}
          onClose={() => {
            setEditModalVisible(false);
            setSelectedListing(null);
          }}
          listing={selectedListing}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 16,
    backgroundColor: '#0B1220',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  segmented: {
    margin: 14,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  listingInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  listingMeta: {
    fontSize: 12,
    color: '#1565FF',
    fontWeight: '600',
    marginTop: 2,
  },
  listingSeller: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bannerItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bannerImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  bannerInfo: {
    marginTop: 4,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    gap: 4,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userAvatarImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    padding: 0,
    margin: 0,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  userMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  centerContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
});

