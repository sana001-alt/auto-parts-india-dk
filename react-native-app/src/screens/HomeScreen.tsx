import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  FlatList, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl,
  Modal,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Searchbar, 
  Text, 
  Chip, 
  Card, 
  FAB, 
  Badge, 
  IconButton, 
  useTheme, 
  ActivityIndicator,
  Button,
  Divider,
  Surface
} from 'react-native-paper';
import { db, collection, onSnapshot, query, orderBy } from '../services/firebase';
import { getCurrentLocation, reverseGeocodeOSM } from '../services/location';
import BrandLogo from '../components/BrandLogo';

export default function HomeScreen({ navigation, user }: any) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All India');
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const categories = [
    'All', 'Engine Components', 'Body Parts', 'Electrical & Lights', 
    'Brakes & Suspension', 'Transmission', 'Interior Accessories', 'Wheels & Tyres'
  ];

  const topBrands = [
    { name: 'All', icon: 'car-multiple' },
    { name: 'Maruti Suzuki', icon: 'car-sports' },
    { name: 'Hyundai', icon: 'car' },
    { name: 'Tata', icon: 'car-estate' },
    { name: 'Mahindra', icon: 'truck-pickup' },
    { name: 'Toyota', icon: 'car-side' },
    { name: 'Honda', icon: 'car-convertible' },
    { name: 'Kia', icon: 'car-hatchback' },
  ];

  const cities = [
    'All India', 'Mumbai', 'Delhi NCR', 'Bengaluru', 'Chennai', 
    'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur'
  ];

  const banners = [
    {
      id: '1',
      title: '0% Marketplace Commission',
      subtitle: 'Sell auto spare parts directly to verified buyers',
      tag: 'DIRECT DEAL',
      color: '#0F172A',
      accentColor: '#1565FF'
    },
    {
      id: '2',
      title: '100% Genuine Certified Parts',
      subtitle: 'Browse OEM & verified aftermarket spares across India',
      tag: 'VERIFIED',
      color: '#1E293B',
      accentColor: '#10B981'
    }
  ];

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'spareParts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setParts(list);
      setLoading(false);
      setRefreshing(false);
    }, (err) => {
      console.warn('Error fetching parts:', err);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredParts = parts.filter((part) => {
    const queryLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      part.title?.toLowerCase().includes(queryLower) ||
      part.carBrand?.toLowerCase().includes(queryLower) ||
      part.carModel?.toLowerCase().includes(queryLower) ||
      part.category?.toLowerCase().includes(queryLower) ||
      part.partNumber?.toLowerCase().includes(queryLower);

    const matchesCategory = selectedCategory === 'All' || part.category === selectedCategory;
    const matchesBrand = selectedBrand === 'All' || part.carBrand === selectedBrand;
    const matchesCity = selectedCity === 'All India' || !part.location || part.location.includes(selectedCity);

    return matchesSearch && matchesCategory && matchesBrand && matchesCity;
  });

  const renderPartItem = ({ item }: { item: any }) => (
    <Card 
      style={styles.card} 
      onPress={() => navigation.navigate('ProductDetail', { part: item })}
      elevation={2}
    >
      <View style={styles.imageContainer}>
        <Card.Cover 
          source={{ uri: item.imageUrl || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=400' }} 
          style={styles.cardImage} 
        />
        {item.verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>
      <Card.Content style={styles.cardContent}>
        <Text variant="titleMedium" numberOfLines={1} style={styles.partTitle}>
          {item.title}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={styles.partModel}>
          {item.carBrand} {item.carModel}
        </Text>
        <Text variant="bodySmall" style={styles.locationText}>
          📍 {item.location || 'India'}
        </Text>
        <View style={styles.priceRow}>
          <Text variant="titleMedium" style={styles.price}>
            ₹{item.price?.toLocaleString('en-IN')}
          </Text>
          <Chip compact style={styles.conditionChip} textStyle={{ fontSize: 10 }}>
            {item.condition || 'Used'}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />
      
      {/* Native Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BrandLogo size={38} style={styles.logoImage} />
          <View>
            <Text variant="titleMedium" style={styles.headerTitle}>Auto Parts India</Text>
            <TouchableOpacity 
              style={styles.locationSelector} 
              onPress={() => setShowLocationModal(true)}
            >
              <Text variant="bodySmall" style={styles.headerSubtitle}>
                📍 {selectedCity} ▾
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.bellBtn} 
            onPress={() => navigation.navigate('Chats')}
          >
            <IconButton icon="bell-outline" iconColor="#FFFFFF" size={22} style={{ margin: 0 }} />
            <Badge size={8} style={styles.badge} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar & Filter Button */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search parts, brands, models..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={{ fontSize: 14 }}
          elevation={1}
        />
        <TouchableOpacity 
          style={styles.filterBtn} 
          onPress={() => setShowFilterModal(true)}
        >
          <IconButton icon="tune-variant" iconColor="#FFFFFF" size={20} style={{ margin: 0 }} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Promotional Banner Carousel */}
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false} 
          style={styles.bannerContainer}
        >
          {banners.map((b) => (
            <Surface key={b.id} style={[styles.bannerCard, { backgroundColor: b.color }]} elevation={2}>
              <View style={[styles.bannerTag, { backgroundColor: b.accentColor }]}>
                <Text style={styles.bannerTagText}>{b.tag}</Text>
              </View>
              <Text variant="titleMedium" style={styles.bannerTitle}>{b.title}</Text>
              <Text variant="bodySmall" style={styles.bannerSubtitle}>{b.subtitle}</Text>
            </Surface>
          ))}
        </ScrollView>

        {/* Top Car Brands */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Popular Car Brands</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandList}>
          {topBrands.map((b) => (
            <TouchableOpacity 
              key={b.name}
              style={[
                styles.brandChip,
                selectedBrand === b.name && styles.selectedBrandChip
              ]}
              onPress={() => setSelectedBrand(b.name)}
            >
              <Text 
                style={[
                  styles.brandText,
                  selectedBrand === b.name && styles.selectedBrandText
                ]}
              >
                {b.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Categories</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {categories.map((cat) => (
            <Chip
              key={cat}
              selected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
              style={styles.chip}
              selectedColor={selectedCategory === cat ? '#FFFFFF' : '#0F172A'}
              showSelectedOverlay
            >
              {cat}
            </Chip>
          ))}
        </ScrollView>

        {/* Main Content Feed */}
        <View style={styles.feedHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Spare Parts {selectedCategory !== 'All' ? `• ${selectedCategory}` : ''}
          </Text>
          <Text variant="bodySmall" style={{ color: '#64748B' }}>
            {filteredParts.length} items found
          </Text>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#1565FF" />
          </View>
        ) : (
          <FlatList
            data={filteredParts}
            keyExtractor={(item) => item.id}
            renderItem={renderPartItem}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text variant="titleSmall" style={{ color: '#475569', fontWeight: 'bold' }}>
                  No spare parts found
                </Text>
                <Text variant="bodySmall" style={{ color: '#64748B', marginTop: 4, textAlign: 'center' }}>
                  Try resetting your search query, brand, or location filter.
                </Text>
                <Button 
                  mode="outlined" 
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setSelectedBrand('All');
                    setSelectedCity('All India');
                  }}
                  style={{ marginTop: 12 }}
                >
                  Reset All Filters
                </Button>
              </View>
            }
          />
        )}
      </ScrollView>

      {/* Floating Action Button for Sellers */}
      <FAB
        icon="plus"
        label="Sell Part"
        style={styles.fab}
        color="#FFFFFF"
        onPress={() => {
          if (!user) {
            navigation.navigate('Auth');
          } else {
            navigation.navigate('SellPart');
          }
        }}
      />

      {/* Location Selector Modal */}
      <Modal visible={showLocationModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="titleLarge" style={styles.modalTitle}>Select Location</Text>
            <Divider style={{ marginVertical: 12 }} />
            
            <TouchableOpacity 
              style={[styles.locationItem, { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 12, marginBottom: 8 }]}
              onPress={async () => {
                const coords = await getCurrentLocation();
                if (coords) {
                  const geo = await reverseGeocodeOSM(coords.latitude, coords.longitude);
                  if (geo?.city) {
                    setSelectedCity(geo.city);
                  }
                }
                setShowLocationModal(false);
              }}
            >
              <Text style={[styles.locationTextModal, { color: '#1565FF', fontWeight: 'bold' }]}>
                🎯 Detect Current Location (GPS)
              </Text>
            </TouchableOpacity>

            {cities.map((city) => (
              <TouchableOpacity
                key={city}
                style={styles.locationItem}
                onPress={() => {
                  setSelectedCity(city);
                  setShowLocationModal(false);
                }}
              >
                <Text style={[styles.locationTextModal, selectedCity === city && { color: '#1565FF', fontWeight: 'bold' }]}>
                  {city}
                </Text>
                {selectedCity === city && <Text style={{ color: '#1565FF' }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <Button mode="contained" buttonColor="#0F172A" onPress={() => setShowLocationModal(false)} style={{ marginTop: 16 }}>
              Close
            </Button>
          </View>
        </View>
      </Modal>

      {/* Advanced Filters Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="titleLarge" style={styles.modalTitle}>Filter Spare Parts</Text>
            <Divider style={{ marginVertical: 12 }} />

            <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 8 }}>Car Brand</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {topBrands.map((b) => (
                <Chip
                  key={b.name}
                  selected={selectedBrand === b.name}
                  onPress={() => setSelectedBrand(b.name)}
                  style={{ marginRight: 6 }}
                >
                  {b.name}
                </Chip>
              ))}
            </ScrollView>

            <Text variant="titleSmall" style={{ fontWeight: 'bold', marginBottom: 8 }}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {categories.map((c) => (
                <Chip
                  key={c}
                  selected={selectedCategory === c}
                  onPress={() => setSelectedCategory(c)}
                  style={{ marginRight: 6 }}
                >
                  {c}
                </Chip>
              ))}
            </ScrollView>

            <Button mode="contained" buttonColor="#1565FF" onPress={() => setShowFilterModal(false)} style={{ marginTop: 16 }}>
              Apply Filters
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0B1220',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 38,
    height: 38,
    borderRadius: 8,
    marginRight: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94A3B8',
  },
  locationSelector: {
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellBtn: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: -12,
    flexDirection: 'row',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 48,
  },
  filterBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#1565FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerContainer: {
    marginTop: 16,
    paddingLeft: 16,
  },
  bannerCard: {
    width: 280,
    marginRight: 12,
    padding: 16,
    borderRadius: 16,
  },
  bannerTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  bannerTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  bannerSubtitle: {
    color: '#94A3B8',
    marginTop: 4,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  brandList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  brandChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  selectedBrandChip: {
    backgroundColor: '#1565FF',
  },
  brandText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedBrandText: {
    color: '#FFFFFF',
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    backgroundColor: '#E2E8F0',
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 80,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  cardImage: {
    height: 110,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardContent: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  partTitle: {
    fontWeight: 'bold',
    color: '#0B1220',
    fontSize: 13,
  },
  partModel: {
    color: '#64748B',
    fontSize: 11,
  },
  locationText: {
    color: '#94A3B8',
    fontSize: 10,
    marginVertical: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  price: {
    color: '#1565FF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  conditionChip: {
    height: 22,
  },
  loaderContainer: {
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1565FF',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#0F172A',
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  locationTextModal: {
    color: '#0F172A',
    fontSize: 15,
  },
});
