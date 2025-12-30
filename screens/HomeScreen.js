import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { loadProfile, loadUserData, saveUserData, saveProfile, loadAuth } from '../utils/storage';
import { scorePlace } from '../utils/profileEngine';
import { placesFromGoogle } from '../utils/placesService';
import { filterPlacesByProfile, getRecommendationMessage, getCompatibilityLabel } from '../utils/profileFilters';
import { getUserProfile } from '../utils/firebaseService';

export default function HomeScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [userData, setUserData] = useState({ profilePicture: null, memories: [], favorites: [] });
  const [ranked, setRanked] = useState([]);
  const [loading, setLoading] = useState(false);
  const walkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Yürüyen emoji animasyonu
    Animated.loop(
      Animated.sequence([
        Animated.timing(walkAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(walkAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const loadProfileData = async () => {
      // Auth bilgisini al
      const auth = await loadAuth();
      
      // Yerel profili yükle
      let p = await loadProfile();
      
      // Eğer kullanıcı giriş yaptıysa, Firebase'den profil bilgilerini al ve birleştir
      if (auth && auth.uid) {
        const profileResult = await getUserProfile(auth.uid);
        console.log('🔍 HomeScreen - Firebase profil sonucu:', profileResult);
        
        if (profileResult.success && profileResult.data) {
          const firebaseProfile = profileResult.data;
          console.log('🔍 HomeScreen - Local profil:', { profileType: p?.profileType, profileKey: p?.profileKey });
          console.log('🔍 HomeScreen - Firebase profil:', { profileType: firebaseProfile.profileType, profileKey: firebaseProfile.profileKey });
          
          // Firebase'den gelen profil verilerini yerel anket verileriyle birleştir
          p = {
            ...p, // Yerel anket verileri
            ...firebaseProfile, // Firebase'den gelen veriler (profileType, profileKey, etc.)
          };
          console.log('✅ HomeScreen: Profil Firebase ile birleştirildi:', { 
            profileType: p.profileType, 
            profileKey: p.profileKey 
          });
          // Birleştirilmiş profili yerel storage'a kaydet
          await saveProfile(p);
        }
      }
      
      const u = await loadUserData();
      setProfile(p);
      setUserData(u || { profilePicture: null, memories: [], favorites: [] });
    };
    
    // İlk yüklemede çalıştır
    loadProfileData();
    
    // Navigation focus olduğunda da çalıştır
    const unsub = navigation.addListener('focus', loadProfileData);
    return unsub;
  }, [navigation]);

 
  useEffect(() => {
    const loadPlaces = async () => {
      if (!profile) return;
      
      setLoading(true);
      try {
        // Google Places API'den mekanları al
        const placesSource = await placesFromGoogle(null, profile.profileKey);
        
        if (placesSource && placesSource.length > 0) {
          const ranked = placesSource
            .map(place => ({
              ...place,
              _score: scorePlace(place, profile, profile.profileKey),
            }))
            .sort((a, b) => b._score - a._score);
          
          setRanked(ranked);
        } else {
          setRanked([]);
        }
      } catch (error) {
        console.error('Google Places hatası:', error);
        setRanked([]);
      }
      setLoading(false);
    };
    
    loadPlaces();
  }, [profile]);

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
        <TouchableOpacity onPress={() => navigation.navigate('SurveyUpdate')}>
          <LinearGradient
            colors={['#FFB30F', '#ffa500', '#FFB30F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Anketi Doldur</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <ImageBackground
          source={require('../assets/category-bar-bg.png')}
          style={styles.categoryBar}
          imageStyle={styles.categoryBarImage}
          resizeMode="cover"
        >
          <View style={styles.categoryBarOverlay}>
            <Text style={styles.profileTypeSimple}>{profile.profileType}</Text>
          </View>
        </ImageBackground>
      </View>

      <Text style={styles.sub}>Sana göre sıralanmış öneriler 👇</Text>

      <FlatList
        data={ranked}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlaceCard 
            item={item}
            isFavorited={(userData.favorites || []).some(f => f.id === item.id)}
            onToggleFavorite={() => toggleFavorite(item)}
            onPress={() => navigation.navigate('PlaceDetail', { place: item })}
          />
        )}
        contentContainerStyle={{ paddingBottom: 18 }}
      />
    </View>
  );
}

function PlaceCard({ item, isFavorited, onToggleFavorite, onPress }) {
  // Vibe ikonu
  const getVibeIcon = (vibe) => {
    const vibeMap = {
      'quiet': '\ud83c\udfa7',
      'sakin': '\ud83c\udfa7',
      'medium': '\ud83d\ude42',
      'orta': '\ud83d\ude42',
      'crowded': '\ud83d\udd25',
      'kalabalk': '\ud83d\udd25',
      'hareketli': '\ud83d\udd25',
    };
    return vibeMap[vibe?.toLowerCase()] || '\ud83c\udfb6';
  };

  // Damak ikonu
  const getFoodIcon = (food) => {
    const foodMap = {
      'coffee': '\u2615',
      'kahve': '\u2615',
      'dessert': '\ud83c\udf70',
      'tatl': '\ud83c\udf70',
      'local': '\ud83c\udf72',
      'turkish': '\ud83c\udf72',
      't\u00fcrk': '\ud83c\udf72',
      'world': '\ud83c\udf0d',
      'd\u00fcnya': '\ud83c\udf0d',
      'healthy': '\ud83e\udd57',
      'sa\u011fl\u0131kl\u0131': '\ud83e\udd57',
    };
    return foodMap[food?.toLowerCase()] || '\ud83c\udf7d\ufe0f';
  };

  // Adres kısaltma (semt ve ilçe)
  const getShortAddress = (address) => {
    if (!address) return '';
    // En fazla ilk 40 karakter, virgülü yerinde kes
    const cleanAddr = address.replace(/\s+/g, ' ').trim();
    if (cleanAddr.length <= 50) return cleanAddr;
    
    // Virgüle kadar olan kısmı + ilçeyi al
    const parts = cleanAddr.split(',');
    if (parts.length >= 2) {
      return `${parts[0].trim()}, ${parts[parts.length - 1].trim()}`;
    }
    return cleanAddr.substring(0, 50) + '...';
  };

  // Uygunluk skorunu emoji ve mesaja \u00e7evir
  const getCompatibilityDisplay = (score) => {
    const percentage = Math.round(score);
    if (percentage >= 95) return { emoji: '\ud83d\udc9a', text: `%${percentage} Sana G\u00f6re!`, color: '#10b981' };
    if (percentage >= 85) return { emoji: '\ud83d\udd25', text: `%${percentage} Tam Senlik`, color: '#f59e0b' };
    if (percentage >= 70) return { emoji: '\u2728', text: `%${percentage} Uyumlu`, color: '#8b5cf6' };
    return { emoji: '\ud83d\udc4d', text: `%${percentage} \u0130yi Se\u00e7enek`, color: '#6b7280' };
  };

  const compatibility = getCompatibilityDisplay(item._score);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <ImageBackground
        source={require('../assets/place-card-bg.png')}
        style={styles.cardBackground}
        imageStyle={styles.cardBackgroundImage}
        resizeMode="cover"
      >
        <View style={styles.cardOverlay}>
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{item.name}</Text>
            <TouchableOpacity onPress={onToggleFavorite}>
              <Text style={styles.favoriteBtn}>{isFavorited ? '\u2764\ufe0f' : '\ud83e\udd0d'}</Text>
            </TouchableOpacity>
          </View>

      {/* Rating, Damak, Vibe */}
      <Text style={styles.metaLine}>
        ⭐ {item.rating} • {getFoodIcon(item.food)} {item.food} • {getVibeIcon(item.vibe)} {item.vibe}
      </Text>

      {/* Adres */}
      <Text style={styles.location}>📍 {getShortAddress(item.address)}</Text>

      {/* Uygunluk */}
      <View style={[styles.compatibilityBadge, { backgroundColor: compatibility.color + '20', borderColor: compatibility.color }]}>
        <Text style={[styles.compatibilityText, { color: compatibility.color }]}>
          {compatibility.emoji} {compatibility.text}
        </Text>
      </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F7C5B', padding: 14, paddingTop: 60 },
  topCard: { 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 8, 
    marginTop: 10,
    shadowColor: '#0F7C5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
  },
  headerSection: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 8,
  },
  categoryBar: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryBarImage: {
    borderRadius: 12,
  },
  categoryBarOverlay: {
    backgroundColor: 'rgba(245, 245, 240, 0.92)',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  walkingEmoji: {
    fontSize: 40,
  },
  walkingEmojiRight: {
    fontSize: 40,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roadPath: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.5,
    letterSpacing: 2,
  },
  profileType: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#F5F5F0',
    textAlign: 'center',
  },
  profileTypeSimple: { 
    fontSize: 24, 
    fontWeight: '900', 
    color: '#0F7C5B',
    textAlign: 'center',
  },
  subHighlight: { 
    marginTop: 6, 
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  sub: { marginTop: 4, marginBottom: 12, color: '#F5F5F0', paddingHorizontal: 4, fontWeight: '600' },
  recommendation: { marginTop: 8, fontSize: 13, color: '#5A2447', fontWeight: '700' },
  card: { 
    borderRadius: 16, 
    marginBottom: 14, 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  cardBackground: {
    width: '100%',
  },
  cardBackgroundImage: {
    borderRadius: 16,
  },
  cardOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    padding: 16,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 10 
  },
  name: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#111827', 
    flex: 1,
    marginRight: 10,
  },
  metaLine: { 
    color: '#4b5563', 
    fontSize: 14, 
    marginBottom: 6,
    fontWeight: '600',
  },
  location: {
    color: '#6b7280',
    fontSize: 13,
    marginBottom: 10,
    fontWeight: '500',
  },
  compatibilityBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  compatibilityText: {
    fontSize: 15,
    fontWeight: '900',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  favoriteBtn: { fontSize: 26 },

  title: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 10 },
  button: { paddingVertical: 12, borderRadius: 999, alignItems: 'center', elevation: 6, shadowColor: '#FFB30F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6 },
  buttonText: { color: '#fff', fontWeight: '900' },

  smallBtn: { backgroundColor: '#0F7C5B', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  smallBtnText: { color: '#fff', fontWeight: '900' },
  smallBtnOutline: { borderWidth: 1, borderColor: '#FFB30F', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
  smallBtnOutlineText: { color: '#5A2447', fontWeight: '900' },
});
