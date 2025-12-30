import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, Alert, Modal, ImageBackground } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { CommonActions } from '@react-navigation/native';
import { clearProfile, loadProfile, saveProfile, loadUserData, saveUserData, loadAuth, updateUsername, clearAuth, getFollowers, getFollowing, getAllUsers, followUser, unfollowUser, loadStamps, STAMP_CATEGORIES } from '../utils/storage';
import { getUserProfile, getFollowersFirebase, getFollowingFirebase, uploadProfilePicture } from '../utils/firebaseService';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [userData, setUserData] = useState({ profilePicture: null, memories: [], favorites: [] });
  const [showImageModal, setShowImageModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [auth, setAuth] = useState(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [stamps, setStamps] = useState(null);
  const [showPassport, setShowPassport] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState(null);

  useEffect(() => {
    // Header'a ayarlar butonunu ekle
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => setShowSettingsModal(true)}
          style={{ marginRight: 15 }}
        >
          <Text style={{ fontSize: 24, color: '#fff' }}>⚙️</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    const loadData = async () => {
      let profileResult = null;
      try {
        const a = await loadAuth();
        
        // Eğer auth varsa, Firebase'den profil çek
        if (a && a.uid) {
          profileResult = await getUserProfile(a.uid);
          console.log('🔍 ProfileScreen - Firebase profil sonucu:', profileResult);
          
          if (profileResult.success) {
            // Yerel profil verisini al (anket verileri için)
            const localProfile = await loadProfile();
            console.log('🔍 ProfileScreen - Local profil:', { profileType: localProfile?.profileType, profileKey: localProfile?.profileKey });
            
            // Firebase'den gelen profil verilerini yerel anket verileriyle birleştir
            const mergedProfile = {
              ...localProfile, // Anket verileri (profileType, profileKey, activity, vibe, etc.)
              username: profileResult.data.username,
              email: profileResult.data.email,
              uid: a.uid,
              // Firebase'den gelen anket verilerini de ekle (varsa üzerine yaz)
              ...(profileResult.data.profileType && { profileType: profileResult.data.profileType }),
              ...(profileResult.data.profileKey && { profileKey: profileResult.data.profileKey }),
              ...(profileResult.data.activity && { activity: profileResult.data.activity }),
              ...(profileResult.data.vibe && { vibe: profileResult.data.vibe }),
              ...(profileResult.data.budget && { budget: profileResult.data.budget }),
              ...(profileResult.data.food && { food: profileResult.data.food }),
              ...(profileResult.data.weather && { weather: profileResult.data.weather }),
              ...(profileResult.data.group && { group: profileResult.data.group }),
              ...(profileResult.data.interests && { interests: profileResult.data.interests }),
            };
            console.log('✅ Profil birleştirildi:', { 
              profileType: mergedProfile.profileType, 
              profileKey: mergedProfile.profileKey,
              username: mergedProfile.username 
            });
            await saveProfile(mergedProfile);
            setProfile(mergedProfile);
            
            // Firebase'den takipçi ve takip edilen listelerini çek
            const followersResult = await getFollowersFirebase(a.uid);
            const followingResult = await getFollowingFirebase(a.uid);
            
            if (followersResult.success) {
              setFollowers(followersResult.followers || []);
            } else {
              const f = await getFollowers();
              setFollowers(f || []);
            }
            
            if (followingResult.success) {
              setFollowing(followingResult.following || []);
            } else {
              const fg = await getFollowing();
              setFollowing(fg || []);
            }
          } else {
            // Firebase'de bulunamadıysa yerel storage'dan yükle
            const p = await loadProfile();
            setProfile(p);
            const f = await getFollowers();
            const fg = await getFollowing();
            setFollowers(f || []);
            setFollowing(fg || []);
          }
        } else {
          // Auth yoksa yerel storage'dan y\u00fckle
          const p = await loadProfile();
          setProfile(p);
          const f = await getFollowers();
          const fg = await getFollowing();
          setFollowers(f || []);
          setFollowing(fg || []);
        }
        
        const u = await loadUserData();
        const stampsData = await loadStamps(a?.uid);
        
        // Firebase'den profil fotoğrafını al ve yerel storage'a kaydet
        if (a && a.uid && profileResult && profileResult.success) {
          const updatedUserData = {
            ...u,
            profilePicture: profileResult.data.profilePicture || null
          };
          await saveUserData(updatedUserData);
          setUserData(updatedUserData);
        } else {
          setUserData(u || { profilePicture: null, memories: [], favorites: [] });
        }
        
        setAuth(a);
        setNewUsername(a?.username || '');
        setStamps(stampsData);
      } catch (error) {
        console.error('ProfileScreen data load error:', error);
        // Hata durumunda temel verileri yüklemeye çalış
        try {
          const a = await loadAuth();
          const p = await loadProfile();
          const u = await loadUserData();
          if (a) {
            setAuth(a);
            setProfile(p);
            setUserData(u || { profilePicture: null, memories: [], favorites: [] });
            setNewUsername(a?.username || '');
            setFollowers([]);
            setFollowing([]);
          }
        } catch (fallbackError) {
          console.error('Fallback load error:', fallbackError);
        }
      }
    };
    
    loadData();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    
    return unsubscribe;
  }, [navigation]);

  const pickImageFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeriye erişebilmek için izin vermelisiniz');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        
        // Firebase'e yükle
        if (auth && auth.uid) {
          // Yükleniyor göstergesi için geçici olarak fotoğrafı göster
          const tempUpdated = {
            ...userData,
            profilePicture: imageUri,
          };
          setUserData(tempUpdated);
          setShowImageModal(false);
          
          Alert.alert('Yükleniyor', 'Profil fotoğrafı yükleniyor, lütfen bekleyin...');
          
          const uploadResult = await uploadProfilePicture(auth.uid, imageUri);
          
          if (uploadResult.success) {
            const updated = {
              ...userData,
              profilePicture: uploadResult.url, // Firebase'den gelen URL'yi kullan
            };
            setUserData(updated);
            await saveUserData(updated);
            Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
          } else {
            // Hata durumunda eski fotoğrafı geri yükle
            setUserData(userData);
            Alert.alert('Hata', uploadResult.error || 'Fotoğraf yüklenemedi');
          }
        } else {
          Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı');
        }
      }
    } catch (error) {
      console.error('Galeri hatası:', error);
      Alert.alert('Hata', `Fotoğraf seçerken bir hata oluştu: ${error.message}`);
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamerayı kullanabilmek için izin vermelisiniz');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        
        // Firebase'e yükle
        if (auth && auth.uid) {
          // Yükleniyor göstergesi için geçici olarak fotoğrafı göster
          const tempUpdated = {
            ...userData,
            profilePicture: imageUri,
          };
          setUserData(tempUpdated);
          setShowImageModal(false);
          
          Alert.alert('Yükleniyor', 'Profil fotoğrafı yükleniyor, lütfen bekleyin...');
          
          const uploadResult = await uploadProfilePicture(auth.uid, imageUri);
          
          if (uploadResult.success) {
            const updated = {
              ...userData,
              profilePicture: uploadResult.url, // Firebase'den gelen URL'yi kullan
            };
            setUserData(updated);
            await saveUserData(updated);
            Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
          } else {
            // Hata durumunda eski fotoğrafı geri yükle
            setUserData(userData);
            Alert.alert('Hata', uploadResult.error || 'Fotoğraf yüklenemedi');
          }
        } else {
          Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı');
        }
      }
    } catch (error) {
      console.error('Kamera hatası:', error);
      Alert.alert('Hata', `Kamera açılırken bir hata oluştu: ${error.message}`);
    }
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
    navigation.navigate('SurveyUpdate');
  };

  const handleUsernameUpdate = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Hata', 'Kullanıcı adı boş olamaz');
      return;
    }
    await updateUsername(newUsername.trim());
    const updatedAuth = await loadAuth();
    setAuth(updatedAuth);
    setEditingUsername(false);
    Alert.alert('Başarılı', 'Kullanıcı adın güncellendi!');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğine emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            await clearAuth();
            await clearProfile();
            await saveUserData({ profilePicture: null, memories: [], favorites: [] });
            navigation.getParent()?.getParent()?.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            );
          },
        },
      ]
    );
  };

  const suggestRoute = () => {
    if (!userData.favorites || userData.favorites.length < 3) {
      Alert.alert(
        'Yetersiz Favori',
        'Rota oluşturmak için en az 3 favori mekan eklemelisin. Önce HomeScreen\'den keşfet ve favorilere ekle!',
        [{ text: 'Tamam' }]
      );
      return;
    }

    // Favorilerden 3 yer seç (kahvaltı, aktivite, kahve)
    const coffeeSpots = userData.favorites.filter(p => 
      p.tags?.includes('cafe') || p.food === 'coffee'
    );
    const activitySpots = userData.favorites.filter(p => 
      p.tags?.includes('park') || p.tags?.includes('museum') || p.vibe === 'hareketli'
    );
    const breakfastSpots = userData.favorites.filter(p => 
      p.tags?.includes('restaurant') || p.food === 'local' || p.food === 'world'
    );

    const selectedPlaces = [
      breakfastSpots[Math.floor(Math.random() * breakfastSpots.length)] || userData.favorites[0],
      activitySpots[Math.floor(Math.random() * activitySpots.length)] || userData.favorites[1],
      coffeeSpots[Math.floor(Math.random() * coffeeSpots.length)] || userData.favorites[2],
    ];

    navigation.navigate('Route', {
      route: selectedPlaces,
      profile: profile,
      category: 'Favorilerimden Rota',
      isNewRoute: true
    });
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profil bulunamadı 😅</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('SurveyUpdate')}>
          <Text style={styles.buttonText}>Anketi Doldur</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/profile-bg.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.backgroundOverlay}>
        <View style={styles.mainContainer}>
      {/* Modal - Kamera / Galeri Seçimi */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Fotoğraf Seç</Text>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={pickImageFromCamera}
            >
              <Text style={styles.modalButtonIcon}>📷</Text>
              <Text style={styles.modalButtonText}>Kameradan Fotoğraf Çek</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalButton}
              onPress={pickImageFromGallery}
            >
              <Text style={styles.modalButtonIcon}>🖼️</Text>
              <Text style={styles.modalButtonText}>Galeriden Seç</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowImageModal(false)}
            >
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ayarlar Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Profil Ayarları</Text>
            
            <TouchableOpacity 
              style={styles.settingsOption}
              onPress={() => {
                setShowSettingsModal(false);
                setEditingUsername(true);
              }}
            >
              <Text style={styles.settingsIcon}>✏️</Text>
              <Text style={styles.settingsText}>Kullanıcı Adını Değiştir</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingsOption}
              onPress={() => {
                setShowSettingsModal(false);
                setShowImageModal(true);
              }}
            >
              <Text style={styles.settingsIcon}>📸</Text>
              <Text style={styles.settingsText}>Profil Fotoğrafını Değiştir</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingsOption}
              onPress={() => {
                setShowSettingsModal(false);
                // ProfileStack içindeki SurveyUpdate'e git
                navigation.navigate('SurveyUpdate');
              }}
            >
              <Text style={styles.settingsIcon}>📝</Text>
              <Text style={styles.settingsText}>Anketi Güncelle</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.settingsOption, styles.logoutOption]}
              onPress={() => {
                setShowSettingsModal(false);
                handleLogout();
              }}
            >
              <Text style={styles.settingsIcon}>🚪</Text>
              <Text style={[styles.settingsText, styles.logoutText]}>Çıkış Yap</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
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
              <TouchableOpacity 
                style={styles.ppButton}
                onPress={() => setShowImageModal(true)}
              >
                <Text style={styles.ppButtonText}>Profil Fotoğrafı Ekle</Text>
              </TouchableOpacity>

              {/* Social Stats - below profile picture */}
              {auth && (
                <View style={styles.socialStatsBelow}>
                  <TouchableOpacity 
                    style={styles.statBox}
                    onPress={() => navigation.navigate('FollowersFollowing', { type: 'followers' })}
                  >
                    <Text style={styles.statNumber}>{followers.length}</Text>
                    <Text style={styles.statLabel}>Takipçi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.statBox}
                    onPress={() => navigation.navigate('FollowersFollowing', { type: 'following' })}
                  >
                    <Text style={styles.statNumber}>{following.length}</Text>
                    <Text style={styles.statLabel}>Takip</Text>
                  </TouchableOpacity>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{(userData.memories || []).length}</Text>
                    <Text style={styles.statLabel}>Anı</Text>
                  </View>
                </View>
              )}
            </View>

            {/* User Account Info */}
            {auth ? (
              <View style={styles.card}>
                <Text style={styles.section}>Hesap Bilgileri</Text>
                
                <View style={styles.accountRow}>
                  <Text style={styles.accountLabel}>Email:</Text>
                  <Text style={styles.accountValue}>{auth.email}</Text>
                </View>

                <View style={styles.accountRow}>
                  <Text style={styles.accountLabel}>Kullanıcı Adı:</Text>
                  {editingUsername ? (
                    <View style={styles.usernameEditContainer}>
                      <TextInput
                        style={styles.usernameInput}
                        value={newUsername}
                        onChangeText={setNewUsername}
                        autoFocus
                      />
                      <TouchableOpacity 
                        style={styles.saveUsernameBtn}
                        onPress={handleUsernameUpdate}
                      >
                        <Text style={styles.saveUsernameText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.cancelUsernameBtn}
                        onPress={() => {
                          setEditingUsername(false);
                          setNewUsername(auth.username);
                        }}
                      >
                        <Text style={styles.cancelUsernameText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.usernameViewContainer}>
                      <Text style={styles.accountValue}>{auth.username}</Text>
                      <TouchableOpacity 
                        onPress={() => setEditingUsername(true)}
                        style={styles.editUsernameBtn}
                      >
                        <Text style={styles.editUsernameText}>✏️</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {profile && (
                  <View style={styles.accountRow}>
                    <Text style={styles.accountLabel}>Profil Kategorisi:</Text>
                    <Text style={styles.accountValue}>{profile.profileType}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.section}>Hesap</Text>
                <Text style={styles.loginPrompt}>
                  Giriş yaparak deneyimlerini kaydet, favorilerini sakla ve daha fazlası! 🎉
                </Text>
                <TouchableOpacity 
                  style={styles.loginButton}
                  onPress={() => {
                    navigation.getParent()?.getParent()?.dispatch(
                      CommonActions.navigate('Login')
                    );
                  }}
                >
                  <Text style={styles.loginButtonText}>🔐 Giriş Yap / Kayıt Ol</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Gezi Pasaportu - sadece profil varsa göster */}
            {profile && (
              <>
                <TouchableOpacity 
                  style={styles.passportButton} 
                  onPress={() => setShowPassport(!showPassport)}
                >
                  <Text style={styles.passportButtonText}>
                    🎫 Gezi Pasaportum ({stamps?.totalVisits || 0} ziyaret)
                  </Text>
                </TouchableOpacity>

                {showPassport && stamps && (
                  <View style={styles.passportCard}>
                    <View style={styles.passportHeader}>
                      <Text style={styles.passportTitle}>🌍 GEZİ PASAPORTU</Text>
                      <Text style={styles.passportSubtitle}>Keşif Kaşifi Belgesi</Text>
                    </View>

                    <View style={styles.passportStats}>
                      <View style={styles.passportStat}>
                        <Text style={styles.passportStatNumber}>{stamps.totalVisits}</Text>
                        <Text style={styles.passportStatLabel}>Toplam Ziyaret</Text>
                      </View>
                      <View style={styles.passportStat}>
                        <Text style={styles.passportStatNumber}>{stamps.stamps.length}</Text>
                        <Text style={styles.passportStatLabel}>Toplam Pul</Text>
                      </View>
                    </View>

                    <Text style={styles.stampSectionTitle}>🏆 Kazanılan Pullar</Text>
                    <View style={styles.stampsGrid}>
                      {Object.values(STAMP_CATEGORIES).map((category) => {
                        const count = stamps.categoryStats[category.key] || 0;
                        const getStampImage = (key) => {
                          if (key === 'laptop') return require('../assets/stamps/kahve-tiryakisi.png');
                          if (key === 'nature') return require('../assets/stamps/doga-gezgini.png');
                          if (key === 'culture') return require('../assets/stamps/kultur-meraklisi.png');
                          if (key === 'foodie') return require('../assets/stamps/gurme.png');
                          if (key === 'fun') return require('../assets/stamps/eglence-asigi.png');
                          return null;
                        };
                        
                        return (
                          <View 
                            key={category.key} 
                            style={[
                              styles.stampBadge,
                              { borderColor: category.color, backgroundColor: count > 0 ? category.color + '20' : '#334155' }
                            ]}
                          >
                            <TouchableOpacity onPress={() => setSelectedStamp({ image: getStampImage(category.key), name: category.name, color: category.color })}>
                              {getStampImage(category.key) ? (
                                <Image 
                                  source={getStampImage(category.key)} 
                                  style={styles.stampImage}
                                />
                              ) : (
                                <Text style={styles.stampEmoji}>{category.emoji}</Text>
                              )}
                            </TouchableOpacity>
                            <Text style={styles.stampName}>{category.name}</Text>
                            <View style={[styles.stampCount, { backgroundColor: category.color }]}>
                              <Text style={styles.stampCountText}>{count}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    {stamps.stamps.length > 0 && (
                      <>
                        <Text style={styles.stampSectionTitle}>📌 Son Ziyaretler</Text>
                        {stamps.stamps.slice(0, 5).map((stamp, index) => (
                          <View key={index} style={styles.stampHistoryItem}>
                            <Text style={styles.stampHistoryEmoji}>
                              {STAMP_CATEGORIES[stamp.category]?.emoji || '📍'}
                            </Text>
                            <View style={styles.stampHistoryInfo}>
                              <Text style={styles.stampHistoryName}>{stamp.placeName}</Text>
                              <Text style={styles.stampHistoryDate}>
                                {new Date(stamp.timestamp).toLocaleDateString('tr-TR')}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}
              </>
            )}



            {/* Favorites and Memories Buttons - Side by Side */}
            <View style={styles.twoButtonRow}>
              <TouchableOpacity 
                onPress={() => setShowFavorites(!showFavorites)}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={['#0F7C5B', '#0a5a43', '#0F7C5B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.squareButton}
                >
                  <Text style={styles.squareButtonIcon}>❤️</Text>
                  <Text style={styles.squareButtonTextWhite}>Favorilerim</Text>
                  <Text style={styles.squareButtonCountWhite}>({(userData.favorites || []).length})</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => navigation.navigate('MemoriesScreen')}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={['#0F7C5B', '#0a5a43', '#0F7C5B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.squareButton}
                >
                  <Text style={styles.squareButtonIcon}>📸</Text>
                  <Text style={styles.squareButtonTextWhite}>Anılar</Text>
                  <Text style={styles.squareButtonCountWhite}>({(userData.memories || []).length})</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {showFavorites && (
              <View style={styles.card}>
                <Text style={styles.section}>Favori Mekanlarım</Text>
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
                
                {(userData.favorites || []).length >= 3 && (
                  <TouchableOpacity 
                    style={styles.routeSuggestBtn}
                    onPress={suggestRoute}
                  >
                    <Text style={styles.routeSuggestIcon}>🗺️</Text>
                    <Text style={styles.routeSuggestText}>Favorilerimden Rota Öner</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity onPress={() => navigation.navigate('SurveyUpdate')} style={{ marginTop: 24 }}>
              <LinearGradient
                colors={['#FFB30F', '#ffa500', '#FFB30F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Anketi Güncelle</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.danger} onPress={reset}>
              <Text style={styles.dangerText}>Profili Sıfırla</Text>
            </TouchableOpacity>

            {auth && (
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>🚪 Çıkış Yap</Text>
              </TouchableOpacity>
            )}
      </ScrollView>

      {/* Rozet Büyütme Modal */}
      <Modal
        visible={selectedStamp !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedStamp(null)}
      >
        <TouchableOpacity 
          style={styles.stampModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedStamp(null)}
        >
          <View style={styles.stampModalContent}>
            {selectedStamp && (
              <>
                <Image 
                  source={selectedStamp.image} 
                  style={[styles.stampModalImage, { borderColor: selectedStamp.color }]}
                />
                <Text style={styles.stampModalName}>{selectedStamp.name}</Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
        </View>
      </View>
    </ImageBackground>
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
  backgroundImage: {
    flex: 1,
  },
  backgroundOverlay: {
    flex: 1,
    backgroundColor: 'rgba(245, 245, 240, 0.88)',
  },
  mainContainer: { flex: 1 },
  
  modalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    padding: 20, 
    paddingBottom: 30 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#111827', 
    marginBottom: 16, 
    textAlign: 'center' 
  },
  modalButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F5F5F0', 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    marginBottom: 10, 
    borderWidth: 2, 
    borderColor: '#0F7C5B' 
  },
  modalButtonIcon: { 
    fontSize: 24, 
    marginRight: 12 
  },
  modalButtonText: { 
    color: '#111827', 
    fontWeight: '900', 
    fontSize: 14, 
    flex: 1 
  },
  modalCancelButton: { 
    paddingVertical: 12, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 8, 
    borderWidth: 1, 
    borderColor: '#e5e7eb' 
  },
  modalCancelText: { 
    color: '#6b7280', 
    fontWeight: '900' 
  },

  // Ayarlar Modal Stilleri
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F0',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  settingsIcon: {
    fontSize: 24,
    marginRight: 12
  },
  settingsText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
    flex: 1
  },
  logoutOption: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    marginTop: 10
  },
  logoutText: {
    color: '#dc2626'
  },

  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: '#f3f4f6' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#0F7C5B' },
  tabText: { fontSize: 14, fontWeight: '800', color: '#9ca3af' },
  tabTextActive: { color: '#0F7C5B' },
  content: { paddingHorizontal: 14, paddingVertical: 12, paddingBottom: 20 },

  ppSection: { alignItems: 'center', marginBottom: 18 },
  ppContainer: { marginBottom: 10 },
  pp: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#0F7C5B' },
  ppPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F5F5F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFB30F' },
  ppText: { fontSize: 50 },
  ppButton: { backgroundColor: '#0F7C5B', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
  ppButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  container: { padding: 14, backgroundColor: '#F5F5F0', flexGrow: 1 },
  title: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, elevation: 2 },
  big: { fontSize: 18, fontWeight: '900', color: '#5A2447' },
  small: { marginTop: 6, color: '#6b7280', fontSize: 12 },
  section: { fontSize: 15, fontWeight: '900', color: '#111827', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  k: { color: '#374151', fontWeight: '800' },
  v: { color: '#111827', maxWidth: '55%', textAlign: 'right' },
  button: { paddingVertical: 12, borderRadius: 999, alignItems: 'center', elevation: 6, shadowColor: '#FFB30F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6 },
  buttonText: { color: '#fff', fontWeight: '900' },
  
  twoButtonRow: { flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 12 },
  squareButton: { 
    paddingVertical: 20, 
    paddingHorizontal: 12,
    borderRadius: 16, 
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#0F7C5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    minHeight: 110
  },
  squareButtonIcon: { fontSize: 32, marginBottom: 8 },
  squareButtonText: { color: '#0F7C5B', fontWeight: '900', fontSize: 15, marginBottom: 4 },
  squareButtonCount: { color: '#FFB30F', fontWeight: '700', fontSize: 13 },
  squareButtonTextWhite: { color: '#fff', fontWeight: '900', fontSize: 15, marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  squareButtonCountWhite: { color: '#FFB30F', fontWeight: '700', fontSize: 13 },
  
  favoritesButton: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#0F7C5B', paddingVertical: 12, borderRadius: 999, alignItems: 'center', marginTop: 6 },
  favoritesButtonText: { color: '#0F7C5B', fontWeight: '900', fontSize: 15 },
  danger: { marginTop: 10, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: '#ef4444', alignItems: 'center' },
  dangerText: { color: '#ef4444', fontWeight: '900' },
  logoutBtn: { marginTop: 10, paddingVertical: 12, borderRadius: 999, backgroundColor: '#374151', alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: '900' },

  // Login Prompt Styles
  loginPrompt: { color: '#6b7280', fontSize: 14, lineHeight: 20, marginBottom: 12, textAlign: 'center' },
  loginButton: { backgroundColor: '#0F7C5B', paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginTop: 4 },
  loginButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  // Account Info Styles
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  accountLabel: { color: '#6b7280', fontWeight: '800', fontSize: 14 },
  accountValue: { color: '#111827', fontWeight: '600', fontSize: 14 },
  
  usernameEditContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' },
  usernameInput: { backgroundColor: '#F5F5F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#FFB30F', minWidth: 100, fontSize: 14, color: '#111827' },
  saveUsernameBtn: { backgroundColor: '#22c55e', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  saveUsernameText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  cancelUsernameBtn: { backgroundColor: '#ef4444', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cancelUsernameText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  
  usernameViewContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editUsernameBtn: { padding: 4 },
  editUsernameText: { fontSize: 16 },

  tabTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 14 },
  memoryInput: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', minHeight: 80, color: '#111827', marginBottom: 10 },
  
  photosPreviewContainer: { marginBottom: 10, maxHeight: 220 },
  memoryPhotoPreview: { position: 'relative', marginRight: 10, borderRadius: 12, overflow: 'hidden', width: 160, height: 200 },
  memoryPhoto: { width: 160, height: 200, borderRadius: 12 },
  removePhotoBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  removePhotoText: { fontSize: 16 },
  
  memoryActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  photoButton: { flex: 1, backgroundColor: '#F5F5F0', paddingVertical: 12, borderRadius: 999, alignItems: 'center', borderWidth: 2, borderColor: '#FFB30F' },
  photoButtonText: { color: '#5A2447', fontWeight: '900', fontSize: 13 },
  
  memoryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#0F7C5B' },
  memoryCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  memoryProfileContainer: { marginRight: 10 },
  memoryProfilePic: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#0F7C5B' },
  memoryProfilePlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFB30F' },
  memoryProfileIcon: { fontSize: 20 },
  memoryProfileInfo: { flex: 1 },
  memoryProfileType: { fontSize: 13, fontWeight: '900', color: '#111827' },
  memoryProfileDate: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  memoryPhotosContainer: { marginBottom: 10 },
  memoryCardPhoto: { width: 250, height: 180, borderRadius: 8, marginRight: 8 },
  memoryText: { color: '#111827', fontSize: 14, lineHeight: 20 },
  deleteMemoryBtn: { marginTop: 8, backgroundColor: '#fef2f2', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  deleteMemoryText: { color: '#ef4444', fontWeight: '900', fontSize: 12 },

  favoriteCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, elevation: 2 },
  favoriteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  favoriteName: { fontSize: 15, fontWeight: '900', color: '#111827', flex: 1 },
  favoriteHeart: { fontSize: 18, marginLeft: 8 },
  favoriteAddr: { color: '#4b5563', fontSize: 12, marginBottom: 6 },
  favoriteMeta: { color: '#9ca3af', fontSize: 12, marginBottom: 10 },
  removeFavBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  removeFavBtnText: { color: '#ef4444', fontWeight: '900', fontSize: 12 },
  
  routeSuggestBtn: { marginTop: 16, backgroundColor: '#0F7C5B', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#0F7C5B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  routeSuggestIcon: { fontSize: 20, marginRight: 8 },
  routeSuggestText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  // Social Styles
  socialStats: { flexDirection: 'row', gap: 8, marginBottom: 12, marginTop: 8 },
  socialStatsBelow: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  statBox: { flex: 1, backgroundColor: '#F5F5F0', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5B0A8' },
  statNumber: { fontSize: 20, fontWeight: '900', color: '#0F7C5B', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#6b7280', fontWeight: '700' },
  
  searchInput: { backgroundColor: '#F5F5F0', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E5B0A8', fontSize: 13, color: '#111827', marginBottom: 8, marginTop: 8 },
  
  userCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0F7C5B', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  userAvatarText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  userDetails: { flex: 1 },
  userName: { fontSize: 13, fontWeight: '900', color: '#111827', marginBottom: 2 },
  userEmail: { fontSize: 11, color: '#6b7280' },
  
  followBtn: { backgroundColor: '#0F7C5B', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  followBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  followingBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  followingBtnText: { color: '#22c55e', fontWeight: '900', fontSize: 16 },

  // Passport Styles
  passportButton: { backgroundColor: '#F5F5F0', marginHorizontal: 14, marginVertical: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  passportButtonText: { color: '#111827', fontSize: 16, fontWeight: '900' },
  
  passportCard: { backgroundColor: '#1e293b', marginHorizontal: 14, marginBottom: 12, padding: 20, borderRadius: 16, borderWidth: 3, borderColor: '#d4af37', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  passportHeader: { alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 2, borderBottomColor: '#d4af37' },
  passportTitle: { fontSize: 24, fontWeight: '900', color: '#d4af37', letterSpacing: 2 },
  passportSubtitle: { fontSize: 12, color: '#cbd5e1', marginTop: 4, letterSpacing: 1 },
  
  passportStats: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  passportStat: { flex: 1, backgroundColor: '#334155', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#475569' },
  passportStatNumber: { fontSize: 28, fontWeight: '900', color: '#d4af37', marginBottom: 4 },
  passportStatLabel: { fontSize: 11, color: '#cbd5e1', textAlign: 'center' },
  
  stampSectionTitle: { fontSize: 16, fontWeight: '900', color: '#f1f5f9', marginBottom: 12, marginTop: 8 },
  
  stampsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stampBadge: { width: '48%', backgroundColor: '#334155', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 2, position: 'relative' },
  stampEmoji: { fontSize: 32, marginBottom: 6 },
  stampImage: { width: 70, height: 70, marginBottom: 6, borderRadius: 35 },
  stampName: { fontSize: 11, color: '#e2e8f0', textAlign: 'center', fontWeight: '700' },
  
  stampModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  stampModalContent: { alignItems: 'center' },
  stampModalImage: { width: 200, height: 200, borderRadius: 100, marginBottom: 20 },
  stampModalName: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  
  stampModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  stampModalContent: { alignItems: 'center' },
  stampModalImage: { width: 200, height: 200, borderRadius: 100, marginBottom: 20 },
  stampModalName: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  stampCount: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stampCountText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  
  stampHistoryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', borderRadius: 10, padding: 12, marginBottom: 8 },
  stampHistoryEmoji: { fontSize: 28, marginRight: 12 },
  stampHistoryInfo: { flex: 1 },
  stampHistoryName: { fontSize: 14, fontWeight: '900', color: '#f1f5f9', marginBottom: 2 },
  stampHistoryDate: { fontSize: 11, color: '#94a3b8' },

  emptyText: { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 20 },
});
