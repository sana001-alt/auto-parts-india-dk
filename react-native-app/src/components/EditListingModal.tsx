import React, { useState, useEffect } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Portal, Modal as PaperModal } from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { doc, updateDoc, getDoc, db } from '../services/firebase';
import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../services/cloudinary';

export interface EditListingModalProps {
  visible: boolean;
  onClose: () => void;
  listing: any;
  onSuccess?: () => void;
}

export const EditListingModal: React.FC<EditListingModalProps> = ({
  visible,
  onClose,
  listing,
  onSuccess,
}) => {
  const mainModalVisible = visible;
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [carBrand, setCarBrand] = useState('');
  const [carModel, setCarModel] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('Used');
  const [location, setLocation] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [saving, setSaving] = useState(false);

  const [loadingLatest, setLoadingLatest] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchLatest = async () => {
      if (visible && listing?.id) {
        setLoadingLatest(true);
        try {
          const docRef = doc(db, 'spareParts', listing.id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && isMounted) {
            const data = docSnap.data();
            setTitle(data.title || '');
            setPrice(data.price ? String(data.price) : '');
            setCarBrand(data.carBrand || '');
            setCarModel(data.carModel || '');
            setCategory(data.category || 'Engine Components');
            setCondition(data.condition || 'Used');
            setLocation(data.location || '');
            setContactName(data.contactName || '');
            setContactPhone(data.contactPhone || '');
            setDescription(data.description || '');
            setImages(data.imageUrls || (data.imageUrl ? [data.imageUrl] : []));
          }
        } catch (err) {
          console.warn('[EditListingModal] Error fetching latest data:', err);
        } finally {
          if (isMounted) setLoadingLatest(false);
        }
      }
    };
 
    if (visible) {
      // First populate with passed listing as fallback
      if (listing) {
        setTitle(listing.title || '');
        setPrice(listing.price ? String(listing.price) : '');
        setCarBrand(listing.carBrand || '');
        setCarModel(listing.carModel || '');
        setCategory(listing.category || 'Engine Components');
        setCondition(listing.condition || 'Used');
        setLocation(listing.location || '');
        setContactName(listing.contactName || '');
        setContactPhone(listing.contactPhone || '');
        setDescription(listing.description || '');
        setImages(listing.imageUrls || (listing.imageUrl ? [listing.imageUrl] : []));
      }
      // Then fetch latest from Firestore
      fetchLatest();
    }
    
    return () => {
      isMounted = false;
    };
  }, [visible, listing]);

  const handleLaunchPicker = async (type: 'camera' | 'gallery') => {
    setShowActionSheet(false);
    if (images.length >= 6) {
      Alert.alert('Limit Reached', 'Maximum 6 photos allowed.');
      return;
    }

    if (type === 'camera' && Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Camera access is required.');
        return;
      }
    }

    const options = {
      mediaType: 'photo' as const,
      quality: 0.8,
      selectionLimit: type === 'gallery' ? 6 - images.length : 1,
    };

    try {
      const result = type === 'camera' 
        ? await launchCamera(options)
        : await launchImageLibrary(options);

      if (result.assets) {
        const newUris = result.assets.map(a => a.uri).filter(Boolean) as string[];
        setImages(prev => [...prev, ...newUris].slice(0, 6));
      }
    } catch (err) {
      console.warn('[EditListingModal] Picker error:', err);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim() || !price.trim() || !carBrand.trim()) {
      Alert.alert('Validation Error', 'Title, Price, and Brand are required fields.');
      return;
    }

    if (!listing?.id) {
      Alert.alert('Error', 'Listing ID not found.');
      return;
    }

    setSaving(true);
    try {
      const uploadedUrls = await Promise.all(
        images.map(async (uri) => {
          if (uri.startsWith('http')) return uri;
          return await uploadImageToCloudinary(uri, 'spare_parts');
        })
      );

      const mainImage = uploadedUrls[0] || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=400';

      const listingRef = doc(db, 'spareParts', listing.id);
      const updatePayload: any = {
        title: title.trim(),
        price: Number(price) || 0,
        carBrand: carBrand.trim(),
        carModel: carModel.trim(),
        category,
        condition,
        location: location.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        description: description.trim(),
        imageUrl: mainImage,
        imageUrls: uploadedUrls,
        updatedAt: Date.now(),
      };

      // Sync image arrays for Web compatibility
      updatePayload.imageUrls = [finalImageUrl];
      updatePayload.images = [finalImageUrl];

      await updateDoc(listingRef, updatePayload);

      Alert.alert('Success', 'Listing updated successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.warn('[EditListingModal] Update error:', err);
      Alert.alert('Update Failed', err.message || 'Failed to update listing.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RNModal visible={mainModalVisible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Edit Part Listing</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
            {/* Multi-Image Upload Section */}
            <View style={styles.imageEditSection}>
              <Text style={styles.label}>Listing Photos ({images.length}/6)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.thumbnail} />
                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 6 && (
                  <TouchableOpacity 
                    style={styles.photoPickerPlaceholder}
                    onPress={() => setShowActionSheet(true)}
                  >
                    <Ionicons name="camera-outline" size={32} color="#CBD5E1" />
                  </TouchableOpacity>
                )}
              </ScrollView>

              {images.length > 0 && images.length < 6 && (
                <TouchableOpacity 
                  style={styles.addMoreBtn} 
                  onPress={() => setShowActionSheet(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#1565FF" />
                  <Text style={styles.addMoreBtnText}>Add More Photos</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Title */}
            <Text style={styles.label}>Listing Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Maruti Swift Brake Caliper"
              placeholderTextColor="#94A3B8"
            />

            {/* Price */}
            <Text style={styles.label}>Price (₹) *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="e.g. 3500"
              placeholderTextColor="#94A3B8"
            />

            {/* Car Brand & Model */}
            <View style={styles.row}>
              <View style={styles.flexHalf}>
                <Text style={styles.label}>Brand *</Text>
                <TextInput
                  style={styles.input}
                  value={carBrand}
                  onChangeText={setCarBrand}
                  placeholder="e.g. Maruti"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={[styles.flexHalf, { marginLeft: 12 }]}>
                <Text style={styles.label}>Model</Text>
                <TextInput
                  style={styles.input}
                  value={carModel}
                  onChangeText={setCarModel}
                  placeholder="e.g. Swift"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Category */}
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {['Engine Components', 'Body Parts', 'Electrical & Lights', 'Brakes & Suspension', 'Transmission', 'Interior Accessories', 'Wheels & Tyres'].map((cat) => (
                <TouchableOpacity 
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Condition */}
            <Text style={styles.label}>Condition</Text>
            <View style={styles.conditionRow}>
              {['Brand New', 'Like New', 'Used (Good)'].map((cond) => (
                <TouchableOpacity 
                  key={cond}
                  style={[styles.condBtn, condition === cond && styles.condBtnActive]}
                  onPress={() => setCondition(cond)}
                >
                  <Text style={[styles.condText, condition === cond && styles.condTextActive]}>{cond}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Location */}
            <Text style={styles.label}>Location / City</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Mumbai, MH"
              placeholderTextColor="#94A3B8"
            />

            {/* Contact Name */}
            <Text style={styles.label}>Contact Name</Text>
            <TextInput
              style={styles.input}
              value={contactName}
              onChangeText={setContactName}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor="#94A3B8"
            />

            {/* Phone */}
            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              placeholder="+91 9876543210"
              placeholderTextColor="#94A3B8"
            />

            {/* Description */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholder="Item condition, fitment notes, OEM part number"
              placeholderTextColor="#94A3B8"
            />

            {/* Action Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Action Sheet - Uses Portal to escape parent Modal constraints */}
        <Portal>
          <PaperModal 
            visible={showActionSheet} 
            onDismiss={() => setShowActionSheet(false)}
            contentContainerStyle={styles.actionSheet}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Upload Photos</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.sheetOption} 
              onPress={() => handleLaunchPicker('camera')}
            >
              <Ionicons name="camera" size={24} color="#1565FF" />
              <Text style={styles.sheetOptionText}>📷 Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sheetOption} 
              onPress={() => handleLaunchPicker('gallery')}
            >
              <Ionicons name="image" size={24} color="#10B981" />
              <Text style={styles.sheetOptionText}>🖼️ Choose from Gallery</Text>
            </TouchableOpacity>

            <View style={styles.sheetDivider} />

            <TouchableOpacity 
              style={styles.sheetCancel} 
              onPress={() => setShowActionSheet(false)}
            >
              <Text style={styles.sheetCancelText}>❌ Cancel</Text>
            </TouchableOpacity>
          </PaperModal>
        </Portal>
      </View>
    </RNModal>
  );
};

export default EditListingModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.7)',
  },
  modalCard: {
    flex: 1,
    marginTop: '15%',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0B1220',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  imageEditSection: {
    marginBottom: 20,
  },
  imageScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  photoPickerPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    gap: 6,
    marginTop: 8,
  },
  addMoreBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1565FF',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingHorizontal: 20,
    marginTop: 'auto',
    marginBottom: 0,
    width: '100%',
  },
  sheetHeader: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 8,
  },
  sheetTitle: {
    color: '#0B1220',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  sheetOptionText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  sheetCancelText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: 'bold',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flexHalf: {
    flex: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1565FF',
  },
  chipText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#1565FF',
    fontWeight: '600',
  },
  conditionRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  condBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  condBtnActive: {
    backgroundColor: '#1565FF',
    borderColor: '#1565FF',
  },
  condText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  condTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1565FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
