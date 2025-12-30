import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, Alert, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { loadProfile, loadUserData, saveUserData, loadAuth } from '../utils/storage';
import { 
  getUserProfile, 
  getFollowersFirebase,
  getFollowingFirebase,
  createMemory
} from '../utils/firebaseService';

export default function MemoriesScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [userData, setUserData] = useState({ profilePicture: null, memories: [], favorites: [] });
  const [newMemory, setNewMemory] = useState('');
  const [memoryPhotos, setMemoryPhotos] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const p = await loadProfile();
        const u = await loadUserData();
        const auth = await loadAuth(); // loadAuth kullan, getCurrentUser yerine
        
        if (auth && auth.uid) {
          const profileResult = await getUserProfile(auth.uid);
          if (profileResult.success) {
            setCurrentUserProfile(profileResult.data);
            
            // Followers ve Following'i yükle
            const followersResult = await getFollowersFirebase(auth.uid);
            const followingResult = await getFollowingFirebase(auth.uid);
            
            if (followersResult.success) setFollowers(followersResult.followers);
            if (followingResult.success) setFollowing(followingResult.following);
          }
          // Auth objesini currentUser olarak kaydet (uid, email, username içeriyor)
          setCurrentUser(auth);
        }
        
        setProfile(p);
        setUserData(u || { profilePicture: null, memories: [], favorites: [] });
      } catch (error) {
        console.error('MemoriesScreen data load error:', error);
      }
    };
    
    loadData();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    
    return unsubscribe;
  }, [navigation]);

  const addMemory = async () => {
    if (!currentUser) {
      Alert.alert('Giriş Gerekli', 'Anı eklemek için giriş yapmalısın', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }
    if (!newMemory.trim()) return;
    
    try {
      // Firebase'e kaydet
      const memoryData = {
        placeName: 'Genel Anı',
        note: newMemory,
        photo: memoryPhotos.length > 0 ? memoryPhotos[0] : null
      };
      
      await createMemory(currentUser.uid, memoryData);
      
      // AsyncStorage'a da kaydet (yerel kopya)
      const updated = {
        ...userData,
        memories: [...(userData.memories || []), { 
          id: Date.now(), 
          text: newMemory, 
          photos: memoryPhotos,
          date: new Date().toLocaleString() 
        }]
      };
      setUserData(updated);
      await saveUserData(updated);
      setNewMemory('');
      setMemoryPhotos([]);
      Alert.alert('Başarılı', 'Anı eklendi!');
    } catch (error) {
      console.error('Anı ekleme hatası:', error);
      Alert.alert('Hata', 'Anı eklenirken bir hata oluştu');
    }
  };

  const pickMemoryPhoto = async () => {
    if (!currentUser) {
      Alert.alert('Giriş Gerekli', 'Fotoğraf eklemek için giriş yapmalısın', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }
    try {
      if (memoryPhotos.length >= 5) {
        Alert.alert('Limit', 'Maksimum 5 fotoğraf ekleyebilirsiniz');
        return;
      }

      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeriye erişebilmek için izin vermelisiniz');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setMemoryPhotos([...memoryPhotos, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', `Fotoğraf seçerken bir hata oluştu: ${error.message}`);
    }
  };

  const removeMemoryPhoto = (index) => {
    setMemoryPhotos(memoryPhotos.filter((_, i) => i !== index));
  };

  const deleteMemory = async (memoryId) => {
    if (!currentUser) {
      Alert.alert('Giriş Gerekli', 'Anı silmek için giriş yapmalısın');
      return;
    }
    const updated = {
      ...userData,
      memories: (userData.memories || []).filter(m => m.id !== memoryId)
    };
    setUserData(updated);
    await saveUserData(updated);
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Add New Memory */}
        <View style={styles.card}>
          <Text style={styles.section}>✨ Yeni Anı Ekle</Text>
          <TextInput
            style={styles.memoryInput}
            placeholder="Bugün nereye gittim? Ne yaptım? 🌟"
            multiline
            numberOfLines={3}
            value={newMemory}
            onChangeText={setNewMemory}
            placeholderTextColor="#9ca3af"
          />
          
          {memoryPhotos.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.photosPreviewContainer}
            >
              {memoryPhotos.map((photo, index) => (
                <View key={index} style={styles.memoryPhotoPreview}>
                  <Image source={{ uri: photo }} style={styles.memoryPhoto} />
                  <TouchableOpacity 
                    style={styles.removePhotoBtn}
                    onPress={() => removeMemoryPhoto(index)}
                  >
                    <Text style={styles.removePhotoText}>❌</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.memoryActions}>
            <TouchableOpacity 
              style={{ flex: 1 }}
              onPress={pickMemoryPhoto}
            >
              <View style={styles.photoButton}>
                <Text style={styles.photoButtonText}>
                  📷 Fotoğraf Ekle {memoryPhotos.length > 0 && `(${memoryPhotos.length}/5)`}
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ flex: 1 }}
              onPress={addMemory}
            >
              <LinearGradient
                colors={['#0F7C5B', '#0a5a43', '#0F7C5B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveButton}
              >
                <Text style={styles.buttonText}>Kaydet</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Memories Feed */}
        <View style={styles.card}>
          <Text style={styles.section}>📖 Anılarım</Text>
          {(userData.memories || []).length > 0 ? (
            (userData.memories || []).slice().reverse().map(memory => (
              <View key={memory.id} style={styles.memoryCard}>
                <View style={styles.memoryCardHeader}>
                  <View style={styles.memoryProfileContainer}>
                    {userData.profilePicture ? (
                      <Image source={{ uri: userData.profilePicture }} style={styles.memoryProfilePic} />
                    ) : (
                      <View style={styles.memoryProfilePlaceholder}>
                        <Text style={styles.memoryProfileIcon}>👤</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.memoryProfileInfo}>
                    <Text style={styles.memoryProfileType}>{currentUserProfile?.username || currentUser?.displayName || 'Gezgin'}</Text>
                    <Text style={styles.memoryProfileDate}>{memory.date}</Text>
                  </View>
                </View>

                {(memory.photos && memory.photos.length > 0) ? (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.memoryPhotosContainer}
                  >
                    {memory.photos.map((photo, index) => (
                      <Image 
                        key={index} 
                        source={{ uri: photo }} 
                        style={styles.memoryCardPhoto} 
                      />
                    ))}
                  </ScrollView>
                ) : memory.photo ? (
                  <Image source={{ uri: memory.photo }} style={styles.memoryCardPhoto} />
                ) : null}

                <Text style={styles.memoryText}>{memory.text}</Text>
                <TouchableOpacity 
                  style={styles.deleteMemoryBtn}
                  onPress={() => {
                    Alert.alert(
                      'Anıyı Sil',
                      'Bu anıyı silmek istediğine emin misin?',
                      [
                        { text: 'İptal', style: 'cancel' },
                        { text: 'Sil', onPress: () => deleteMemory(memory.id), style: 'destructive' }
                      ]
                    );
                  }}
                >
                  <Text style={styles.deleteMemoryText}>🗑️ Sil</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Henüz anı kaydedilmemiş. İlk deneyimini paylaş! 🎯</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F5F5F0' },

  content: { paddingHorizontal: 14, paddingVertical: 12, paddingBottom: 20 },

  container: { padding: 20, backgroundColor: '#F5F5F0', flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 20, textAlign: 'center' },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, elevation: 2 },
  searchHeader: { marginBottom: 8 },
  section: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 12 },
  
  saveButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, alignItems: 'center', elevation: 6, shadowColor: '#0F7C5B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6 },
  button: { backgroundColor: '#0F7C5B', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, alignItems: 'center', flex: 1 },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  searchInput: { backgroundColor: '#F5F5F0', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5B0A8', fontSize: 14, color: '#111827', marginBottom: 8 },
  searchButton: { backgroundColor: '#0F7C5B', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  searchButtonText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  
  userCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0F7C5B', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userAvatarText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  userDetails: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '900', color: '#111827', marginBottom: 2 },
  userEmail: { fontSize: 12, color: '#6b7280' },
  
  followBtn: { backgroundColor: '#0F7C5B', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  followBtnText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  followingBtn: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#22c55e' },
  followingBtnText: { color: '#22c55e' },

  memoryInput: { backgroundColor: '#F5F5F0', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5B0A8', minHeight: 80, color: '#111827', marginBottom: 10, fontSize: 14 },
  
  photosPreviewContainer: { marginBottom: 10, maxHeight: 220 },
  memoryPhotoPreview: { position: 'relative', marginRight: 10, borderRadius: 12, overflow: 'hidden', width: 160, height: 200 },
  memoryPhoto: { width: 160, height: 200, borderRadius: 12 },
  removePhotoBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  removePhotoText: { fontSize: 16 },
  
  memoryActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  photoButton: { flex: 1, backgroundColor: '#F5F5F0', paddingVertical: 12, borderRadius: 999, alignItems: 'center', borderWidth: 2, borderColor: '#FFB30F' },
  photoButtonText: { color: '#5A2447', fontWeight: '900', fontSize: 13 },
  
  memoryCard: { backgroundColor: '#F5F5F0', borderRadius: 12, padding: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#0F7C5B' },
  memoryCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E5B0A8' },
  memoryProfileContainer: { marginRight: 10 },
  memoryProfilePic: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#0F7C5B' },
  memoryProfilePlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFB30F' },
  memoryProfileIcon: { fontSize: 20 },
  memoryProfileInfo: { flex: 1 },
  memoryProfileType: { fontSize: 13, fontWeight: '900', color: '#111827' },
  memoryProfileDate: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  memoryPhotosContainer: { marginBottom: 10 },
  memoryCardPhoto: { width: 250, height: 180, borderRadius: 8, marginRight: 8 },
  memoryText: { color: '#111827', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  deleteMemoryBtn: { backgroundColor: '#fef2f2', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  deleteMemoryText: { color: '#ef4444', fontWeight: '900', fontSize: 12 },

  emptyText: { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 10, fontStyle: 'italic' },
});
