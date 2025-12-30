import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { loadAuth } from '../utils/storage';
import { getUserNotifications } from '../utils/firebaseService';

const STAMP_EMOJIS = {
  culture: '🎭',
  art: '🎨',
  nature: '🌿',
  food: '🍽️',
  coffee: '☕',
  nightlife: '🌙',
  shopping: '🛍️',
  sports: '⚽',
  wellness: '🧘',
  adventure: '🏔️',
  history: '🏛️',
  music: '🎵',
};

export default function FriendStampsScreen({ navigation }) {
  const [auth, setAuth] = useState(null);
  const [friendStamps, setFriendStamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const a = await loadAuth();
      setAuth(a);

      if (a && a.uid) {
        // Bildirimleri çek - sadece stamp türündekiler
        const result = await getUserNotifications(a.uid);
        if (result.success) {
          // Sadece pul bildirimleri
          const stampNotifications = result.notifications.filter(
            notif => notif.type === 'stamp'
          );
          setFriendStamps(stampNotifications);
        }
      }
    } catch (error) {
      console.error('FriendStamps load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const notifDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    return notifDate.toLocaleDateString('tr-TR');
  };

  const handleStampPress = (stamp) => {
    // Mekana git
    if (stamp.placeId && stamp.placeName) {
      Alert.alert(
        '🎯 Arkadaşının İzinden Git!',
        `${stamp.placeName} mekanına gitmek ister misin? Sen de pul kazanabilir ve İyilik Pulu alabilirsin!`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Haritada Göster',
            onPress: () => {
              // Tab navigator içinde Home tab'ına git, sonra PlaceDetail ekranına
              navigation.getParent()?.navigate('Home', {
                screen: 'PlaceDetail',
                params: {
                  place: {
                    id: stamp.placeId,
                    place_id: stamp.placeId,
                    name: stamp.placeName,
                    // Diğer bilgiler notifications'da yok, ama yeterli
                  },
                  fromFriendStamp: true,
                  friendStampData: stamp,
                }
              });
            }
          }
        ]
      );
    }
  };

  const renderStamp = ({ item }) => {
    const emoji = STAMP_EMOJIS[item.stampCategory] || '🎫';
    
    return (
      <TouchableOpacity 
        style={styles.stampCard}
        onPress={() => handleStampPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.stampHeader}>
          <View style={styles.stampIcon}>
            <Text style={styles.stampEmoji}>{emoji}</Text>
          </View>
          <View style={styles.stampInfo}>
            <Text style={styles.stampUser}>{item.senderUsername || 'Bir arkadaşın'}</Text>
            <Text style={styles.stampTime}>{getTimeAgo(item.createdAt)}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
        </View>

        <Text style={styles.stampMessage}>{item.message}</Text>

        {item.placeName && (
          <View style={styles.placeContainer}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#0F7C5B" />
            <Text style={styles.placeName}>{item.placeName}</Text>
          </View>
        )}

        <View style={styles.rewardBadge}>
          <MaterialCommunityIcons name="gift" size={16} color="#f97316" />
          <Text style={styles.rewardText}>Sen de git, İyilik Pulu kazan!</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Arkadaş Pulları</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arkadaş Pulları 🎁</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.infoCard}>
        <MaterialCommunityIcons name="information" size={24} color="#0F7C5B" />
        <Text style={styles.infoText}>
          Arkadaşlarının kazandığı pulları gör! Onların gittiği mekanlara sen de git, pul kazan ve <Text style={styles.infoHighlight}>İyilik Pulu</Text> al. İyilik Pulların rastgele bir restorana <Text style={styles.infoHighlight}>askıda yemek</Text> olarak gider!
        </Text>
      </View>

      {friendStamps.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="gift-outline" size={80} color="#d1d5db" />
          <Text style={styles.emptyTitle}>Henüz arkadaş pulu yok</Text>
          <Text style={styles.emptyText}>
            Arkadaşların mekan ziyaret edip pul kazandığında burada görünecek
          </Text>
        </View>
      ) : (
        <FlatList
          data={friendStamps}
          renderItem={renderStamp}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#F5F5F0',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0F7C5B',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
  },
  infoHighlight: {
    fontWeight: 'bold',
    color: '#0F7C5B',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  stampCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stampHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stampIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stampEmoji: {
    fontSize: 24,
  },
  stampInfo: {
    flex: 1,
  },
  stampUser: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  stampTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  stampMessage: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  placeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  placeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F7C5B',
    flex: 1,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  rewardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f97316',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
