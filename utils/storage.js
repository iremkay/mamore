import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'AURAMAP_PROFILE_V1';
const USER_DATA_KEY = 'AURAMAP_USER_DATA_V1';
const DAILY_ROUTE_KEY = 'AURAMAP_DAILY_ROUTE_V1';
const DAILY_ROUTE_DATE_KEY = 'AURAMAP_DAILY_ROUTE_DATE_V1';
const AUTH_KEY = 'AURAMAP_AUTH_V1';

export async function saveProfile(profile) {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadProfile() {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearProfile() {
  await AsyncStorage.removeItem(PROFILE_KEY);
}

export async function saveUserData(userData) {
  await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
}

export async function loadUserData() {
  const raw = await AsyncStorage.getItem(USER_DATA_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearUserData() {
  await AsyncStorage.removeItem(USER_DATA_KEY);
}

// Günlük Rota Yönetimi
export async function saveDailyRoute(route) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı
  await AsyncStorage.setItem(DAILY_ROUTE_KEY, JSON.stringify(route));
  await AsyncStorage.setItem(DAILY_ROUTE_DATE_KEY, today);
}

export async function loadDailyRoute() {
  const today = new Date().toISOString().split('T')[0];
  const savedDate = await AsyncStorage.getItem(DAILY_ROUTE_DATE_KEY);
  
  // Farklı gün ise, eski rotayı sil ve null döndür
  if (savedDate !== today) {
    await clearDailyRoute();
    return null;
  }

  const raw = await AsyncStorage.getItem(DAILY_ROUTE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearDailyRoute() {
  await AsyncStorage.removeItem(DAILY_ROUTE_KEY);
  await AsyncStorage.removeItem(DAILY_ROUTE_DATE_KEY);
}

// Authentication Yönetimi
export async function saveAuth(authData) {
  // authData: { email, username, password (hashed), isLoggedIn }
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authData));
}

export async function loadAuth() {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAuth() {
  await AsyncStorage.removeItem(AUTH_KEY);
}

export async function updateUsername(newUsername) {
  const auth = await loadAuth();
  if (auth) {
    auth.username = newUsername;
    await saveAuth(auth);
  }
}

// Followers/Following Management
const FOLLOWERS_KEY = 'AURAMAP_FOLLOWERS_V1';
const FOLLOWING_KEY = 'AURAMAP_FOLLOWING_V1';
const ALL_USERS_KEY = 'AURAMAP_ALL_USERS_V1';

export async function getAllUsers() {
  const raw = await AsyncStorage.getItem(ALL_USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveAllUsers(users) {
  await AsyncStorage.setItem(ALL_USERS_KEY, JSON.stringify(users));
}

export async function addUserToAll(user) {
  const users = await getAllUsers();
  const existing = users.find(u => u.email === user.email);
  if (!existing) {
    users.push({
      email: user.email,
      username: user.username,
      profilePicture: null,
      createdAt: user.createdAt
    });
    await saveAllUsers(users);
  }
}

export async function getFollowers() {
  const raw = await AsyncStorage.getItem(FOLLOWERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getFollowing() {
  const raw = await AsyncStorage.getItem(FOLLOWING_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function followUser(userEmail) {
  const following = await getFollowing();
  if (!following.includes(userEmail)) {
    following.push(userEmail);
    await AsyncStorage.setItem(FOLLOWING_KEY, JSON.stringify(following));
  }
}

export async function unfollowUser(userEmail) {
  const following = await getFollowing();
  const updated = following.filter(email => email !== userEmail);
  await AsyncStorage.setItem(FOLLOWING_KEY, JSON.stringify(updated));
}

export async function addFollower(userEmail) {
  const followers = await getFollowers();
  if (!followers.includes(userEmail)) {
    followers.push(userEmail);
    await AsyncStorage.setItem(FOLLOWERS_KEY, JSON.stringify(followers));
  }
}

// Travel Passport & Stamps (Gezi Pasaportu & Pullar)

// Kategori bazlı pul tanımları
export const STAMP_CATEGORIES = {
  culture: { 
    key: 'culture', 
    name: '🎨 Sanat Kaşifi', 
    emoji: '🎨',
    color: '#8b5cf6',
    description: 'Müze ve sanat mekanlarını keşfet'
  },
  nature: { 
    key: 'nature', 
    name: '🌿 Doğa Gezgini', 
    emoji: '🌿',
    color: '#10b981',
    description: 'Parkları ve doğal alanları keşfet'
  },
  foodie: { 
    key: 'foodie', 
    name: '🍽️ Lezzet Avcısı', 
    emoji: '🍽️',
    color: '#f59e0b',
    description: 'Restoranları ve kafeleri keşfet'
  },
  fun: { 
    key: 'fun', 
    name: '🎮 Eğlence Tutkunsu', 
    emoji: '🎮',
    color: '#ec4899',
    description: 'Eğlence mekanlarını keşfet'
  },
  laptop: { 
    key: 'laptop', 
    name: '☕ Kahve Tiryakisi', 
    emoji: '☕',
    color: '#6366f1',
    description: 'Çalışma dostu kafeleri keşfet'
  },
};

export async function loadStamps(uid) {
  if (!uid) return {
    stamps: [],
    totalVisits: 0,
    categoryStats: {
      culture: 0,
      nature: 0,
      foodie: 0,
      fun: 0,
      laptop: 0,
    }
  };
  
  const STAMPS_KEY = `AURAMAP_STAMPS_${uid}`;
  const raw = await AsyncStorage.getItem(STAMPS_KEY);
  return raw ? JSON.parse(raw) : {
    stamps: [], // { placeId, placeName, category, timestamp, location }
    totalVisits: 0,
    categoryStats: {
      culture: 0,
      nature: 0,
      foodie: 0,
      fun: 0,
      laptop: 0,
    }
  };
}

export async function addStamp(place, category, uid) {
  if (!uid) return { success: false, message: 'Kullanıcı bilgisi bulunamadı' };
  
  const stamps = await loadStamps(uid);
  const STAMPS_KEY = `AURAMAP_STAMPS_${uid}`;
  
  // Aynı mekan için birden fazla check-in engelle (son 24 saat)
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const alreadyCheckedIn = stamps.stamps.some(
    s => s.placeId === place.id && new Date(s.timestamp).getTime() > oneDayAgo
  );
  
  if (alreadyCheckedIn) {
    return { success: false, message: 'Bu mekana bugün zaten check-in yaptınız!' };
  }
  
  // Yeni pul ekle
  const newStamp = {
    placeId: place.id || place.place_id,
    placeName: place.name,
    placeAddress: place.address,
    category: category,
    timestamp: new Date().toISOString(),
    location: {
      latitude: place.latitude,
      longitude: place.longitude,
    }
  };
  
  stamps.stamps.unshift(newStamp); // En yeni başta olsun
  stamps.totalVisits += 1;
  stamps.categoryStats[category] = (stamps.categoryStats[category] || 0) + 1;
  
  await AsyncStorage.setItem(STAMPS_KEY, JSON.stringify(stamps));
  
  return { success: true, stamp: newStamp, totalStamps: stamps.stamps.length };
}

export async function clearStamps(uid) {
  if (uid) {
    const STAMPS_KEY = `AURAMAP_STAMPS_${uid}`;
    await AsyncStorage.removeItem(STAMPS_KEY);
  }
}
