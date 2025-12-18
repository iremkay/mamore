import React, { useState, useEffect, useRef } from 'react';
import { Text, View, Button, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { loadProfile, saveDailyRoute, loadDailyRoute } from '../utils/storage';
import { placesFromGoogle, getCurrentLocation } from '../utils/placesService';
import { scorePlace } from '../utils/profileEngine';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const START = {
  latitude: 41.015137,
  longitude: 28.97953,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const PROFILE_CATEGORIES = [
  { key: 'culture', label: '🎨 Sanat', icon: 'palette' },
  { key: 'nature', label: '🌿 Doğa', icon: 'leaf' },
  { key: 'foodie', label: '🍽️ Yemek', icon: 'silverware-fork-knife' },
  { key: 'fun', label: '🎮 Eğlence', icon: 'gamepad-variant' },
  { key: 'laptop', label: '☕ Kafe', icon: 'coffee' },
];

export default function MapScreen({ navigation }) {
  const [userLocation, setUserLocation] = useState(null);
  const [allPlaces, setAllPlaces] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    setLoading(true);
    try {
      // Profil yükle
      const p = await loadProfile();
      setProfile(p);
      console.log('Profil yüklendi:', p);

      // Konum al
      const location = await getCurrentLocation();
      console.log('Konum alındı:', location);
      
      if (location) {
        setUserLocation(location);

        // Yakındaki mekanları al (Google Places API)
        if (p) {
          const googlePlaces = await placesFromGoogle(location, p.profileKey);
          console.log('Google Places alındı:', googlePlaces);
          
          if (googlePlaces && googlePlaces.length > 0) {
            // Mekanları puanlandır
            const scored = googlePlaces.map(place => ({
              ...place,
              profiles: [p.profileKey],
              _score: scorePlace(place, { 
                interests: p.interests || [],
                vibe: p.vibe,
                food: p.food
              }, p.profileKey),
            })).sort((a, b) => b._score - a._score);
            
            setAllPlaces(scored);
            // Varsayılan olarak kullanıcının profil kategorisini seç
            setSelectedCategory(p.profileKey);
          } else {
            setAllPlaces([]);
            console.log('Mekan bulunamadı');
          }
        } else {
          setAllPlaces([]);
          console.log('Profil yüklenmedi');
        }
      } else {
        // Konum alınamazsa varsayılan konuma ayarla
        setUserLocation(START);
        setAllPlaces([]);
        console.log('Konum alınamadı, varsayılan konum kullanılıyor');
      }
    } catch (error) {
      console.error('Harita verisi hatası:', error);
      setUserLocation(START);
      setAllPlaces([]);
    }
    setLoading(false);
  };

  // Seçili kategoriye göre mekanları filtrele
  const filteredPlaces = selectedCategory
    ? allPlaces.filter(place => 
        place.profiles?.includes(selectedCategory) || 
        place._score > 40 // En azından orta derecede uygun mekanları göster
      )
    : allPlaces;

  // Mekan türlerine göre filtreleme
  const PLACE_TYPE_MAPPING = {
    breakfast: ['bakery', 'cafe', 'restaurant', 'breakfast_restaurant', 'pastry_shop'],
    activity: ['museum', 'art_gallery', 'park', 'movie_theater', 'theater', 'cultural_center', 'tourist_attraction', 'library', 'gallery'],
    coffee: ['cafe', 'coffee_shop'],
  };

  const isPlaceTypeMatches = (placeTypes = [], targetType) => {
    const validTypes = PLACE_TYPE_MAPPING[targetType] || [];
    if (!placeTypes || placeTypes.length === 0) return false;
    return placeTypes.some(type => validTypes.includes(type));
  };

  // Belirli türde mekanları skora göre sırala ve en iyi olanı seç
  const selectBestPlaceForType = (places, typeFilter) => {
    const matchingPlaces = places.filter(place => 
      isPlaceTypeMatches(place.tags, typeFilter)
    );

    if (matchingPlaces.length === 0) {
      // Türü eşleşmezse en yüksek skorlu herhangi bir mekanı seç
      return places.sort((a, b) => b._score - a._score)[0];
    }

    return matchingPlaces.sort((a, b) => b._score - a._score)[0];
  };

  // Rota oluştur: kahvaltı + aktivite + kahve kombinasyonu
  const generateRoute = async () => {
    if (filteredPlaces.length < 3) {
      Alert.alert('Uyarı', 'Rota oluşturmak için en az 3 mekan gerekli');
      return;
    }

    try {
      // Her etap için uygun türde mekanları seç
      const breakfastPlace = selectBestPlaceForType(filteredPlaces, 'breakfast');
      const activityPlace = selectBestPlaceForType(
        filteredPlaces.filter(p => p.id !== breakfastPlace?.id),
        'activity'
      );
      const coffeePlace = selectBestPlaceForType(
        filteredPlaces.filter(p => p.id !== breakfastPlace?.id && p.id !== activityPlace?.id),
        'coffee'
      );

      // Geçerli mekanlar var mı?
      if (!breakfastPlace || !activityPlace || !coffeePlace) {
        Alert.alert('Uyarı', 'Tüm kategorilerde mekan bulunamadı');
        return;
      }

      const route = [breakfastPlace, activityPlace, coffeePlace];

      // Günlük rotayı kaydet
      await saveDailyRoute({
        route: route,
        profile: profile,
        category: selectedCategory,
        createdAt: new Date().toISOString(),
      });

      // Rotayı navigation ile gönder
      navigation.navigate('Route', { 
        route: route,
        profile: profile,
        category: selectedCategory,
        isNewRoute: true,
      });
    } catch (error) {
      console.error('Rota oluşturma hatası:', error);
      Alert.alert('Hata', 'Rota oluşturulurken hata oluştu');
    }
  };

  const getMarkerColor = (score) => {
    if (score > 70) return '#10b981'; // Yeşil
    if (score > 50) return '#f59e0b'; // Turuncu
    return '#ef4444'; // Kırmızı
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Harita yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ Konum alınamadı</Text>
          <Button title="Tekrar Dene" onPress={loadMapData} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Kategori Filtreleri */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {PROFILE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.filterButton,
                selectedCategory === cat.key && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <MaterialCommunityIcons 
                name={cat.icon} 
                size={18} 
                color={selectedCategory === cat.key ? '#fff' : '#6b7280'}
              />
              <Text 
                style={[
                  styles.filterButtonText,
                  selectedCategory === cat.key && styles.filterButtonTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Harita */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={userLocation}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        followsUserLocation={false}
        zoomEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
      >
        {/* Kullanıcı konumu markeri */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="📍 Benim Konumum"
            description="Senin konumun"
            pinColor="#3b82f6"
          />
        )}

        {/* Filtrelenmiş mekan markerları */}
        {filteredPlaces.map((place, index) => (
          <Marker
            key={`${place.id}-${index}`}
            coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}
            title={`☕ ${place.name}`}
            description={`⭐ ${place.rating ? place.rating.toFixed(1) : 'N/A'} - Uygunluk: ${place._score ? place._score.toFixed(0) : 0}%`}
            pinColor={getMarkerColor(place._score)}
          />
        ))}
      </MapView>

      {/* Alt Panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.infoRow}>
          <Text style={styles.hint}>
            📍 {filteredPlaces.length} mekan bulundu
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.buttonSecondary]}
            onPress={generateRoute}
            disabled={filteredPlaces.length < 3}
          >
            <MaterialCommunityIcons name="routes" size={20} color="#fff" />
            <Text style={styles.buttonText}>Birota</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.button}
            onPress={loadMapData}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.buttonText}>Yenile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filterContainer: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterScroll: {
    paddingHorizontal: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    marginBottom: 16,
  },
  bottomPanel: {
    padding: 16,
    backgroundColor: '#1f2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  infoRow: {
    marginBottom: 12,
  },
  hint: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  buttonSecondary: {
    backgroundColor: '#f59e0b',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

