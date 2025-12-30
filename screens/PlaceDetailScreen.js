import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  FlatList,
  Dimensions,
} from 'react-native';
import { getPlaceDetails, getPhotoUrl } from '../utils/placesService';
import { addStamp, loadProfile, loadAuth } from '../utils/storage';
import { STAMP_CATEGORIES } from '../utils/storage';
import { getFollowersFirebase, createNotification, createGoodDeed, assignGoodDeedToRestaurant } from '../utils/firebaseService';

const { width } = Dimensions.get('window');

export default function PlaceDetailScreen({ route, navigation }) {
  const { place } = route.params;
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        
        const placeId = place.place_id || place.id;
        console.log('Fetching details for place_id:', placeId);
        
        // Google'dan detay çek
        const detailedPlace = await getPlaceDetails(placeId);
        if (detailedPlace) {
          console.log('Google API detay başarılı:', detailedPlace.name);
          setDetails(detailedPlace);
        } else {
          console.log('Google API detay döndürmedi, fallback kullanılıyor');
          // Google'dan çekemediyse, temel bilgileri göster
          setDetails(createMockDetails(place));
        }
      } catch (error) {
        console.error('Detay yükleme hatası:', error);
        setDetails(createMockDetails(place));
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [place]);

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      const auth = await loadAuth();
      const profile = await loadProfile();
      
      if (!auth?.uid) {
        Alert.alert('Uyarı', 'Lütfen giriş yapın!');
        return;
      }
      
      if (!profile) {
        Alert.alert('Uyarı', 'Lütfen önce anketi doldurun!');
        return;
      }
      
      // Mekanın kategorisini belirle (profil kategorisine göre)
      const category = profile.profileKey || 'laptop';
      const result = await addStamp(place, category, auth.uid);
      
      if (result.success) {
        const categoryInfo = STAMP_CATEGORIES[category];
        
        // Takipçilere bildirim gönder
        try {
          const followersResult = await getFollowersFirebase(auth.uid);
          if (followersResult.success && followersResult.followers.length > 0) {
            // Her takipçiye bildirim gönder
            for (const followerUid of followersResult.followers) {
              await createNotification(followerUid, {
                type: 'stamp',
                senderUid: auth.uid,
                senderUsername: auth.username || 'Kullanıcı',
                message: `${auth.username || 'Kullanıcı'} "${categoryInfo.name}" pulunu kazandı!`,
                placeId: place.place_id || place.id,
                placeName: place.name,
                stampCategory: categoryInfo.name,
                stampEmoji: categoryInfo.emoji
              });
            }
            console.log(`✅ ${followersResult.followers.length} takipçiye bildirim gönderildi`);
          }
        } catch (notifError) {
          console.error('Bildirim gönderme hatası:', notifError);
          // Bildirim hatası kullanıcı deneyimini etkilemesin
        }
        
        // İYİLİK PULU KONTROLÜ
        const fromFriendStamp = route.params?.fromFriendStamp;
        let goodDeedAwarded = false;
        
        if (fromFriendStamp) {
          // Arkadaşın pulundan geldiyse kesinlikle iyilik pulu kazan
          goodDeedAwarded = true;
          console.log('🎁 Arkadaş pulundan gelindi - İyilik Pulu kazanıldı!');
        } else {
          // Normal check-in ise %20 şans
          const randomChance = Math.random();
          if (randomChance < 0.2) {
            goodDeedAwarded = true;
            console.log('🎁 Şanslı check-in - İyilik Pulu kazanıldı!');
          }
        }
        
        if (goodDeedAwarded) {
          try {
            // İyilik pulu oluştur
            const goodDeedResult = await createGoodDeed(
              auth.uid,
              auth.username || 'Kullanıcı',
              place.place_id || place.id,
              place.name
            );
            
            if (goodDeedResult.success) {
              // Rastgele bir restorana ata (şimdilik mock - gerçek restoranlar eklenebilir)
              const mockRestaurants = [
                { id: 'rest1', name: 'Simit Sarayı' },
                { id: 'rest2', name: 'Kahve Dünyası' },
                { id: 'rest3', name: 'Mado' },
                { id: 'rest4', name: 'Sütis' },
                { id: 'rest5', name: 'Big Chefs' },
              ];
              const randomRestaurant = mockRestaurants[Math.floor(Math.random() * mockRestaurants.length)];
              
              await assignGoodDeedToRestaurant(
                goodDeedResult.goodDeedId,
                randomRestaurant.id,
                randomRestaurant.name,
                auth.username || 'Bir kullanıcı'
              );
              
              console.log('✅ İyilik Pulu restorana atandı:', randomRestaurant.name);
              
              // Başarı mesajı
              Alert.alert(
                '🎉 Tebrikler!',
                `${categoryInfo.emoji} "${categoryInfo.name}" pulunu kazandınız!\n\n🎁 İYİLİK PULU KAZANDINIZ!\n\n${randomRestaurant.name} restoranına bir askıda yemek kuponu gönderildi. Tüm kullanıcılara bildirim gönderildi - ihtiyaç sahibi birinin yararlanmasını sağladın! ❤️\n\nToplam ${result.totalStamps} pul topladınız.`,
                [
                  { text: 'Pasaportumu Gör', onPress: () => navigation.navigate('Profile') },
                  { text: 'Tamam', style: 'cancel' }
                ]
              );
              return;
            }
          } catch (goodDeedError) {
            console.error('İyilik pulu hatası:', goodDeedError);
            // Hata olsa bile normal pul mesajı göster
          }
        }
        
        // Normal pul mesajı (iyilik pulu yoksa)
        Alert.alert(
          '🎉 Tebrikler!',
          `${categoryInfo.emoji} "${categoryInfo.name}" pulunu kazandınız!\n\nToplam ${result.totalStamps} pul topladınız.`,
          [
            { text: 'Pasaportumu Gör', onPress: () => navigation.navigate('Profile') },
            { text: 'Tamam', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Bilgi', result.message);
      }
    } catch (error) {
      console.error('Check-in hatası:', error);
      Alert.alert('Hata', 'Check-in yapılırken bir hata oluştu');
    } finally {
      setCheckingIn(false);
    }
  };

  const createMockDetails = (place) => ({
    name: place.name,
    rating: place.rating || 0,
    totalRatings: Math.floor(Math.random() * 500) + 50,
    address: place.address,
    phone: '+90 212 555 0123',
    website: null,
    mapsUrl: null,
    openingHours: ['Pazartesi: 08:00 – 22:00', 'Salı: 08:00 – 22:00', 'Çarşamba: 08:00 – 22:00'],
    photos: [],
    reviews: [
      {
        author_name: 'Ahmet K.',
        rating: 5,
        text: 'Harika bir yer! Kahvesi müthiş, ortamı çok sıcak ve rahat. Sesli müzik seviyesi de uygun, çalışmaya çok elverişli.',
        time: '2 hafta önce',
      },
      {
        author_name: 'Zeynep Y.',
        rating: 4,
        text: 'Sessiz ve rahat bir kafe. Çalışmaya uygun. Personel güleryüzlü ve hizmetleri iyi. Fiyatlar biraz yüksek olabilir.',
        time: '1 ay önce',
      },
      {
        author_name: 'Mert Ş.',
        rating: 5,
        text: 'Konum güzel, personel ilgili ve nazik. Tavsiye ederim! Özellikle sabah kahvesine bayılıyorum.',
        time: '1 ay önce',
      },
      {
        author_name: 'Sinem C.',
        rating: 4,
        text: 'Beraber gitmek için harika bir mekan. Arkadaş grubu için ideal. Kekler ve pastalar çok lezzetli!',
        time: '2 ay önce',
      },
      {
        author_name: 'Emre D.',
        rating: 5,
        text: 'En sevdiğim kafe! Her gün orada olmak istiyorum. WiFi hızlı, kahve sıcak, ortam sessiz ve sakin.',
        time: '2 ay önce',
      },
      {
        author_name: 'Ayşe T.',
        rating: 3,
        text: 'Güzel mekan ama çok kalabalık olabiliyor. Rezervasyon yapmanız önerilir. Hizmet biraz yavaş olabilir.',
        time: '3 ay önce',
      },
      {
        author_name: 'Can B.',
        rating: 5,
        text: 'Mükemmel deneyim! Taze kahveler, hoş dekorasyon, samimi personel. Aradığım her şey burada.',
        time: '3 ay önce',
      },
      {
        author_name: 'Lale M.',
        rating: 4,
        text: 'Sakin ortamı ve kaliteli hizmeti için beş yıldız hak ediyor. Tek sorunu biraz dar olması.',
        time: '4 ay önce',
      },
    ],
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F7C5B" />
        <Text style={styles.loadingText}>Detaylar yükleniyor...</Text>
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Mekan bilgileri yüklenemedi</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Ana Başlık */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.placeName}>{details.name}</Text>
      </View>

      {/* Fotoğraflar Galerisi */}
      <PhotoGallery photos={details.photos} placeName={details.name} />

      {/* Puan & İstatistikler */}
      <View style={styles.ratingCard}>
        <View style={styles.ratingLeft}>
          <Text style={styles.ratingBig}>⭐ {details.rating.toFixed(1)}</Text>
          <Text style={styles.ratingCount}>({details.totalRatings} yorum)</Text>
        </View>
        <View style={styles.ratingBars}>
          {[5, 4, 3, 2, 1].map((star) => (
            <View key={star} style={styles.ratingBar}>
              <View style={[styles.barFill, { width: `${Math.random() * 100}%` }]} />
            </View>
          ))}
        </View>
      </View>

      {/* Konum & İletişim */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📍 Konum & İletişim</Text>
        <Text style={styles.address}>{details.address}</Text>

        {details.phone && (
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL(`tel:${details.phone}`)}
          >
            <Text style={styles.contactIcon}>📞</Text>
            <Text style={styles.contactText}>{details.phone}</Text>
          </TouchableOpacity>
        )}

        {details.website && (
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL(details.website)}
          >
            <Text style={styles.contactIcon}>🌐</Text>
            <Text style={styles.contactText}>{details.website}</Text>
          </TouchableOpacity>
        )}

        {details.mapsUrl && (
          <TouchableOpacity
            style={styles.mapsBtn}
            onPress={() => Linking.openURL(details.mapsUrl)}
          >
            <Text style={styles.mapsBtnText}>Google Maps'te Aç →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Check-in Butonu */}
      <TouchableOpacity 
        style={styles.checkInButton}
        onPress={handleCheckIn}
        disabled={checkingIn}
      >
        <Text style={styles.checkInIcon}>🎫</Text>
        <View style={styles.checkInTextContainer}>
          <Text style={styles.checkInTitle}>
            {checkingIn ? 'Check-in yapılıyor...' : 'Buraya Geldim! 📍'}
          </Text>
          <Text style={styles.checkInSubtitle}>Pul kazan ve pasaportunu doldur</Text>
        </View>
      </TouchableOpacity>

      {/* Çalışma Saatleri */}
      {details.openingHours && details.openingHours.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏰ Çalışma Saatleri</Text>
          {details.openingHours.map((hour, idx) => (
            <Text key={idx} style={styles.hours}>
              {hour}
            </Text>
          ))}
        </View>
      )}

      {/* Yorumlar */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💬 Google Kullanıcı Yorumları ({details.reviews?.length || 0})</Text>

        {details.reviews && details.reviews.length > 0 ? (
          <FlatList
            data={details.reviews}
            keyExtractor={(_, idx) => idx.toString()}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAuthorInfo}>
                    {item.profile_photo_url ? (
                      <Image 
                        source={{ uri: item.profile_photo_url }} 
                        style={styles.authorAvatar}
                      />
                    ) : (
                      <View style={styles.authorAvatar}>
                        <Text style={styles.avatarText}>{item.author_name.charAt(0)}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.reviewAuthor}>{item.author_name}</Text>
                      <Text style={styles.reviewTime}>{item.time}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewStars}>
                    {'⭐'.repeat(item.rating)}
                  </Text>
                </View>
                <Text style={styles.reviewText}>{item.text}</Text>
              </View>
            )}
          />
        ) : (
          <Text style={styles.noReviews}>Henüz yorum yok</Text>
        )}
      </View>

      {/* Daha Fazla Bilgi */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ℹ️ Kategoriler</Text>
        <View style={styles.tagsContainer}>
          {['Kafe', 'Yemek', 'Çalışmaya Uygun'].map((tag, idx) => (
            <View key={idx} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F0' },
  content: { paddingHorizontal: 14, paddingVertical: 12 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F0',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F0',
  },
  errorText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
  },
  backIcon: {
    color: '#0F7C5B',
    fontWeight: '900',
    fontSize: 16,
  },
  backBtn: {
    backgroundColor: '#0F7C5B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '900',
  },

  placeName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    flex: 1,
  },

  placePhoto: {
    width: width - 28,
    height: 250,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  photoPlaceholder: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    backgroundColor: '#F5F5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoIcon: {
    fontSize: 60,
  },
  photoPlaceholderText: {
    color: '#9ca3af',
    marginTop: 8,
  },

  galleryContainer: {
    marginHorizontal: -14,
    marginBottom: 16,
  },

  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  activeDot: {
    backgroundColor: '#0F7C5B',
    width: 24,
  },

  ratingCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  ratingLeft: {
    marginRight: 20,
  },
  ratingBig: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F7C5B',
  },
  ratingCount: {
    color: '#6b7280',
    marginTop: 4,
  },
  ratingBars: {
    flex: 1,
  },
  ratingBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#0F7C5B',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  },

  address: {
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  contactIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  contactText: {
    color: '#111827',
    fontSize: 14,
  },

  mapsBtn: {
    backgroundColor: '#F5F5F0',
    borderWidth: 2,
    borderColor: '#0F7C5B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  mapsBtnText: {
    color: '#5A2447',
    fontWeight: '900',
  },

  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    marginHorizontal: 14,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkInIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  checkInTextContainer: {
    flex: 1,
  },
  checkInTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 2,
  },
  checkInSubtitle: {
    fontSize: 12,
    color: '#d1fae5',
  },

  hours: {
    color: '#4b5563',
    marginVertical: 4,
    lineHeight: 18,
  },

  reviewCard: {
    backgroundColor: '#F5F5F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0F7C5B',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reviewAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F7C5B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
  reviewAuthor: {
    fontWeight: '900',
    color: '#111827',
    fontSize: 14,
  },
  reviewStars: {
    fontSize: 14,
  },
  reviewText: {
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewTime: {
    color: '#9ca3af',
    fontSize: 12,
  },

  noReviews: {
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },

  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F5F5F0',
    borderColor: '#FFB30F',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  tagText: {
    color: '#5A2447',
    fontWeight: '900',
    fontSize: 12,
  },
});


function PhotoGallery({ photos, placeName }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <View style={styles.photoPlaceholder}>
        <Text style={styles.photoIcon}>📸</Text>
        <Text style={styles.photoPlaceholderText}>Fotoğraf bulunamadı</Text>
      </View>
    );
  }

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  return (
    <View style={styles.galleryContainer}>
      <FlatList
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        data={photos}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({ item }) => (
          <View style={{ width: width - 28 }}>
            <Image
              source={{ uri: getPhotoUrl(item.photo_reference, 600) }}
              style={styles.placePhoto}
            />
          </View>
        )}
        showsHorizontalScrollIndicator={false}
      />

      {}
      {photos.length > 1 && (
        <View style={styles.paginationDots}>
          {photos.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === currentIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}
