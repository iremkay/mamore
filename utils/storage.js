import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'AURAMAP_PROFILE_V1';
const USER_DATA_KEY = 'AURAMAP_USER_DATA_V1';
const DAILY_ROUTE_KEY = 'AURAMAP_DAILY_ROUTE_V1';
const DAILY_ROUTE_DATE_KEY = 'AURAMAP_DAILY_ROUTE_DATE_V1';

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

