import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { loadAuth, getAllUsers, getFollowers, getFollowing, followUser, unfollowUser } from '../utils/storage';
import { getFollowersFirebase, getFollowingFirebase, getAllUsersFromFirebase, followUserFirebase, unfollowUserFirebase } from '../utils/firebaseService';

export default function FollowersFollowingScreen({ route, navigation }) {
  const { type, targetUserId } = route.params; // 'followers' or 'following', targetUserId
  const [auth, setAuth] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [myFollowing, setMyFollowing] = useState([]); // Kendi takip ettiklerim
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const a = await loadAuth();
        
        // Firebase'den kullanıcı listesini çek
        const usersResult = await getAllUsersFromFirebase();
        if (usersResult.success) {
          setAllUsers(usersResult.users);
        } else {
          // Firebase'den alınamazsa yerel storage'dan al
          const users = await getAllUsers();
          setAllUsers(users);
        }
        
        // Görüntülenecek kullanıcının ID'si (targetUserId varsa onu, yoksa kendi uid'ini kullan)
        const displayUserId = targetUserId || (a && a.uid);
        
        // Firebase'den takipçi ve takip edilenleri çek
        if (displayUserId) {
          const followersResult = await getFollowersFirebase(displayUserId);
          const followingResult = await getFollowingFirebase(displayUserId);
          
          if (followersResult.success) {
            setFollowers(followersResult.followers || []);
          } else {
            const f = await getFollowers();
            setFollowers(f);
          }
          
          if (followingResult.success) {
            setFollowing(followingResult.following || []);
          } else {
            const fg = await getFollowing();
            setFollowing(fg);
          }
        }
        
        // Kendi takip ettiklerimi al (başka birinin profilindeyken butonları doğru göstermek için)
        if (a && a.uid) {
          const myFollowingResult = await getFollowingFirebase(a.uid);
          if (myFollowingResult.success) {
            setMyFollowing(myFollowingResult.following || []);
          }
        }
        
        setAuth(a);
      } catch (error) {
        console.error('FollowersFollowingScreen data load error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [targetUserId]);

  const handleFollowToggle = async (targetUser) => {
    const targetUid = targetUser.uid || targetUser.id;
    const isFollowingThisUser = myFollowing.includes(targetUid);
    
    if (auth && auth.uid) {
      // Firebase'de takip işlemini gerçekleştir
      if (isFollowingThisUser) {
        await unfollowUserFirebase(auth.uid, targetUid);
        await unfollowUser(targetUser.email); // Yerel storage'ı da güncelle
      } else {
        await followUserFirebase(auth.uid, targetUid);
        await followUser(targetUser.email); // Yerel storage'ı da güncelle
      }
      
      // Kendi takip listeni güncelle
      const myFollowingResult = await getFollowingFirebase(auth.uid);
      if (myFollowingResult.success) {
        setMyFollowing(myFollowingResult.following || []);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  // Firebase'den gelen uid listesini kullanıcılarla eşleştir
  const userList = type === 'followers' 
    ? allUsers.filter(user => followers.includes(user.uid || user.id))
    : allUsers.filter(user => following.includes(user.uid || user.id));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {userList.length > 0 ? (
          userList.map(user => {
            const userUid = user.uid || user.id;
            // Kendi takip ettiklerimden kontrol et
            const isFollowingByMe = myFollowing.includes(userUid);
            // Kendini gösterme
            const isCurrentUser = auth && auth.uid === userUid;
            
            return (
              <View key={userUid} style={styles.userCard}>
                <TouchableOpacity 
                  style={styles.userInfo}
                  onPress={() => navigation.navigate('UserProfile', { 
                    userId: userUid,
                    username: user.username 
                  })}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userName}>{user.username}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                  </View>
                </TouchableOpacity>
                {!isCurrentUser && (
                  <TouchableOpacity
                    style={[styles.followBtn, isFollowingByMe && styles.followingBtn]}
                    onPress={() => handleFollowToggle(user)}
                  >
                    <Text style={[styles.followBtnText, isFollowingByMe && styles.followingBtnText]}>
                      {isFollowingByMe ? '✓' : '+'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {type === 'followers' 
                ? 'Henüz takipçin yok 😊' 
                : 'Henüz kimseyi takip etmiyorsun 🔍'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F0' },
  content: { padding: 14, paddingBottom: 20 },
  
  loadingText: { textAlign: 'center', color: '#6b7280', fontSize: 16, marginTop: 40 },

  userCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userAvatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: '#0F7C5B', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  userAvatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  userDetails: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '900', color: '#111827', marginBottom: 4 },
  userEmail: { fontSize: 13, color: '#6b7280' },
  
  followBtn: { 
    backgroundColor: '#0F7C5B', 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  followBtnText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  followingBtn: { 
    backgroundColor: '#fff', 
    borderWidth: 2, 
    borderColor: '#22c55e' 
  },
  followingBtnText: { color: '#22c55e' },

  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 100 
  },
  emptyText: { 
    textAlign: 'center', 
    color: '#9ca3af', 
    fontSize: 16, 
    fontStyle: 'italic' 
  },
});
