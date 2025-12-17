import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'AURAMAP_PROFILE_V1';
const USER_DATA_KEY = 'AURAMAP_USER_DATA_V1';

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
