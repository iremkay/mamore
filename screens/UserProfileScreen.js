import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getUserProfile, getFollowersFirebase, getFollowingFirebase, followUserFirebase, unfollowUserFirebase, createDiceGameInvite } from '../utils/firebaseService';
import { loadAuth } from '../utils/storage';

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const [userProfile, setUserProfile] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Mevcut kullanıcıyı al
      const auth = await loadAuth();
      setCurrentUser(auth);

      // Görüntülenen kullanıcının profilini al
      const profileResult = await getUserProfile(userId);
      if (profileResult.success) {
        setUserProfile(profileResult.data);
      } else {
        Alert.alert('Hata', 'Profil yüklenemedi');
      }

      // Takipçi ve takip edilen listelerini al
      const followersResult = await getFollowersFirebase(userId);
      const followingResult = await getFollowingFirebase(userId);
      
      if (followersResult.success) {
        setFollowers(followersResult.followers || []);
        // Mevcut kullanıcı bu kişiyi takip ediyor mu?
        if (auth && auth.uid) {
          setIsFollowing((followersResult.followers || []).includes(auth.uid));
        }
      }
      
      if (followingResult.success) {
        setFollowing(followingResult.following || []);
      }

      // Mevcut kullanıcının takip ettiklerini kontrol et
      if (auth && auth.uid) {
        const myFollowingResult = await getFollowingFirebase(auth.uid);
        if (myFollowingResult.success) {
          setIsFollowing((myFollowingResult.following || []).includes(userId));
        }
      }
    } catch (error) {
      console.error('User profile load error:', error);
      Alert.alert('Hata', 'Profil yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !currentUser.uid) {
      Alert.alert('Hata', 'Giriş yapmanız gerekiyor');
      return;
    }

    try {
      if (isFollowing) {
        await unfollowUserFirebase(currentUser.uid, userId);
        setIsFollowing(false);
      } else {
        await followUserFirebase(currentUser.uid, userId);
        setIsFollowing(true);
      }
      // Takipçi sayısını güncelle
      loadUserProfile();
    } catch (error) {
      console.error('Follow toggle error:', error);
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
    }
  };

  const handleDiceGameInvite = async () => {
    if (!currentUser || !currentUser.uid) {
      Alert.alert('Hata', 'Giriş yapmanız gerekiyor');
      return;
    }

    if (!isFollowing) {
      Alert.alert('Uyarı', 'Zar oyunu için önce bu kişiyi takip etmelisiniz!');
      return;
    }

    try {
      const result = await createDiceGameInvite(
        currentUser.uid,
        currentUser.username || currentUser.email,
        userId,
        userProfile.username
      );

      if (result.success) {
        Alert.alert(
          'Davetiye Gönderildi! 🎲',
          `${userProfile.username} davetiyeni aldı. Kabul edince zar atabilirsiniz!`,
          [{ text: 'Tamam' }]
        );
      } else {
        Alert.alert('Hata', result.error);
      }
    } catch (error) {
      console.error('Dice game invite error:', error);
      Alert.alert('Hata', 'Davetiye gönderilirken bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0F7C5B" />
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Profil bulunamadı</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profil Başlığı */}
        <View style={styles.header}>
          {userProfile.profilePicture ? (
            <Image 
              source={{ uri: userProfile.profilePicture }} 
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userProfile.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.username}>{userProfile.username}</Text>
          <Text style={styles.email}>{userProfile.email}</Text>
        </View>

        {/* İstatistikler */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statBox}
            onPress={() => {
              // Profile tab'ındaki FollowersFollowing ekranına git
              navigation.getParent()?.navigate('Profile', {
                screen: 'FollowersFollowing',
                params: {
                  type: 'followers',
                  targetUserId: userId 
                }
              });
            }}
          >
            <Text style={styles.statNumber}>{followers.length}</Text>
            <Text style={styles.statLabel}>Takipçi</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statBox}
            onPress={() => {
              // Profile tab'ındaki FollowersFollowing ekranına git
              navigation.getParent()?.navigate('Profile', {
                screen: 'FollowersFollowing',
                params: {
                  type: 'following',
                  targetUserId: userId 
                }
              });
            }}
          >
            <Text style={styles.statNumber}>{following.length}</Text>
            <Text style={styles.statLabel}>Takip</Text>
          </TouchableOpacity>
        </View>

        {/* Takip Et Butonu */}
        {currentUser && currentUser.uid !== userId && (
          <>
            <TouchableOpacity onPress={handleFollowToggle}>
              <LinearGradient
                colors={isFollowing ? ['#e5e7eb', '#d1d5db'] : ['#0F7C5B', '#0a5a43']}
                style={styles.followButton}
              >
                <Text style={[styles.followButtonText, isFollowing && styles.unfollowButtonText]}>
                  {isFollowing ? 'Takipten Çık' : 'Takip Et'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Zar Oyunu Butonu - Sadece takip ediyorsa görünsün */}
            {isFollowing && (
              <TouchableOpacity onPress={handleDiceGameInvite} style={styles.diceGameButton}>
                <LinearGradient
                  colors={['#9B59B6', '#8E44AD']}
                  style={styles.diceGameGradient}
                >
                  <MaterialCommunityIcons name="dice-5" size={24} color="#fff" />
                  <Text style={styles.diceGameText}>Bugün Nereye Gidelim? 🎲</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Profil Bilgileri */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hesap Bilgileri</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kullanıcı Adı:</Text>
            <Text style={styles.infoValue}>{userProfile.username}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>E-posta:</Text>
            <Text style={styles.infoValue}>{userProfile.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Katılma Tarihi:</Text>
            <Text style={styles.infoValue}>
              {new Date(userProfile.createdAt).toLocaleDateString('tr-TR')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0F7C5B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F7C5B',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  followButton: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  unfollowButtonText: {
    color: '#333',
  },
  diceGameButton: {
    marginBottom: 20,
  },
  diceGameGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  diceGameText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
