import React, { useState } from 'react';
import { View, ScrollView, Image, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  TextInput, 
  Button, 
  Text, 
  SegmentedButtons, 
  Chip, 
  Divider, 
  IconButton, 
  useTheme, 
  ActivityIndicator,
  Portal,
  Modal
} from 'react-native-paper';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { PermissionsAndroid, Platform } from 'react-native';
import { db, collection, addDoc } from '../services/firebase';
import { uploadImageToCloudinary } from '../services/cloudinary';
import { getCurrentLocation, reverseGeocodeOSM } from '../services/location';

export default function SellPartScreen({ navigation, user }: any) {
  const [title, setTitle] = useState('');
  const [carBrand, setCarBrand] = useState('');
  const [carModel, setCarModel] = useState('');
  const [category, setCategory] = useState('Engine Components');
  const [condition, setCondition] = useState('Brand New');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('Mumbai');
  const [contactName, setContactName] = useState(user?.displayName || user?.email?.split('@')[0] || '');
  const [contactPhone, setContactPhone] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const categories = [
    'Engine Components', 'Body Parts', 'Electrical & Lights', 
    'Brakes & Suspension', 'Transmission', 'Interior Accessories', 'Wheels & Tyres'
  ];

  const popularBrands = [
    'Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Toyota', 'Honda', 'Kia', 'Ford'
  ];

  const handleLaunchPicker = async (type: 'camera' | 'gallery') => {
    setShowActionSheet(false);
    if (images.length >= 6) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 6 photos.');
      return;
    }

    if (type === 'camera' && Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'Auto Parts India needs access to your camera to take photos of your spare parts.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
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
        const newUris = result.assets.map(asset => asset.uri).filter(Boolean) as string[];
        setImages(prev => [...prev, ...newUris].slice(0, 6));
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDetectLocation = async () => {
    setLocLoading(true);
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        const geo = await reverseGeocodeOSM(coords.latitude, coords.longitude);
        if (geo?.city) {
          setLocation(`${geo.city}, ${geo.state}`);
        }
      }
    } catch (err) {
      console.warn('GPS location error:', err);
    } finally {
      setLocLoading(false);
    }
  };

  const handleSubmit = async () => {
    const cleanPrice = String(price).replace(/[^0-9.]/g, '');
    if (!title || !carBrand || !carModel || !cleanPrice || Number(cleanPrice) <= 0) {
      Alert.alert('Required Fields', 'Please fill in Part Title, Car Brand, Car Model, and a valid Price.');
      return;
    }

    setLoading(true);
    try {
      const uploadedUrls = await Promise.all(
        images.map(async (uri) => {
          if (uri.startsWith('http')) return uri;
          return await uploadImageToCloudinary(uri, 'spare_parts');
        })
      );

      const mainImage = uploadedUrls[0] || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=400';

      await addDoc(collection(db, 'spareParts'), {
        title,
        carBrand,
        carModel,
        category,
        condition,
        price: Number(cleanPrice),
        location,
        contactName,
        contactPhone,
        description,
        imageUrl: mainImage,
        imageUrls: uploadedUrls,
        sellerId: user?.uid || 'guest',
        sellerEmail: user?.email || '',
        createdAt: Date.now(),
        approved: true,
        verified: true,
      });

      Alert.alert('Success', 'Your spare part listing has been published!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text variant="headlineSmall" style={styles.title}>List Spare Part</Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Reach thousands of buyers & mechanics across India
        </Text>

      {/* Multi-Image Upload Section */}
      <View style={styles.imageSection}>
        <Text variant="titleSmall" style={styles.label}>Photos ({images.length}/6) *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                <IconButton icon="close-circle" size={20} iconColor="#EF4444" style={{ margin: 0 }} />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 6 && (
            <TouchableOpacity 
              style={styles.photoPickerPlaceholder} 
              onPress={() => setShowActionSheet(true)}
            >
              <IconButton icon="camera-plus" size={32} iconColor="#1565FF" />
            </TouchableOpacity>
          )}
        </ScrollView>

        {images.length > 0 && images.length < 6 && (
          <Button 
            mode="outlined" 
            onPress={() => setShowActionSheet(true)} 
            icon="plus-box"
            style={styles.addMoreBtn}
            textColor="#1565FF"
          >
            Add More Photos
          </Button>
        )}
      </View>

      <TextInput
        label="Part Title *"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        placeholder="e.g. Maruti Swift Front Brake Pads"
        style={styles.input}
      />

      <Text variant="titleSmall" style={styles.label}>Select Car Brand *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {popularBrands.map((brand) => (
          <Chip
            key={brand}
            selected={carBrand === brand}
            onPress={() => setCarBrand(brand)}
            style={styles.brandChip}
          >
            {brand}
          </Chip>
        ))}
      </ScrollView>

      <TextInput
        label="Car Model *"
        value={carModel}
        onChangeText={setCarModel}
        mode="outlined"
        placeholder="e.g. Swift, Creta, i20, Scorpio"
        style={styles.input}
      />

      <TouchableOpacity onPress={() => setShowCategoryModal(true)} style={styles.categorySelectBtn}>
        <Text style={{ color: '#0F172A', fontWeight: '500' }}>Category: {category}</Text>
        <Text style={{ color: '#1565FF' }}>Change ▾</Text>
      </TouchableOpacity>

      <TextInput
        label="Price (₹) *"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        mode="outlined"
        placeholder="e.g. 2500"
        style={styles.input}
      />

      <Text variant="titleSmall" style={styles.label}>Condition</Text>
      <SegmentedButtons
        value={condition}
        onValueChange={setCondition}
        buttons={[
          { value: 'Brand New', label: 'New' },
          { value: 'Like New', label: 'Like New' },
          { value: 'Used (Good)', label: 'Used' },
        ]}
        style={styles.segmented}
      />

      <View style={styles.locationContainer}>
        <TextInput
          label="City / Location"
          value={location}
          onChangeText={setLocation}
          mode="outlined"
          placeholder="e.g. Mumbai, Maharashtra"
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
        />
        <TouchableOpacity 
          style={styles.gpsBtn} 
          onPress={handleDetectLocation}
          disabled={locLoading}
        >
          {locLoading ? (
            <ActivityIndicator size={18} color="#1565FF" />
          ) : (
            <IconButton icon="crosshairs-gps" size={20} iconColor="#1565FF" style={{ margin: 0 }} />
          )}
        </TouchableOpacity>
      </View>

      <TextInput
        label="Contact Name"
        value={contactName}
        onChangeText={setContactName}
        mode="outlined"
        style={[styles.input, { marginTop: 12 }]}
      />

      <TextInput
        label="Contact Phone Number"
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
        mode="outlined"
        placeholder="+91 9876543210"
        style={styles.input}
      />

      <TextInput
        label="Description & Fitment Notes"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        mode="outlined"
        placeholder="Mention part OEM number, condition details, or fitment compatibility"
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        buttonColor="#1565FF"
        style={styles.submitButton}
      >
        Publish Listing
      </Button>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="titleLarge" style={styles.modalTitle}>Select Category</Text>
            <Divider style={{ marginVertical: 12 }} />
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={styles.catItem}
                onPress={() => {
                  setCategory(cat);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[styles.catText, category === cat && { color: '#1565FF', fontWeight: 'bold' }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
            <Button mode="contained" buttonColor="#0F172A" onPress={() => setShowCategoryModal(false)} style={{ marginTop: 16 }}>
              Close
            </Button>
          </View>
        </View>
      </Modal>
      </ScrollView>

      {/* Action Sheet Portal - Moved outside ScrollView for correct rendering */}
      <Portal>
        <Modal
          visible={showActionSheet}
          onDismiss={() => setShowActionSheet(false)}
          contentContainerStyle={styles.actionSheet}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHandle} />
            <Text variant="titleMedium" style={styles.sheetTitle}>Upload Photos</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.sheetOption} 
            onPress={() => handleLaunchPicker('camera')}
          >
            <IconButton icon="camera" size={24} iconColor="#1565FF" />
            <Text style={styles.sheetOptionText}>📷 Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.sheetOption} 
            onPress={() => handleLaunchPicker('gallery')}
          >
            <IconButton icon="image" size={24} iconColor="#10B981" />
            <Text style={styles.sheetOptionText}>🖼️ Choose from Gallery</Text>
          </TouchableOpacity>

          <Divider style={styles.sheetDivider} />

          <TouchableOpacity 
            style={styles.sheetCancel} 
            onPress={() => setShowActionSheet(false)}
          >
            <Text style={styles.sheetCancelText}>❌ Cancel</Text>
          </TouchableOpacity>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontWeight: 'bold',
    color: '#0B1220',
  },
  subtitle: {
    color: '#64748B',
    marginBottom: 16,
  },
  imageSection: {
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
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  photoPickerPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
    borderRadius: 8,
    borderColor: '#E2E8F0',
  },
  addMoreBtn: {
    marginTop: 8,
    borderRadius: 8,
    borderColor: '#E2E8F0',
  },
  actionSheet: {
    backgroundColor: '#FFFFFF',
    marginTop: 'auto',
    marginBottom: 0,
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingHorizontal: 8,
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
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    paddingVertical: 12,
  },
  sheetCancelText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsBtn: {
    height: 50,
    width: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: 'bold',
    color: '#0B1220',
    marginTop: 4,
    marginBottom: 8,
  },
  brandChip: {
    marginRight: 6,
    backgroundColor: '#F1F5F9',
  },
  categorySelectBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  segmented: {
    marginBottom: 16,
  },
  submitButton: {
    marginVertical: 16,
    paddingVertical: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  catItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  catText: {
    fontSize: 15,
    color: '#0F172A',
  },
});
