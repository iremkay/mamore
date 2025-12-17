import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput } from 'react-native';
import { clearProfile, loadProfile, saveProfile, loadUserData, saveUserData } from '../utils/storage';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [userData, setUserData] = useState({ profilePicture: null, memories: [], favorites: [] });
  const [activeTab, setActiveTab] = useState('profile');
  const [newMemory, setNewMemory] = useState('');

  useEffect(() => {
    (async () => {
      const p = await loadProfile();
      const u = await loadUserData();
      setProfile(p);
      setUserData(u || { profilePicture: null, memories: [], favorites: [] });
    })();
  }, []);

  const addMemory = async () => {
    if (!newMemory.trim()) return;
    const updated = {
      ...userData,
      memories: [...(userData.memories || []), { id: Date.now(), text: newMemory, date: new Date().toLocaleString() }]
    };
    setUserData(updated);
    await saveUserData(updated);
    setNewMemory('');
  };

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

  const reset = async () => {
    await clearProfile();
    navigation.reset({ index: 0, routes: [{ name: 'Survey' }] });
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profil bulunamadı 😅</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Survey')}>
          <Text style={styles.buttonText}>Anketi Doldur</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'memories' && styles.tabActive]}
          onPress={() => setActiveTab('memories')}
        >
          <Text style={[styles.tabText, activeTab === 'memories' && styles.tabTextActive]}>Anılarım</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'favorites' && styles.tabActive]}
          onPress={() => setActiveTab('favorites')}
        >
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>Favorilerim</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'profile' && (
          <>
            {/* Profile Picture Section */}
            <View style={styles.ppSection}>
              <View style={styles.ppContainer}>
                {userData.profilePicture ? (
                  <Image source={{ uri: userData.profilePicture }} style={styles.pp} />
                ) : (
                  <View style={styles.ppPlaceholder}>
                    <Text style={styles.ppText}>📸</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.ppButton}>
                <Text style={styles.ppButtonText}>Profil Fotoğrafı Ekle</Text>
              </TouchableOpacity>
            </View>

            {/* Profile Info */}
            <View style={styles.card}>
              <Text style={styles.big}>{profile.profileType}</Text>
              <Text style={styles.small}>Oluşturulma: {new Date(profile.createdAt).toLocaleString()}</Text>
            </View>

            {/* Answers */}
            <View style={styles.card}>
              <Text style={styles.section}>Cevapların</Text>
              <Row k="Aktivite" v={profile.activity} />
              <Row k="Vibe" v={profile.vibe} />
              <Row k="Bütçe" v={profile.budget} />
              <Row k="Damak" v={profile.food} />
              <Row k="Hava tercihi" v={profile.weather} />
              <Row k="Grup tipi" v={profile.group} />
              <Row k="İlgi alanları" v={profile.interests && profile.interests.length > 0 ? profile.interests.join(', ') : '-'} />
            </View>

            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Survey')}>
              <Text style={styles.buttonText}>Anketi Güncelle</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.danger} onPress={reset}>
              <Text style={styles.dangerText}>Profili Sıfırla</Text>
            </TouchableOpacity>
          </>
        )}

        {activeTab === 'memories' && (
          <>
            <Text style={styles.tabTitle}>Deneyimlerini Paylaş 📸</Text>
            
            <View style={styles.card}>
              <TextInput
                style={styles.memoryInput}
                placeholder="Bugün nereye gittim? Ne yapıştım? 🌟"
                multiline
                numberOfLines={3}
                value={newMemory}
                onChangeText={setNewMemory}
              />
              <TouchableOpacity style={styles.button} onPress={addMemory}>
                <Text style={styles.buttonText}>Anıyı Kaydet</Text>
              </TouchableOpacity>
            </View>

            {(userData.memories || []).length > 0 ? (
              (userData.memories || []).map(memory => (
                <View key={memory.id} style={styles.memoryCard}>
                  <Text style={styles.memoryText}>{memory.text}</Text>
                  <Text style={styles.memoryDate}>{memory.date}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Henüz anı kaydedilmemiş. İlk deneyimini paylaş! 🎯</Text>
            )}
          </>
        )}

        {activeTab === 'favorites' && (
          <>
            <Text style={styles.tabTitle}>Favori Mekanlarım ❤️</Text>
            
            {(userData.favorites || []).length > 0 ? (
              (userData.favorites || []).map(place => (
                <View key={place.id} style={styles.favoriteCard}>
                  <View style={styles.favoriteHeader}>
                    <Text style={styles.favoriteName}>{place.name}</Text>
                    <Text style={styles.favoriteHeart}>❤️</Text>
                  </View>
                  <Text style={styles.favoriteAddr}>{place.address}</Text>
                  <Text style={styles.favoriteMeta}>⭐ {place.rating} • {place.vibe} vibe • {place.food} damak</Text>
                  <TouchableOpacity 
                    style={styles.removeFavBtn}
                    onPress={() => toggleFavorite(place)}
                  >
                    <Text style={styles.removeFavBtnText}>Favorilerden Çıkar</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Henüz favori mekan yok. Önerileri keşfet! 🗺️</Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Row({ k, v }) {
  return (
    <View style={styles.row}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{String(v)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#fff7ed' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: '#f3f4f6' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#f97316' },
  tabText: { fontSize: 14, fontWeight: '800', color: '#9ca3af' },
  tabTextActive: { color: '#f97316' },
  content: { paddingHorizontal: 14, paddingVertical: 12, paddingBottom: 20 },

  ppSection: { alignItems: 'center', marginBottom: 18 },
  ppContainer: { marginBottom: 10 },
  pp: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#f97316' },
  ppPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#ffedd5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fb923c' },
  ppText: { fontSize: 50 },
  ppButton: { backgroundColor: '#f97316', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
  ppButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  container: { padding: 14, backgroundColor: '#fff7ed', flexGrow: 1 },
  title: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, elevation: 2 },
  big: { fontSize: 18, fontWeight: '900', color: '#7c2d12' },
  small: { marginTop: 6, color: '#6b7280', fontSize: 12 },
  section: { fontSize: 15, fontWeight: '900', color: '#111827', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  k: { color: '#374151', fontWeight: '800' },
  v: { color: '#111827', maxWidth: '55%', textAlign: 'right' },
  button: { backgroundColor: '#f97316', paddingVertical: 12, borderRadius: 999, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#fff', fontWeight: '900' },
  danger: { marginTop: 10, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: '#ef4444', alignItems: 'center' },
  dangerText: { color: '#ef4444', fontWeight: '900' },

  tabTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 14 },
  memoryInput: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', minHeight: 80, color: '#111827', marginBottom: 10 },
  memoryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#f97316' },
  memoryText: { color: '#111827', fontSize: 14, lineHeight: 20 },
  memoryDate: { color: '#9ca3af', fontSize: 11, marginTop: 8 },

  favoriteCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2 },
  favoriteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  favoriteName: { fontSize: 15, fontWeight: '900', color: '#111827', flex: 1 },
  favoriteHeart: { fontSize: 18, marginLeft: 8 },
  favoriteAddr: { color: '#4b5563', fontSize: 12, marginBottom: 6 },
  favoriteMeta: { color: '#9ca3af', fontSize: 12, marginBottom: 10 },
  removeFavBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  removeFavBtnText: { color: '#ef4444', fontWeight: '900', fontSize: 12 },

  emptyText: { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 20 },
});
