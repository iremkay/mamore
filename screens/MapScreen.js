import React, { useState, useEffect, useRef } from 'react';
import { Text, View, Button, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, ScrollView, Linking, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { loadProfile, saveDailyRoute, loadDailyRoute } from '../utils/storage';
import { placesFromGoogle, getCurrentLocation } from '../utils/placesService';
import { scorePlace } from '../utils/profileEngine';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { searchTrack, getAudioFeatures, analyzeMood } from '../utils/spotifyService';

const START = {
  latitude: 41.015137,
  longitude: 28.97953,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen({ navigation, route }) {
  const [userLocation, setUserLocation] = useState(null);
  const [allPlaces, setAllPlaces] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [dailyRoute, setDailyRoute] = useState(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [musicQuery, setMusicQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [moodAnalysis, setMoodAnalysis] = useState(null);
  const [filteredPlaces, setFilteredPlaces] = useState([]);
  const mapRef = useRef(null);

  useEffect(() => {
    loadMapData();
  }, []);

  useEffect(() => {
    // Günlük rota kontrolü
    checkDailyRoute();
  }, [allPlaces, profile]);

  // RouteScreen'den yeni rota talebi geldiğinde
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (route.params?.shouldGenerateNewRoute) {
        // Parametreyi temizle
        navigation.setParams({ shouldGenerateNewRoute: false });
        // Yeni rota oluştur
        if (allPlaces.length >= 3 && profile) {
          generateRoute(false);
        }
      }
    });
    return unsubscribe;
  }, [navigation, route.params, allPlaces, profile]);

  const checkDailyRoute = async () => {
    const savedRoute = await loadDailyRoute();
    setDailyRoute(savedRoute);
    
    // Eğer bugün için rota yoksa ve mekanlar yüklendiyse otomatik oluştur
    if (!savedRoute && allPlaces.length >= 3 && profile) {
      // Otomatik rota oluştur (sessizce, uyarı gösterme)
      await generateRoute(true);
    }
  };

  const loadMapData = async () => {
    setLoading(true);
    try {
      // Profil yükle
      const p = await loadProfile();
      setProfile(p);
      console.log('Profil yüklendi:', p);

      // Konum aldım
      const location = await getCurrentLocation();
      console.log('Konum alındı:', location);
      
      if (location) {
        setUserLocation(location);

        // Yakındaki mekanları aldım
        if (p) {
          const googlePlaces = await placesFromGoogle(location, p.profileKey);
          console.log('Google Places alındı:', googlePlaces);
          
          if (googlePlaces && googlePlaces.length > 0) {
            
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
          } else {
            setAllPlaces([]);
            console.log('Mekan bulunamadı');
          }
        } else {
          setAllPlaces([]);
          console.log('Profil yüklenmedi');
        }
      } else {
        
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

  // Yol tarifi için Google Maps'i aç
  const openDirections = (place) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    Linking.openURL(url).catch(err => {
      console.error('Google Maps açılamadı:', err);
      Alert.alert('Hata', 'Google Maps açılamadı');
    });
  };

  // Mekan türlerine göre filtreledim
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

  
  const selectBestPlaceForType = (places, typeFilter, excludeIds = []) => {
    // Daha önce seçilenleri hariç tut
    const availablePlaces = places.filter(place => !excludeIds.includes(place.id));
    
    const matchingPlaces = availablePlaces.filter(place => 
      isPlaceTypeMatches(place.tags, typeFilter)
    );

    let candidates = matchingPlaces.length > 0 ? matchingPlaces : availablePlaces;
    
    // En iyi skorluları sırala
    candidates = candidates.sort((a, b) => b._score - a._score);
    
    // En iyi 5 mekan arasından rastgele seç (çeşitlilik için)
    const topCandidates = candidates.slice(0, Math.min(5, candidates.length));
    
    if (topCandidates.length === 0) return null;
    
    // Rastgele seç
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    return topCandidates[randomIndex];
  };

  // Rota oluşturdum.
  const generateRoute = async (silent = false) => {
    if (allPlaces.length < 3) {
      if (!silent) Alert.alert('Uyarı', 'Rota oluşturmak için en az 3 mekan gerekli');
      return;
    }

    try {
      // Her etap için uygun türde mekanları seçtim
      const breakfastPlace = selectBestPlaceForType(allPlaces, 'breakfast', []);
      
      if (!breakfastPlace) {
        if (!silent) Alert.alert('Uyarı', 'Kahvaltı mekanı bulunamadı');
        return;
      }
      
      const activityPlace = selectBestPlaceForType(
        allPlaces,
        'activity',
        [breakfastPlace.id]
      );
      
      if (!activityPlace) {
        if (!silent) Alert.alert('Uyarı', 'Aktivite mekanı bulunamadı');
        return;
      }
      
      const coffeePlace = selectBestPlaceForType(
        allPlaces,
        'coffee',
        [breakfastPlace.id, activityPlace.id]
      );

      
      if (!coffeePlace) {
        if (!silent) Alert.alert('Uyarı', 'Kahve mekanı bulunamadı');
        return;
      }

      const route = [breakfastPlace, activityPlace, coffeePlace];

      
      const routeData = {
        route: route,
        profile: profile,
        category: profile?.profileKey,
        createdAt: new Date().toISOString(),
      };
      
      await saveDailyRoute(routeData);
      setDailyRoute(routeData);

      // Eğer sessiz değilse, rota ekranına git
      if (!silent) {
        navigation.navigate('Route', { 
          route: route,
          profile: profile,
          category: profile?.profileKey,
          isNewRoute: true,
        });
      }
    } catch (error) {
      console.error('Rota oluşturma hatası:', error);
      if (!silent) {
        Alert.alert('Hata', 'Rota oluşturulurken bir hata oluştu.');
      }
    }
  };

  // Şarkı ara
  const handleSearchMusic = async () => {
    if (!musicQuery.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir şarkı adı girin');
      return;
    }

    setMusicLoading(true);
    try {
      const result = await searchTrack(musicQuery);
      
      if (result.success && result.tracks.length > 0) {
        setSearchResults(result.tracks);
      } else {
        // Detaylı hata mesajı göster
        const errorMessage = result.error || 'Şarkı bulunamadı. Başka bir şarkı deneyin.';
        Alert.alert('Bulunamadı', errorMessage);
        console.error('Arama hatası:', result.error);
      }
    } catch (error) {
      Alert.alert('Hata', 'Arama sırasında bir hata oluştu.');
      console.error('Music search error:', error);
    } finally {
      setMusicLoading(false);
    }
  };

  // Şarkı seçildiğinde mood analizi yap
  const handleSelectTrack = async (track) => {
    setMusicLoading(true);
    try {
      const featuresResult = await getAudioFeatures(track.id);
      
      if (featuresResult.success) {
        const mood = analyzeMood(featuresResult.features);
        setMoodAnalysis(mood);
        
        // Mood'a göre mekanları filtrele
        const filtered = allPlaces.filter(place => {
          // Vibe kontrolü
          if (mood.vibe === 'quiet') {
            return place.crowdLevel === 'low' || !place.crowdLevel;
          } else if (mood.vibe === 'crowded') {
            return place.crowdLevel === 'high';
          } else {
            return true; // medium veya tanımsız - hepsini göster
          }
        });

        setFilteredPlaces(filtered);
        
        Alert.alert(
          '🎵 Müzik Analizi Tamamlandı!',
          `${mood.moodText}\n\n${mood.suggested}\n\n${filtered.length} mekan bulundu.`,
          [
            {
              text: 'Tamam',
              onPress: () => {
                setShowMusicModal(false);
                setSearchResults([]);
                setMusicQuery('');
              }
            }
          ]
        );
      } else {
        Alert.alert('Hata', 'Şarkı özellikleri alınamadı.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Analiz sırasında bir hata oluştu.');
      console.error('Audio features error:', error);
    } finally {
      setMusicLoading(false);
    }
  };

  // Filtreyi temizle
  const clearMusicFilter = () => {
    setFilteredPlaces([]);
    setMoodAnalysis(null);
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

        {/* Mekan markerı - filtrelenmiş veya tümü */}
        {(filteredPlaces.length > 0 ? filteredPlaces : allPlaces).map((place, index) => (
          <Marker
            key={`${place.id}-${index}`}
            coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}
            pinColor={getMarkerColor(place._score)}
            onPress={() => setSelectedPlace(place)}
          >
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{place.name}</Text>
                <Text style={styles.calloutRating}>
                  ⭐ {place.rating ? place.rating.toFixed(1) : 'N/A'} • Uygunluk: {place._score ? place._score.toFixed(0) : 0}%
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Seçili Mekan Kartı */}
      {selectedPlace && (
        <View style={styles.selectedPlaceCard}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setSelectedPlace(null)}
          >
            <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          
          <Text style={styles.selectedPlaceTitle}>{selectedPlace.name}</Text>
          <Text style={styles.selectedPlaceRating}>
            ⭐ {selectedPlace.rating ? selectedPlace.rating.toFixed(1) : 'N/A'} • 
            Uygunluk: {selectedPlace._score ? selectedPlace._score.toFixed(0) : 0}%
          </Text>
          <Text style={styles.selectedPlaceAddress}>{selectedPlace.address}</Text>
          
          <View style={styles.selectedPlaceButtons}>
            <TouchableOpacity 
              style={styles.selectedPlaceButton}
              onPress={() => {
                navigation.navigate('PlaceDetail', { place: selectedPlace });
                setSelectedPlace(null);
              }}
            >
              <MaterialCommunityIcons name="information" size={20} color="#fff" />
              <Text style={styles.selectedPlaceButtonText}>Detaylar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.selectedPlaceButton, styles.selectedPlaceButtonSecondary]}
              onPress={() => {
                openDirections(selectedPlace);
                setSelectedPlace(null);
              }}
            >
              <MaterialCommunityIcons name="directions" size={20} color="#fff" />
              <Text style={styles.selectedPlaceButtonText}>Yol Tarifi</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Müzik Butonu - Sağ Üst */}
      <TouchableOpacity 
        style={styles.musicButton}
        onPress={() => setShowMusicModal(true)}
      >
        <MaterialCommunityIcons name="music" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Alt Panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.infoRow}>
          <Text style={styles.hint}>
            📍 {filteredPlaces.length > 0 ? filteredPlaces.length : allPlaces.length} mekan {moodAnalysis ? `• 🎵 ${moodAnalysis.moodText}` : 'bulundu'}
          </Text>
          {moodAnalysis && (
            <TouchableOpacity onPress={clearMusicFilter}>
              <Text style={styles.clearFilter}>✕ Filtreyi Kaldır</Text>
            </TouchableOpacity>
          )}
          {dailyRoute && !moodAnalysis && (
            <Text style={styles.routeStatus}>✨ Birota hazır!</Text>
          )}
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.buttonGreen]}
            onPress={() => setShowRouteModal(true)}
          >
            <MaterialCommunityIcons name="map-check" size={20} color="#fff" />
            <Text style={[styles.buttonText, styles.buttonTextWhite]}>Birota</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.buttonYellow]}
            onPress={loadMapData}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#111827" />
            <Text style={styles.buttonText}>Yenile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Müzik Modal */}
      <Modal
        visible={showMusicModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMusicModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎵 Şarkıdan Mekan Bul</Text>
            <Text style={styles.modalSubtitle}>
              Bir şarkı ara, ruh haline göre mekanları filtrele
            </Text>

            {/* Arama Inputu */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Şarkı adı veya sanatçı..."
                placeholderTextColor="#9ca3af"
                value={musicQuery}
                onChangeText={setMusicQuery}
                autoFocus
              />
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={handleSearchMusic}
                disabled={musicLoading}
              >
                {musicLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="magnify" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Arama Sonuçları */}
            {searchResults.length > 0 && (
              <ScrollView style={styles.searchResults}>
                {searchResults.map((track) => (
                  <TouchableOpacity
                    key={track.id}
                    style={styles.trackItem}
                    onPress={() => handleSelectTrack(track)}
                    disabled={musicLoading}
                  >
                    <View style={styles.trackInfo}>
                      <Text style={styles.trackName}>{track.name}</Text>
                      <Text style={styles.trackArtist}>{track.artist}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => {
                setShowMusicModal(false);
                setSearchResults([]);
                setMusicQuery('');
              }}
            >
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rota Modal */}
      <Modal
        visible={showRouteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRouteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🗺️ Birota</Text>
            <Text style={styles.modalQuestion}>Bugün ilk ne yapmak istiyorsun?</Text>
            
            <View style={styles.modalOptions}>
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={() => {
                  setShowRouteModal(false);
                  const place = selectBestPlaceForType(allPlaces, 'breakfast', []);
                  if (place) {
                    setSelectedPlace(place);
                    mapRef.current?.animateToRegion({
                      latitude: place.latitude,
                      longitude: place.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }, 1000);
                  } else {
                    Alert.alert('Üzgünüm', 'Kahvaltı mekanı bulunamadı');
                  }
                }}
              >
                <Text style={styles.modalOptionIcon}>☕</Text>
                <Text style={styles.modalOptionText}>Kahvaltı</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalOption}
                onPress={() => {
                  setShowRouteModal(false);
                  const place = selectBestPlaceForType(allPlaces, 'activity', []);
                  if (place) {
                    setSelectedPlace(place);
                    mapRef.current?.animateToRegion({
                      latitude: place.latitude,
                      longitude: place.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }, 1000);
                  } else {
                    Alert.alert('Üzgünüm', 'Aktivite mekanı bulunamadı');
                  }
                }}
              >
                <Text style={styles.modalOptionIcon}>🎨</Text>
                <Text style={styles.modalOptionText}>Aktivite</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalOption}
                onPress={() => {
                  setShowRouteModal(false);
                  const place = selectBestPlaceForType(allPlaces, 'coffee', []);
                  if (place) {
                    setSelectedPlace(place);
                    mapRef.current?.animateToRegion({
                      latitude: place.latitude,
                      longitude: place.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }, 1000);
                  } else {
                    Alert.alert('Üzgünüm', 'Kahve mekanı bulunamadı');
                  }
                }}
              >
                <Text style={styles.modalOptionIcon}>☕</Text>
                <Text style={styles.modalOptionText}>Kahve İçmek</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowRouteModal(false)}
            >
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    padding: 12,
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
    marginBottom: 8,
  },
  hint: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
  },
  routeStatus: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
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
    backgroundColor: '#F5F5F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  buttonGreen: {
    backgroundColor: '#0F7C5B',
    borderColor: '#0F7C5B',
  },
  buttonYellow: {
    backgroundColor: '#FFB30F',
    borderColor: '#FFB30F',
  },
  buttonSecondary: {
    backgroundColor: '#f59e0b',
  },
  buttonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },  buttonTextWhite: {
    color: '#fff',
  },  callout: {
    width: 280,
  },
  calloutContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  calloutRating: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  calloutAddress: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 10,
  },
  calloutButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  calloutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
  },
  calloutButtonSecondary: {
    backgroundColor: '#10b981',
  },
  calloutButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedPlaceCard: {
    position: 'absolute',
    bottom: 180,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  selectedPlaceTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
    marginRight: 30,
  },
  selectedPlaceRating: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  selectedPlaceAddress: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 14,
  },
  selectedPlaceButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  selectedPlaceButton: {
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
  selectedPlaceButtonSecondary: {
    backgroundColor: '#10b981',
  },
  selectedPlaceButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalQuestion: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  modalOptions: {
    gap: 12,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F0',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalOptionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  modalCancelButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b7280',
  },
  
  // Müzik Butonu
  musicButton: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: '#f97316',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  
  // Müzik Arama
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 14,
    color: '#111827',
  },
  searchButton: {
    backgroundColor: '#f97316',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResults: {
    maxHeight: 300,
    marginBottom: 12,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 12,
    color: '#6b7280',
  },
  clearFilter: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '700',
  },
});
