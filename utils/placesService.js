/**
 * Google Places API Integration Service
 * Konum alma, yakındaki mekanlar, mekan detayları
 */

import * as Location from 'expo-location';
import Constants from 'expo-constants';

const GOOGLE_PLACES_API_KEY = Constants.expoConfig?.extra?.GOOGLE_PLACES_API_KEY || 'AIzaSyChF3pXgB9CQ4HLV58OYUWRQEzEXiVO3H0';
const NEARBY_SEARCH_RADIUS = 5000; // 5km

/**
 * ADIM 1: Kullanıcının konumunu al
 */
export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Konum izni verilmedi');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({});
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Konum alma hatası:', error);
    return null;
  }
}

/**
 * ADIM 2: Nearby Search - Profil tiplerine göre mekanları ara
 * Örn: gamer -> "arcade, gaming cafe, board game cafe"
 *      foodie -> "restaurant, cafe, bakery"
 */
export async function getNearbyPlaces(userLocation, profileType, searchTypes) {
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      console.log('Google API Key eksik');
      return null;
    }

    const places = [];
    const seenIds = new Set(); // Dedup için

    // Her kategori için ayrı arama yapıyoruz
    for (const keyword of searchTypes) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLocation.latitude},${userLocation.longitude}&radius=${NEARBY_SEARCH_RADIUS}&keyword=${keyword}&key=${GOOGLE_PLACES_API_KEY}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        // Duplicate mekanları filtrele
        data.results.forEach(place => {
          if (!seenIds.has(place.place_id)) {
            seenIds.add(place.place_id);
            places.push(place);
          }
        });
      }
    }

    return places.length > 0 ? places : null;
  } catch (error) {
    console.error('Nearby Search hatası:', error);
    return null;
  }
}

/**
 * ADIM 3: Place Details - Mekan hakkında detay bilgi
 */
export async function getPlaceDetails(placeId) {
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?
      place_id=${placeId}
      &fields=name,rating,review,formatted_address,photos,opening_hours
      &key=${GOOGLE_PLACES_API_KEY}`;

    const response = await fetch(url.replace(/\n/g, ''));
    const data = await response.json();

    return data.result || null;
  } catch (error) {
    console.error('Place Details hatası:', error);
    return null;
  }
}

/**
 * ADIM 4: Google Maps'te mekanı aç
 */
export function openInGoogleMaps(place) {
  const { latitude, longitude } = place.geometry?.location || {};
  if (latitude && longitude) {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    // Gerçek uygulamada: Linking.openURL(url)
    console.log('Google Maps açılacak:', url);
  }
}

/**
 * Mock & Real arasında switch
 * Google API direkt çağrısı
 */
export async function placesFromGoogle(userLocation, profileType) {
  try {
    const location = userLocation || await getCurrentLocation();
    if (!location) {
      console.log('📍 Konum alınamadı');
      return null;
    }

    const searchTypes = getSearchTypesForProfile(profileType);
    const places = await getNearbyPlaces(location, profileType, searchTypes);

    return places ? transformGooglePlaces(places) : null;
  } catch (error) {
    console.error('Google Places API hatası:', error);
    return null;
  }
}

/**
 * Profil tipi -> Google Places arama terimleri
 */
function getSearchTypesForProfile(profileType) {
  const profileKeywords = {
    'culture': ['museum', 'gallery', 'art cafe', 'cultural center', 'theater'],
    'nature': ['park', 'garden', 'hiking trail', 'beach', 'picnic area', 'nature reserve'],
    'foodie': ['restaurant', 'cafe', 'bakery', 'pizza', 'sushi', 'kebab', 'burger'],
    'fun': ['arcade', 'board game cafe', 'gaming lounge', 'entertainment'],
    'laptop': ['cafe', 'coffee shop', 'library', 'quiet lounge'],
  };

  return profileKeywords[profileType] || ['cafe', 'restaurant', 'attraction'];
}

/**
 * Google Places API formatını app formatına çevir
 */
function transformGooglePlaces(googlePlaces) {
  return googlePlaces.map(place => ({
    id: place.place_id,
    name: place.name,
    address: place.vicinity,
    rating: place.rating || 0,
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    // App'de scoring için gerekli alanlar
    tags: place.types || [],
    vibe: extractVibe(place),
    food: extractFoodType(place),
    photoUrl: place.photos?.[0]?.photo_reference,
  }));
}

/**
 * Google Place type'larından "vibe" çıkart
 */
function extractVibe(place) {
  const types = place.types || [];
  if (types.includes('night_club') || types.includes('bar')) return 'hareketli';
  if (types.includes('library') || types.includes('park')) return 'sakin';
  return 'orta';
}

/**
 * Google Place type'larından "food" kategorisi çıkart
 */
function extractFoodType(place) {
  const types = place.types || [];
  const name = place.name?.toLowerCase() || '';

  if (types.includes('bakery') || name.includes('tart') || name.includes('kek'))
    return 'dessert';
  if (types.includes('cafe') || name.includes('kahve'))
    return 'coffee';
  if (name.includes('türk') || name.includes('kebab'))
    return 'local';
  if (types.includes('restaurant'))
    return 'world';
  return 'local';
}
