import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  PermissionsAndroid,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  List, 
  Button, 
  Divider, 
  IconButton, 
  Surface,
  Badge,
  useTheme,
  Portal,
  Modal
} from 'react-native-paper';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { 
  auth, 
  db, 
  doc, 
  setDoc, 
  onSnapshot, 
  signOut, 
  updateProfile, 
  serverTimestamp,
  updateDoc
} from '../services/firebase';
import { uploadImageToCloudinary } from '../services/cloudinary';
import { UserProfile } from '../types';
import { DEFAULT_AVATAR } from '../constants';

export default function ProfileScreen({ navigation, user: initialUser }: any) {
  const theme = useTheme();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const currentAuthUser = auth.currentUser || initialUser;

  // 1. Real-time Profile Sync via Firestore onSnapshot
  useEffect(() => {
    if (!currentAuthUser?.uid) {
      setProfileData(null);
      return;
    }

    const userDocRef = doc(db, 'users', currentAuthUser.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData({
            id: docSnap.id,
            email: data.email || currentAuthUser.email || '',
            name: data.name || data.displayName || currentAuthUser.displayName || '',
            displayName: data.displayName || data.name || currentAuthUser.displayName || '',
            photoURL: data.photoURL || currentAuthUser.photoURL || '',
            phone: data.phone || '',
            role: data.role || 'buyer',
            createdAt: data.createdAt,
          });
          setCacheBuster(Date.now());
        } else {
          // Initialize user profile fallback if document doesn't exist yet
          setProfileData({
            id: currentAuthUser.uid,
            email: currentAuthUser.email || '',
            name: currentAuthUser.displayName || '',
            displayName: currentAuthUser.displayName || '',
            photoURL: currentAuthUser.photoURL || '',
            role: 'buyer',
          });
        }
      },
      (error) => {
        console.warn('[ProfileScreen] Firestore onSnapshot error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentAuthUser?.uid]);

  // 2. Photo Management Flow
  const handleUpdateProfilePhoto = () => {
    if (!currentAuthUser?.uid) {
      Alert.alert('Sign In Required', 'Please sign in to update your profile photo.');
      return;
    }
    setShowActionSheet(true);
  };

  const handleLaunchPicker = async (type: 'camera' | 'gallery') => {
    setShowActionSheet(false);

    if (type === 'camera' && Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Auto Parts India needs access to your camera to take a profile photo.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.DENIED) {
          Alert.alert('Permission Denied', 'Camera permission is required to take a photo.');
          return;
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            'Permission Required',
            'Camera permission has been permanently denied. Please enable it in your device settings to take a photo.'
          );
          return;
        }
      } catch (err) {
        console.warn('Permission request error:', err);
      }
    }

    const options = {
      mediaType: 'photo' as const,
      quality: 0.85,
      maxWidth: 1000,
      maxHeight: 1000,
      saveToPhotos: type === 'camera',
    };

    try {
      const result = type === 'camera' 
        ? await launchCamera(options)
        : await launchImageLibrary(options);

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to access camera/gallery.');
        return;
      }

      const selectedAsset = result.assets?.[0];
      if (selectedAsset?.uri) {
        setPreviewImage(selectedAsset.uri);
      }
    } catch (err: any) {
      console.warn('[ProfileScreen] Picker error:', err);
      Alert.alert('Error', 'An unexpected error occurred while picking image.');
    }
  };

  const handleRemovePhoto = async () => {
    if (!currentAuthUser?.uid) return;
    setShowActionSheet(false);

    Alert.alert(
      'Remove profile photo?',
      'Your profile photo will be replaced with the default avatar.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingPhoto(true);
              const userDocRef = doc(db, 'users', currentAuthUser.uid);
              await updateDoc(userDocRef, {
                photoURL: '',
                updatedAt: serverTimestamp(),
              });
              
              if (auth.currentUser) {
                await updateProfile(auth.currentUser, { photoURL: '' });
              }
              
              setCacheBuster(Date.now());
              Alert.alert('Success', 'Profile photo removed.');
            } catch (err: any) {
              Alert.alert('Error', 'Failed to remove photo.');
            } finally {
              setUploadingPhoto(false);
            }
          }
        }
      ]
    );
  };

  const handleSavePreview = async () => {
    if (!previewImage || !currentAuthUser?.uid) return;

    try {
      setUploadingPhoto(true);
      
      // Upload image to Cloudinary
      const uploadedUrl = await uploadImageToCloudinary(previewImage, 'avatars');

      // Update Firebase Auth Profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: uploadedUrl,
        });
      }

      // Update Firestore user document
      const userDocRef = doc(db, 'users', currentAuthUser.uid);
      await setDoc(
        userDocRef,
        {
          photoURL: uploadedUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setPreviewImage(null);
      setCacheBuster(Date.now());
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (err: any) {
      console.error('[ProfileScreen] Photo save error:', err);
      Alert.alert('Upload Failed', err.message || 'Could not update profile photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.navigate('Home');
    } catch (err: any) {
      console.warn('Sign out error:', err);
      Alert.alert('Error', 'Failed to sign out.');
    }
  };

  // Determine active photo URL with cache buster
  const rawPhoto = profileData?.photoURL || currentAuthUser?.photoURL;
  const displayPhotoUrl = rawPhoto
    ? `${rawPhoto}${rawPhoto.includes('?') ? '&' : '?'}t=${cacheBuster}`
    : DEFAULT_AVATAR;

  const displayName =
    profileData?.displayName ||
    profileData?.name ||
    currentAuthUser?.displayName ||
    currentAuthUser?.email?.split('@')[0] ||
    'Auto Parts Member';

  const userEmail = profileData?.email || currentAuthUser?.email || 'Not logged in';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header Profile Section */}
      <View style={styles.header}>
        <Image
          key={`avatar-${cacheBuster}`}
          source={{ uri: displayPhotoUrl }}
          style={styles.avatarImage}
          resizeMode="cover"
        />

        <Text 
          variant="headlineSmall" 
          style={styles.name}
        >
          {displayName}
        </Text>
        <Text 
          variant="bodyMedium" 
          style={styles.email}
        >
          {userEmail}
        </Text>

        {profileData?.role && (
          <Badge style={styles.roleBadge}>
            {profileData.role.toUpperCase()}
          </Badge>
        )}
      </View>

      <Divider style={styles.divider} />

      {currentAuthUser ? (
        <View style={styles.content}>
          <List.Section>
            <List.Subheader style={styles.sectionHeader}>Account & Listings</List.Subheader>
            
            <List.Item
              title="My Listings"
              description="Manage, edit, or delete your posted spare parts"
              left={(props) => <List.Icon {...props} icon="car-cog" color="#1565FF" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Home')}
              style={styles.listItem}
            />

            <List.Item
              title="Post a Spare Part"
              description="Sell new, used, or OEM auto components"
              left={(props) => <List.Icon {...props} icon="plus-circle" color="#10B981" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Sell')}
              style={styles.listItem}
            />

            <List.Item
              title="Buyer & Seller Messages"
              description="Chat and deal directly with buyers across India"
              left={(props) => <List.Icon {...props} icon="chat-processing" color="#8B5CF6" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Chats')}
              style={styles.listItem}
            />

            <Divider style={{ marginVertical: 8 }} />
            <List.Subheader style={styles.sectionHeader}>Administration & Settings</List.Subheader>

            <List.Item
              title="Admin Moderation"
              description="Verify listings, manage banners, and view stats"
              left={(props) => <List.Icon {...props} icon="shield-account" color="#F59E0B" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Admin')}
              style={styles.listItem}
            />

            <List.Item
              title="Update Profile Photo"
              description="Choose a new profile picture from gallery"
              left={(props) => <List.Icon {...props} icon="camera-account" color="#64748B" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleUpdateProfilePhoto}
              style={styles.listItem}
            />
          </List.Section>

          <Button 
            mode="outlined" 
            onPress={handleSignOut} 
            textColor="#EF4444"
            icon="logout"
            style={styles.signOutButton}
          >
            Sign Out
          </Button>
        </View>
      ) : (
        <View style={styles.guestContainer}>
          <IconButton icon="account-lock-outline" size={54} iconColor="#64748B" />
          <Text variant="titleMedium" style={styles.guestTitle}>
            Guest Session
          </Text>
          <Text variant="bodyMedium" style={styles.guestText}>
            Sign in to manage your auto part listings, update your verified profile photo, and message buyers securely.
          </Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('Auth')} 
            buttonColor="#1565FF"
            icon="login"
            style={styles.loginBtn}
          >
            Sign In / Register
          </Button>
        </View>
      )}
      </ScrollView>

      {/* Action Sheet Portal */}
      <Portal>
        <Modal
          visible={showActionSheet}
          onDismiss={() => setShowActionSheet(false)}
          contentContainerStyle={styles.actionSheet}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHandle} />
            <Text variant="titleMedium" style={styles.sheetTitle}>Profile Photo</Text>
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

          <TouchableOpacity 
            style={styles.sheetOption} 
            onPress={handleRemovePhoto}
          >
            <IconButton icon="delete" size={24} iconColor="#EF4444" />
            <Text style={[styles.sheetOptionText, { color: '#EF4444' }]}>🗑️ Remove Photo</Text>
          </TouchableOpacity>

          <Divider style={styles.sheetDivider} />

          <TouchableOpacity 
            style={styles.sheetCancel} 
            onPress={() => setShowActionSheet(false)}
          >
            <Text style={styles.sheetCancelText}>❌ Cancel</Text>
          </TouchableOpacity>
        </Modal>

        {/* Photo Preview Modal */}
        <Modal
          visible={!!previewImage}
          onDismiss={() => !uploadingPhoto && setPreviewImage(null)}
          contentContainerStyle={styles.previewModal}
        >
          <View style={styles.previewHeader}>
            <IconButton 
              icon="close" 
              size={24} 
              onPress={() => setPreviewImage(null)} 
              disabled={uploadingPhoto}
            />
            <Text variant="titleLarge" style={styles.previewTitle}>Profile Photo</Text>
            <View style={{ width: 48 }} /> 
          </View>

          <View style={styles.previewContent}>
            {previewImage && (
              <Image source={{ uri: previewImage }} style={styles.fullPreviewImage} />
            )}
          </View>

          <View style={styles.previewFooter}>
            <Button 
              mode="outlined" 
              onPress={() => setPreviewImage(null)}
              style={styles.previewFooterBtn}
              disabled={uploadingPhoto}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSavePreview}
              loading={uploadingPhoto}
              style={styles.previewFooterBtn}
              buttonColor="#1565FF"
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#0B1220',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 0,
    margin: 0,
    overflow: 'hidden',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 4,
  },
  email: {
    color: '#94A3B8',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#1E293B',
    color: '#38BDF8',
    marginTop: 8,
    paddingHorizontal: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  content: {
    padding: 16,
  },
  sectionHeader: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13,
  },
  listItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  signOutButton: {
    borderColor: '#EF4444',
    marginTop: 20,
    borderRadius: 8,
  },
  guestContainer: {
    padding: 32,
    alignItems: 'center',
  },
  guestTitle: {
    color: '#0F172A',
    fontWeight: 'bold',
    marginTop: 8,
  },
  guestText: {
    textAlign: 'center',
    color: '#64748B',
    marginVertical: 14,
    lineHeight: 20,
  },
  loginBtn: {
    width: '100%',
    borderRadius: 8,
  },
  previewContainer: {
    alignItems: 'center',
    width: '100%',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  previewButton: {
    borderRadius: 8,
    minWidth: 100,
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
    marginBottom: 12,
  },
  sheetTitle: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  sheetOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 4,
  },
  sheetDivider: {
    marginVertical: 8,
  },
  sheetCancel: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#64748B',
  },
  previewModal: {
    backgroundColor: '#F8FAFC',
    margin: 0,
    flex: 1,
    height: '100%',
    width: '100%',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  previewTitle: {
    fontWeight: 'bold',
    color: '#0B1220',
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullPreviewImage: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#E2E8F0',
  },
  previewFooter: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  previewFooterBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 4,
  },
});
