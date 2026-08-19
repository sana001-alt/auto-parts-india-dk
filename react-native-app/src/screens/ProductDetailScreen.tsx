import React, { useState, useEffect } from 'react';
import { View, ScrollView, Image, StyleSheet, Linking, Alert, Share, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Card, Avatar, Divider, Chip, IconButton, useTheme } from 'react-native-paper';
import GMap from '../components/GMap';
import { EditListingModal } from '../components/EditListingModal';
import { doc, deleteDoc, db, onSnapshot, setDoc } from '../services/firebase';
import { deleteImageFromCloudinary } from '../services/cloudinary';
import { DEFAULT_AVATAR } from '../constants';

export default function ProductDetailScreen({ route, navigation, user }: any) {
  const { part: initialPart } = route.params || {};
  const [part, setPart] = useState<any>(initialPart);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (initialPart?.id) {
      setPart(initialPart);
      setSelectedImage(initialPart.imageUrl || null);
      const unsub = onSnapshot(doc(db, 'spareParts', initialPart.id), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPart({ id: docSnap.id, ...data });
          if (!selectedImage) setSelectedImage(data.imageUrl || null);
        }
      }, (err) => {
        console.warn('[ProductDetailScreen] Realtime sync error:', err);
      });
      return () => unsub();
    }
  }, [initialPart?.id]);

  if (!part) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="titleMedium">Spare part details not available.</Text>
        <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          Go Back
        </Button>
      </View>
    );
  }

  // Determine ownership using the authenticated user's ID/UID and listing's owner/seller ID
  const currentUserId = user?.uid || user?.id || null;
  const listingOwnerId = part.ownerId || part.sellerId || part.userId || null;
  const isOwner = Boolean(currentUserId && listingOwnerId && String(currentUserId) === String(listingOwnerId));

  const handleCall = () => {
    if (part.contactPhone) {
      Linking.openURL(`tel:${part.contactPhone}`);
    } else {
      Alert.alert('Contact', 'Phone number not listed for this seller.');
    }
  };

  const handleChat = async () => {
    if (!user) {
      navigation.navigate('Auth');
      return;
    }
    const currentUid = user.uid || user.id;
    const sellerUid = part.sellerId || part.userId || part.ownerId || 'seller';
    const chatId = `${part.id}_${currentUid}_${sellerUid}`;
    
    try {
      const chatDocRef = doc(db, 'chats', chatId);
      await setDoc(chatDocRef, {
        id: chatId,
        partId: part.id,
        partTitle: part.title || 'Spare Part',
        partImageUrl: part.imageUrl || '',
        partPrice: part.price || 0,
        buyerId: currentUid,
        buyerName: user.displayName || user.name || user.email || 'Buyer',
        sellerId: sellerUid,
        sellerName: part.contactName || part.sellerName || 'Seller',
        participants: [currentUid, sellerUid],
        lastMessageText: '',
        lastMessageAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.warn('[ProductDetailScreen] Pre-creating chat doc:', e);
    }

    navigation.navigate('ChatRoom', { chatId, part });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: part.title,
        message: `Check out this spare part on Auto Parts India: ${part.title} for ₹${part.price?.toLocaleString('en-IN')}`,
      });
    } catch (error) {
      console.warn('Share error:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to permanently delete this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              if (part.id) {
                if (part.imageUrl) {
                  await deleteImageFromCloudinary(part.imageUrl);
                }
                await deleteDoc(doc(db, 'spareParts', part.id));
              }
              Alert.alert('Listing Deleted', 'Your spare part listing has been permanently deleted.');
              navigation.goBack();
            } catch (err: any) {
              console.warn('[ProductDetailScreen] Delete error:', err);
              Alert.alert('Error', err.message || 'Failed to delete listing. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.imageHeader}>
        <Image 
          source={{ uri: selectedImage || part.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=800' }} 
          style={styles.image} 
        />
        <TouchableOpacity style={styles.shareFab} onPress={handleShare}>
          <IconButton icon="share-variant" iconColor="#0B1220" size={20} />
        </TouchableOpacity>
      </View>

      {/* Thumbnails for multiple images */}
      {part.imageUrls && part.imageUrls.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailList}>
          {part.imageUrls.map((url: string, index: number) => (
            <TouchableOpacity 
              key={index} 
              onPress={() => setSelectedImage(url)}
              style={[styles.thumbnailItem, selectedImage === url && styles.thumbnailActive]}
            >
              <Image source={{ uri: url }} style={styles.thumbnailImg} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>{part.title}</Text>
        <Text variant="headlineMedium" style={styles.price}>₹{part.price?.toLocaleString('en-IN')}</Text>

        <View style={styles.badgeRow}>
          <Chip icon="car" style={styles.chip}>{part.carBrand} {part.carModel}</Chip>
          <Chip icon="shape" style={styles.chip}>{part.category}</Chip>
          <Chip icon="checkbox-marked-circle-outline" style={styles.chip}>{part.condition || 'Used'}</Chip>
          <Chip icon="map-marker" style={styles.chip}>{part.location || 'India'}</Chip>
        </View>

        <Divider style={styles.divider} />

        <Text variant="titleMedium" style={styles.sectionTitle}>Part Specifications</Text>
        <View style={styles.specGrid}>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Brand</Text>
            <Text style={styles.specVal}>{part.carBrand || 'N/A'}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Model</Text>
            <Text style={styles.specVal}>{part.carModel || 'N/A'}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Condition</Text>
            <Text style={styles.specVal}>{part.condition || 'Used'}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specLabel}>Part No.</Text>
            <Text style={styles.specVal}>{part.partNumber || 'Original OEM'}</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <Text variant="titleMedium" style={styles.sectionTitle}>Description</Text>
        <Text variant="bodyMedium" style={styles.description}>
          {part.description || 'Verified auto part available for immediate purchase or pickup. Contact seller for fitment details and compatibility.'}
        </Text>

        <Divider style={styles.divider} />

        <Text variant="titleMedium" style={styles.sectionTitle}>Seller Location Map</Text>
        <GMap
          latitude={part.latitude || part.lat || 19.0760}
          longitude={part.longitude || part.lng || 72.8777}
          title={`${part.title} - ${part.location || 'India'}`}
          interactive={false}
          style={{ marginBottom: 16 }}
        />

        <Divider style={styles.divider} />

        <Text variant="titleMedium" style={styles.sectionTitle}>Seller Information</Text>
        <Card style={styles.sellerCard}>
          <Card.Title
            title={part.contactName || part.sellerEmail || 'Verified Parts Dealer'}
            subtitle={`📍 ${part.location || 'India'} • Verified Vendor`}
            left={(props) => {
              const photo = part.sellerPhotoURL || part.sellerPhoto;
              return (
                <Image 
                  source={{ uri: photo || DEFAULT_AVATAR }} 
                  style={styles.sellerAvatar}
                  resizeMode="cover"
                />
              );
            }}
            right={(props) => (
              <IconButton 
                {...props} 
                icon="chevron-right" 
                onPress={() => navigation.navigate('SellerProfile', { seller: { name: part.contactName, location: part.location, sellerId: part.sellerId || part.userId } })} 
              />
            )}
          />
        </Card>

        {/* Action Row: Owner (Edit/Delete) vs Buyer (Chat/Call) */}
        {isOwner ? (
          <View style={styles.actionRow}>
            <Button 
              mode="contained" 
              icon="pencil" 
              onPress={() => setEditModalVisible(true)} 
              style={[styles.actionBtn, { flex: 1, marginRight: 8 }]}
              buttonColor="#4F46E5"
              textColor="#FFFFFF"
              disabled={isDeleting}
            >
              Edit Listing
            </Button>
            <Button 
              mode="contained" 
              icon="delete-outline" 
              onPress={handleDelete} 
              style={[styles.actionBtn, { flex: 1 }]}
              buttonColor="#DC2626"
              textColor="#FFFFFF"
              loading={isDeleting}
              disabled={isDeleting}
            >
              Delete Listing
            </Button>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Button 
              mode="contained" 
              icon="message" 
              onPress={handleChat} 
              style={[styles.actionBtn, { flex: 1, marginRight: 8 }]}
              buttonColor="#1565FF"
              textColor="#FFFFFF"
            >
              Chat
            </Button>
            <Button 
              mode="outlined" 
              icon="phone" 
              onPress={handleCall} 
              style={[styles.actionBtn, { flex: 1 }]}
              textColor="#1565FF"
            >
              Call Seller
            </Button>
          </View>
        )}
      </View>
      </ScrollView>

      {/* Edit Listing Modal for Owner */}
      {isOwner && (
        <EditListingModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          listing={part}
          onSuccess={() => {
            setEditModalVisible(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageHeader: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 280,
  },
  shareFab: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 4,
  },
  thumbnailList: {
    padding: 12,
    gap: 8,
  },
  thumbnailItem: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: '#1565FF',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    color: '#0B1220',
  },
  price: {
    color: '#1565FF',
    fontWeight: 'bold',
    marginVertical: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  chip: {
    backgroundColor: '#F1F5F9',
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#0B1220',
    marginBottom: 8,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  specItem: {
    width: '50%',
    marginVertical: 6,
  },
  specLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  specVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0B1220',
  },
  description: {
    color: '#475569',
    lineHeight: 22,
  },
  sellerCard: {
    backgroundColor: '#F8FAFC',
    marginVertical: 8,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    padding: 0,
    margin: 0,
    marginLeft: 8,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 32,
  },
  actionBtn: {
    paddingVertical: 4,
  },
  errorContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
