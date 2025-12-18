import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { loadProfile, loadUserData, saveUserData } from '../utils/storage';
import { PLACES_MOCK } from '../data/placesMock';
import { scorePlace } from '../utils/profileEngine';
import { placesFromGoogle } from '../utils/placesService';
import { filterPlacesByProfile, getRecommendationMessage, getCompatibilityLabel } from '../utils/profileFilters';

export default function HomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [userData, setUserData] = useState({ profilePicture: null, memories: [], favorites: [] });
  const [useGooglePlaces, setUseGooglePlaces] = useState(false);
  const [ranked, setRanked] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = navigation.addListener('focus', async () => {
      const p = await loadProfile();
      const u = await loadUserData();
      setProfile(p);
      setUserData(u || { profilePicture: null, memories: [], favorites: [] });
    });
    return unsub;
  }, [navigation]);

  // Google Places API veya Mock verilerle mekanları yükle
  useEffect(() => {
    const loadPlaces = async () => {
      if (!profile) return;
      
      setLoading(true);
      let placesSource = PLACES_MOCK;
      
      if (useGooglePlaces) {
        try {
          // Google Places API'den mekanları al
          placesSource = await placesFromGoogle(null, profile.profileKey) || PLACES_MOCK;
        } catch (error) {
          console.error('Google Places hatası:', error);
          placesSource = PLACES_MOCK;
        }
      }
      
      const ranked = placesSource
        .map(place => ({
          ...place,
          _score: scorePlace(place, profile, profile.profileKey),
        }))
        .sort((a, b) => b._score - a._score);
      
      setRanked(ranked);
      setLoading(false);
    };
    
    loadPlaces();
  }, [profile, useGooglePlaces]);

  const toggleFavorite = async (place) => {
    const favorites = userData.favorites || [];
    const isFavorited = favorites.some(f => f.id === place.id);
    const updated = {
      ...userData,
      favorites: isFavorited ? favorites.filter(f => f.id !== place.id) : [...favorites, place]
    };
    setUserData(updated);
    await saveUserData(updated);
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profil yok 😅</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('SurveyUpdate')}>
          <Text style={styles.buttonText}>Anketi Doldur</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topCard}>
        <Text style={styles.profileType}>{profile.profileType}</Text>
        <Text style={styles.sub}>Sana göre sıralanmış öneriler 👇</Text>
        {/* Google Places API'si aktifleştiğinde recommendation mesajı gösterilecek */}
        {/* <Text style={styles.recommendation}>{getRecommendationMessage(profile.profileType)}</Text> */}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <TouchableOpacity style={styles.smallBtnOutline} onPress={() => navigation.navigate('SurveyUpdate')}>
            <Text style={styles.smallBtnOutlineText}>Anketi Güncelle</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.smallBtn, { backgroundColor: useGooglePlaces ? '#dc2626' : '#16a34a' }]}
            onPress={() => setUseGooglePlaces(!useGooglePlaces)}
          >
            <Text style={styles.smallBtnText}>{useGooglePlaces ? 'Google API' : 'Mock'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={ranked}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlaceCard 
            item={item} 
            isFavorited={(userData.favorites || []).some(f => f.id === item.id)}
            onToggleFavorite={() => toggleFavorite(item)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 18 }}
      />
    </View>
  );
}

function PlaceCard({ item, isFavorited, onToggleFavorite }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.addr}>{item.address}</Text>
        </View>
        <TouchableOpacity onPress={onToggleFavorite}>
          <Text style={styles.favoriteBtn}>{isFavorited ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.meta}>⭐ {item.rating} • vibe: {item.vibe} • damak: {item.food}</Text>
      <Text style={styles.score}>Uygunluk puanı: {item._score}</Text>
      <Text style={styles.tags}>Etiketler: {item.tags.join(', ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed', padding: 14 },
  topCard: { backgroundColor: '#ffedd5', borderRadius: 16, padding: 14, marginBottom: 12 },
  profileType: { fontSize: 18, fontWeight: '900', color: '#7c2d12' },
  sub: { marginTop: 4, color: '#6b7280' },
  recommendation: { marginTop: 8, fontSize: 13, color: '#7c2d12', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 4 },
  addr: { color: '#4b5563', marginBottom: 6 },
  meta: { color: '#9ca3af', fontSize: 12 },
  score: { marginTop: 6, color: '#f97316', fontWeight: '900' },
  tags: { marginTop: 6, color: '#6b7280', fontSize: 12 },
  favoriteBtn: { fontSize: 24 },

  title: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 10 },
  button: { backgroundColor: '#f97316', paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '900' },

  smallBtn: { backgroundColor: '#f97316', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  smallBtnText: { color: '#fff', fontWeight: '900' },
  smallBtnOutline: { borderWidth: 1, borderColor: '#fb923c', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  smallBtnOutlineText: { color: '#7c2d12', fontWeight: '900' },
});
