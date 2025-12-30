import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { loadAuth } from '../utils/storage';
import { getUserNotifications, markNotificationAsRead, acceptDiceInvite } from '../utils/firebaseService';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const auth = await loadAuth();
      if (auth && auth.uid) {
        const result = await getUserNotifications(auth.uid);
        if (result.success) {
          // goodDeed (askıda yemek) ve dice game bildirimlerini göster
          // stamp bildirimleri FriendStampsScreen'de gösteriliyor
          const filteredNotifications = (result.notifications || []).filter(
            notif => notif.type === 'goodDeed' || 
                     notif.type === 'diceInvite' || 
                     notif.type === 'diceAccepted' || 
                     notif.type === 'diceRolled'
          );
          setNotifications(filteredNotifications);
        }
      }
    } catch (error) {
      console.error('Notifications load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification) => {
    // Bildirimi okundu olarak işaretle
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      loadNotifications();
    }

    // Bildirim tipine göre yönlendirme
    // Zar oyunu davetiyesi
    if (notification.type === 'diceInvite') {
      Alert.alert(
        'Zar Oyunu Davetiyesi 🎲',
        `${notification.fromUsername} seni zar oyununa davet etti! Bugün nereye gideceğinizi birlikte belirleyin.`,
        [
          { text: 'Reddet', style: 'cancel' },
          {
            text: 'Kabul Et',
            onPress: async () => {
              const auth = await loadAuth();
              const result = await acceptDiceInvite(notification.gameId, auth.uid);
              if (result.success) {
                Alert.alert('Harika! 🎉', 'Davetiyeyi kabul ettiniz. Artık zarı atabilirsiniz!');
                navigation.navigate('DiceGame', {
                  gameId: notification.gameId,
                  otherUsername: notification.fromUsername
                });
              } else {
                Alert.alert('Hata', result.error);
              }
            }
          }
        ]
      );
      return;
    }
    
    // Davetiye kabul edildi - Zar atma ekranına git
    if (notification.type === 'diceAccepted') {
      navigation.navigate('DiceGame', {
        gameId: notification.gameId,
        otherUsername: notification.fromUsername
      });
      return;
    }
    
    // Zar atıldı - Sonucu göster
    if (notification.type === 'diceRolled') {
      navigation.navigate('DiceGame', {
        gameId: notification.gameId,
        otherUsername: notification.fromUsername
      });
      return;
    }

    if (notification.type === 'stamp' && notification.placeId) {
      // Mekan detayına git - önce Feed Stack'ten çık, sonra Map Stack'e git
      navigation.getParent()?.navigate('MapTab', {
        screen: 'MapScreen',
        params: {
          highlightPlaceId: notification.placeId
        }
      });
    }

    // Askıda yemek bildirimi ise restorana git
    if (notification.type === 'goodDeed' && notification.restaurantId) {
      Alert.alert(
        '🍽️ Askıda Yemek',
        `${notification.restaurantName} restoranına gitmek ister misin? Askıda yemekten yararlanabilirsin!`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Haritada Göster',
            onPress: () => {
              // Restoran detayına git
              navigation.getParent()?.navigate('Home', {
                screen: 'PlaceDetail',
                params: {
                  place: {
                    id: notification.restaurantId,
                    place_id: notification.restaurantId,
                    name: notification.restaurantName,
                  },
                  fromGoodDeed: true,
                  goodDeedId: notification.goodDeedId,
                }
              });
            }
          }
        ]
      );
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'stamp': return { icon: 'ticket', color: '#f59e0b' };
      case 'like': return { icon: 'heart', color: '#ef4444' };
      case 'comment': return { icon: 'comment', color: '#3b82f6' };
      case 'follow': return { icon: 'account-plus', color: '#10b981' };
      case 'goodDeed': return { icon: 'food', color: '#f97316' };
      case 'diceInvite': return { icon: 'dice-5', color: '#9B59B6' };
      case 'diceAccepted': return { icon: 'check-circle', color: '#10b981' };
      case 'diceRolled': return { icon: 'party-popper', color: '#f59e0b' };
      default: return { icon: 'bell', color: '#6b7280' };
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0F7C5B" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="food-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>Henüz askıda yemek bildirimi yok</Text>
            <Text style={styles.emptySubtext}>Birileri iyilik yaptığında askıda yemek bildirimlerini burada göreceksin!</Text>
          </View>
        ) : (
          notifications.map(notification => {
            const iconData = getNotificationIcon(notification.type);
            return (
              <TouchableOpacity 
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.read && styles.unreadNotification
                ]}
                onPress={() => handleNotificationPress(notification)}
              >
                <View style={[styles.iconContainer, { backgroundColor: iconData.color + '20' }]}>
                  <MaterialCommunityIcons 
                    name={iconData.icon} 
                    size={24} 
                    color={iconData.color} 
                  />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationMessage}>
                    {notification.message}
                  </Text>
                  {notification.type === 'stamp' && notification.placeName && (
                    <Text style={styles.notificationPlace}>
                      📍 {notification.placeName}
                    </Text>
                  )}
                  <Text style={styles.notificationTime}>
                    {getTimeAgo(notification.createdAt)}
                  </Text>
                </View>
                {!notification.read && (
                  <View style={styles.unreadDot} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#0F7C5B',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#475569',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  unreadNotification: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#0F7C5B',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  notificationMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  notificationPlace: {
    fontSize: 13,
    color: '#0F7C5B',
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 13,
    color: '#9ca3af',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0F7C5B',
    position: 'absolute',
    top: 16,
    right: 16,
  },
});
