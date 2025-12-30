
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';

const GOOGLE_PLACES_API_KEY = Constants.expoConfig?.extra?.GOOGLE_PLACES_API_KEY || 'AIzaSyChF3pXgB9CQ4HLV58OYUWRQEzEXiVO3H0';
const NEARBY_SEARCH_RADIUS = 5000; // 5km


export async function getCurrentLocation() {
  try {
    // Android için önce izin durumunu kontrol et
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Konum izni verilmedi');
      if (Platform.OS === 'android') {
        Alert.alert(
          'Konum İzni Gerekli',
          'Uygulama çalışması için konum izni vermeniz gerekiyor. Lütfen ayarlardan izin verin.',
          [{ text: 'Tamam' }]
        );
      }
      return null;
    }

    // Android için daha yüksek doğruluk ayarları
    const location = await Location.getCurrentPositionAsync({
      accuracy: Platform.OS === 'android' ? Location.Accuracy.Balanced : Location.Accuracy.Best,
    });
    
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Konum alma hatası:', error);
    return null;
  }
}


export async function getNearbyPlaces(userLocation, profileType, searchTypes) {
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      console.log('Google API Key eksik');
      return null;
    }

    const places = [];
    const seenIds = new Set(); // Dedup için

    // Her kategori için ayrı arama yaptırdım
    for (const keyword of searchTypes) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${userLocation.latitude},${userLocation.longitude}&radius=${NEARBY_SEARCH_RADIUS}&keyword=${keyword}&key=${GOOGLE_PLACES_API_KEY}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        
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


export async function getPlaceDetails(placeId) {
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      console.error('Google API Key eksik!');
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,reviews,formatted_address,photos,opening_hours,formatted_phone_number,website,url&key=${GOOGLE_PLACES_API_KEY}`;

    console.log('Fetching place details for:', placeId);
    const response = await fetch(url.replace(/\n/g, ''));
    const data = await response.json();

    console.log('API Response status:', data.status);
    
    if (data.status === 'REQUEST_DENIED') {
      console.error('API Request Denied:', data.error_message);
      return null;
    }

    if (data.result) {
      console.log('Place details received:', {
        name: data.result.name,
        hasPhone: !!data.result.formatted_phone_number,
        hasHours: !!data.result.opening_hours,
        reviewCount: data.result.reviews?.length || 0,
      });
      
      return {
        name: data.result.name,
        rating: data.result.rating || 0,
        totalRatings: data.result.user_ratings_total || 0,
        address: data.result.formatted_address,
        phone: data.result.formatted_phone_number || 'Telefon bilgisi yok',
        website: data.result.website || null,
        mapsUrl: data.result.url,
        openingHours: data.result.opening_hours?.weekday_text || [],
        photos: data.result.photos || [],
        reviews: (data.result.reviews || []).map(review => ({
          author_name: review.author_name,
          rating: review.rating,
          text: review.text,
          time: formatReviewTime(review.time),
          profile_photo_url: review.profile_photo_url,
        })),
      };
    }

    console.log('No result in API response');
    return null;
  } catch (error) {
    console.error('Place Details hatası:', error);
    return null;
  }
}

// Google'ın timestamp'ini okunabilir formata çevir
function formatReviewTime(timestamp) {
  if (!timestamp) return '';
  
  const reviewDate = new Date(timestamp * 1000);
  const now = new Date();
  const diffInMs = now - reviewDate;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  if (diffInDays === 0) return 'bugün';
  if (diffInDays === 1) return 'dün';
  if (diffInDays < 7) return `${diffInDays} gün önce`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} hafta önce`;
  if (diffInMonths < 12) return `${diffInMonths} ay önce`;
  return `${diffInYears} yıl önce`;
}

/**
 * google fotoğrafları alma hala çalıştıramadım.
 */
export function getPhotoUrl(photoReference, maxWidth = 400) {
  if (!photoReference || !GOOGLE_PLACES_API_KEY) return null;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
}


export function openInGoogleMaps(place) {
  const { latitude, longitude } = place.geometry?.location || {};
  if (latitude && longitude) {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    
    console.log('Google Maps açılacak:', url);
  }
}


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


function transformGooglePlaces(googlePlaces) {
  return googlePlaces.map(place => ({
    id: place.place_id,
    place_id: place.place_id,
    name: place.name,
    address: place.vicinity,
    rating: place.rating || 0,
    latitude: place.geometry?.location?.lat,
    longitude: place.geometry?.location?.lng,
    
    tags: place.types || [],
    vibe: extractVibe(place),
    food: extractFoodType(place),
    photoUrl: place.photos?.[0]?.photo_reference,
  }));
}


function extractVibe(place) {
  const types = place.types || [];
  if (types.includes('night_club') || types.includes('bar')) return 'hareketli';
  if (types.includes('library') || types.includes('park')) return 'sakin';
  return 'orta';
}


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
