import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { loadAuth } from '../utils/storage';
import { rollDice, getUserDiceGames, saveDiceResultAndNotify } from '../utils/firebaseService';
import Constants from 'expo-constants';

const GOOGLE_API_KEY = Constants.expoConfig?.extra?.GOOGLE_PLACES_API_KEY || 'AIzaSyChF3pXgB9CQ4HLV58OYUWRQEzEXiVO3H0';

export default function DiceGameScreen({ route, navigation }) {
  const { gameId, otherUsername } = route.params;
  
  const [auth, setAuth] = useState(null);
  const [gameState, setGameState] = useState('ready'); // ready, rolling, result
  const [diceValue, setDiceValue] = useState(1);
  const [category, setCategory] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [loading, setLoading] = useState(false);

  // Animations
  const diceRotation = useRef(new Animated.Value(0)).current;
  const diceScale = useRef(new Animated.Value(1)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    const a = await loadAuth();
    setAuth(a);
  };

  const diceEmojis = {
    1: '⚀',
    2: '⚁',
    3: '⚂',
    4: '⚃',
    5: '⚄',
    6: '⚅'
  };

  const categoryInfo = {
    'Kahve/Çay': { emoji: '☕', color: '#8B4513' },
    'Yemek': { emoji: '🍽️', color: '#FF6B6B' },
    'Tatlı': { emoji: '🍰', color: '#FF69B4' },
    'Fast Food': { emoji: '🍔', color: '#FFA500' },
    'Bar/Pub': { emoji: '🍺', color: '#FFD700' },
    'Sürpriz': { emoji: '🎉', color: '#9B59B6' }
  };

  // Google Places API'den mekan getir
  const fetchPlacesByType = async (type) => {
    try {
      const lat = 41.0370;
      const lng = 28.9850;
      const radius = 5000;
      
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results.map(place => ({
          id: place.place_id,
          name: place.name,
          vicinity: place.vicinity,
          rating: place.rating,
          types: place.types,
          geometry: place.geometry,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Fetch places error:', error);
      return [];
    }
  };

  const handleRollDice = async () => {
    if (loading || !auth) return;

    setLoading(true);
    setGameState('rolling');

    // Animasyon başlat
    Animated.parallel([
      Animated.loop(
        Animated.timing(diceRotation, {
          toValue: 1,
          duration: 100,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        { iterations: 20 }
      ),
      Animated.sequence([
        Animated.timing(diceScale, {
          toValue: 1.5,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(diceScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ]).start();

    // Rastgele zar animasyonu (görsel)
    let counter = 0;
    const interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      counter++;
      if (counter > 15) {
        clearInterval(interval);
      }
    }, 100);

    try {
      // Zar at (1-6)
      const diceResult = Math.floor(Math.random() * 6) + 1;
      
      // Her zar değeri için kategori ve tip tanımla
      const diceCategories = {
        1: { name: 'Kahve/Çay', emoji: '☕', types: ['cafe', 'coffee_shop'] },
        2: { name: 'Yemek', emoji: '🍽️', types: ['restaurant', 'meal_takeaway'] },
        3: { name: 'Tatlı', emoji: '🍰', types: ['bakery', 'cafe'] },
        4: { name: 'Fast Food', emoji: '🍔', types: ['meal_delivery', 'meal_takeaway'] },
        5: { name: 'Bar/Pub', emoji: '🍺', types: ['bar', 'night_club'] },
        6: { name: 'Sürpriz', emoji: '🎉', types: [] },
      };

      const selectedCategory = diceCategories[diceResult];
      
      // 6 farklı kategoriden mekan getir (her zar değeri için 1 mekan)
      const placePromises = Object.values(diceCategories).map(async (cat) => {
        if (cat.types.length === 0) {
          // Sürpriz için rastgele tip
          const randomTypes = ['restaurant', 'cafe', 'bar'];
          const randomType = randomTypes[Math.floor(Math.random() * randomTypes.length)];
          const places = await fetchPlacesByType(randomType);
          return places[0] || null;
        } else {
          const places = await fetchPlacesByType(cat.types[0]);
          return places[0] || null;
        }
      });

      const allCategoryPlaces = await Promise.all(placePromises);
      
      // Zarın gösterdiği kategorinin mekanını seç
      const selectedPlace = allCategoryPlaces[diceResult - 1];

      if (!selectedPlace) {
        clearInterval(interval);
        Alert.alert('Hata', 'Mekan bulunamadı, lütfen tekrar deneyin!');
        setGameState('ready');
        setLoading(false);
        return;
      }

      // Sonucu göster
      setTimeout(async () => {
        clearInterval(interval);
        setDiceValue(diceResult);
        setCategory(selectedCategory.name);
        setSelectedPlace(selectedPlace);
        setGameState('result');
        
        // Sonuç animasyonu
        Animated.timing(resultOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
        
        // Firebase'e kaydet ve bildirimleri gönder
        await saveDiceResultAndNotify(
          gameId, 
          diceResult, 
          selectedCategory.name, 
          selectedCategory.emoji, 
          selectedPlace
        );
        
        setLoading(false);
      }, 2000);
    } catch (error) {
      clearInterval(interval);
      console.error('Roll dice error:', error);
      Alert.alert('Hata', 'Zar atılırken bir hata oluştu!');
      setGameState('ready');
      setLoading(false);
    }
  };

  const handleGoToPlace = () => {
    if (selectedPlace) {
      // Feed stack'ten MapTab'a git
      navigation.getParent()?.navigate('MapTab', {
        screen: 'PlaceDetail',
        params: { place: selectedPlace }
      });
    }
  };

  const rotation = diceRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#0F7C5B', '#1a9e75', '#25b988']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bugün Nereye? 🎲</Text>
        <View style={styles.backButton} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {gameState === 'ready' && (
          <>
            <Text style={styles.title}>Macera Zamanı!</Text>
            <Text style={styles.subtitle}>
              {otherUsername} ile birlikte bugün nereye gideceğinizi zarla belirleyin!
            </Text>

            <View style={styles.diceContainer}>
              <Animated.Text 
                style={[
                  styles.diceEmoji,
                  {
                    transform: [
                      { rotate: rotation },
                      { scale: diceScale }
                    ]
                  }
                ]}
              >
                {diceEmojis[diceValue]}
              </Animated.Text>
            </View>

            <TouchableOpacity 
              style={styles.rollButton}
              onPress={handleRollDice}
              disabled={loading}
            >
              <Text style={styles.rollButtonText}>🎲 Zarı At!</Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>🎯 Nasıl Oynanır?</Text>
              <Text style={styles.infoText}>
                • Zarı atın ve 1-6 arası bir sayı çıksın{'\n'}
                • Her sayı bir kategori belirler{'\n'}
                • Rastgele bir mekan önerilir{'\n'}
                • Hadi gidelim!
              </Text>
            </View>
          </>
        )}

        {gameState === 'rolling' && (
          <>
            <Text style={styles.title}>🎲 Zar Atılıyor...</Text>
            <View style={styles.diceContainer}>
              <Animated.Text 
                style={[
                  styles.diceEmoji,
                  {
                    transform: [
                      { rotate: rotation },
                      { scale: diceScale }
                    ]
                  }
                ]}
              >
                {diceEmojis[diceValue]}
              </Animated.Text>
            </View>
            <Text style={styles.rollingText}>Kader belirleniyor... ✨</Text>
          </>
        )}

        {gameState === 'result' && category && selectedPlace && (
          <Animated.View style={[styles.resultContainer, { opacity: resultOpacity }]}>
            <Text style={styles.resultTitle}>🎉 Sonuç Belli!</Text>
            
            <View style={styles.diceResultBox}>
              <Text style={styles.diceResultEmoji}>{diceEmojis[diceValue]}</Text>
              <Text style={styles.diceResultNumber}>Zar: {diceValue}</Text>
            </View>

            <View style={[styles.categoryBox, { backgroundColor: categoryInfo[category]?.color || '#9B59B6' }]}>
              <Text style={styles.categoryEmoji}>{categoryInfo[category]?.emoji}</Text>
              <Text style={styles.categoryName}>{category}</Text>
            </View>

            <TouchableOpacity style={styles.placeCard} onPress={handleGoToPlace}>
              <Text style={styles.placeCardTitle}>📍 Önerilen Mekan</Text>
              <Text style={styles.placeName}>{selectedPlace.name}</Text>
              {selectedPlace.vicinity && (
                <Text style={styles.placeAddress}>{selectedPlace.vicinity}</Text>
              )}
              {selectedPlace.rating && (
                <View style={styles.ratingContainer}>
                  <MaterialCommunityIcons name="star" size={18} color="#FFD700" />
                  <Text style={styles.rating}>{selectedPlace.rating}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.goButton}
              onPress={handleGoToPlace}
            >
              <Text style={styles.goButtonText}>Hadi Gidelim!</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.shareButton}
              onPress={() => Alert.alert('Yakında', 'Paylaş özelliği yakında eklenecek!')}
            >
              <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
              <Text style={styles.shareButtonText}>Paylaş</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  diceContainer: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  diceEmoji: {
    fontSize: 120,
  },
  rollButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 30,
  },
  rollButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F7C5B',
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 15,
    width: '100%',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 22,
  },
  rollingText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 20,
    fontStyle: 'italic',
  },
  resultContainer: {
    width: '100%',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
  },
  diceResultBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  diceResultEmoji: {
    fontSize: 80,
    marginBottom: 10,
  },
  diceResultNumber: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  categoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 20,
    marginBottom: 30,
  },
  categoryEmoji: {
    fontSize: 32,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    width: '100%',
    marginBottom: 20,
  },
  placeCardTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  placeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F7C5B',
    marginBottom: 8,
  },
  placeAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 5,
  },
  goButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  goButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  shareButtonText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
});
