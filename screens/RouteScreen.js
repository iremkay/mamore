import React, { useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const ROUTE_STAGES = [
  { label: '🥐 Kahvaltı', emoji: '🥐', color: '#fbbf24', typeFilter: 'breakfast' },
  { label: '🎭 Aktivite', emoji: '🎭', color: '#8b5cf6', typeFilter: 'activity' },
  { label: '☕ Kahve', emoji: '☕', color: '#92400e', typeFilter: 'coffee' },
];

export default function RouteScreen({ route, navigation }) {
  const { route: routePlaces, profile, category, isNewRoute, onRefresh } = route.params || {};
  const [currentRoute, setCurrentRoute] = useState(routePlaces);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef(null);

  const handleRefreshRoute = () => {
    setRefreshing(true);
    // MapScreen'e geri git ve yeni rota oluşturmasını söyle
    navigation.navigate('MapScreen', { shouldGenerateNewRoute: true });
  };

  useEffect(() => {
    navigation.setOptions({
      title: 'Günlük Rota',
      headerStyle: { backgroundColor: '#0F7C5B' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '800' },
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleRefreshRoute}
          style={{ marginRight: 15, padding: 5 }}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <MaterialCommunityIcons name="refresh" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      ),
    });
  }, [refreshing]);

  useEffect(() => {
    setCurrentRoute(routePlaces);
  }, [routePlaces]);

  if (!currentRoute || currentRoute.length < 3) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Rota verisi alınamadı</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.errorLink}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const calculateDistance = (place1, place2) => {
    if (!place1 || !place2) return 0;
    const lat1 = place1.latitude;
    const lon1 = place1.longitude;
    const lat2 = place2.latitude;
    const lon2 = place2.longitude;
    
    const R = 6371; // Dünya yarıçapı (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance.toFixed(2);
  };

  const openMaps = (place) => {
    const url = `https://maps.google.com/?q=${place.latitude},${place.longitude}`;
    Linking.openURL(url).catch(err => console.error(err));
  };

  const totalDistance = 
    parseFloat(calculateDistance(currentRoute[0], currentRoute[1])) +
    parseFloat(calculateDistance(currentRoute[1], currentRoute[2]));

  return (
    <SafeAreaView style={styles.container}>
      {isNewRoute && (
        <View style={styles.newRouteBanner}>
          <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
          <Text style={styles.newRouteBannerText}>Bugünün Rotası Hazır! ✨</Text>
        </View>
      )}
      <ScrollView ref={scrollRef} style={styles.scrollView}>
        {/* Başlık */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Sizin İçin Hazırlanan</Text>
          <Text style={styles.headerSubtitle}>Günlük Rota</Text>
          {category && (
            <View style={styles.categoryTag}>
              <MaterialCommunityIcons name="tag" size={14} color="#0F7C5B" />
              <Text style={styles.categoryText}>{category.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Rota Özeti */}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={20} color="#3b82f6" />
            <Text style={styles.summaryLabel}>Toplam Mesafe</Text>
            <Text style={styles.summaryValue}>{totalDistance} km</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#f59e0b" />
            <Text style={styles.summaryLabel}>Süresi</Text>
            <Text style={styles.summaryValue}>3-4 saat</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#10b981" />
            <Text style={styles.summaryLabel}>Mekan Sayısı</Text>
            <Text style={styles.summaryValue}>3</Text>
          </View>
        </View>

        {/* Rota Aşamaları */}
        <View style={styles.stagesContainer}>
          {currentRoute.map((place, index) => {
            const stage = ROUTE_STAGES[index];
            const nextPlace = routePlaces[index + 1];
            const distance = nextPlace ? calculateDistance(place, nextPlace) : null;

            return (
              <View key={`${place.id}-${index}`}>
                {/* Aşama */}
                <View style={styles.stageCard}>
                  <View style={[styles.stageHeader, { backgroundColor: stage.color + '20' }]}>
                    <View style={styles.stageNumber}>
                      <Text style={styles.stageNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.stageInfo}>
                      <Text style={styles.stageLabel}>{stage.label}</Text>
                      <Text style={styles.stageName}>{place.name}</Text>
                      {/* Mekan Türü */}
                      {place.tags && place.tags.length > 0 && (
                        <Text style={styles.stageType}>
                          {place.tags.slice(0, 2).join(', ')}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.stageBadge, { backgroundColor: stage.color }]}>
                      <Text style={styles.stageBadgeText}>{stage.emoji}</Text>
                    </View>
                  </View>

                  <View style={styles.stageDetails}>
                    {/* Rating */}
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="star" size={16} color="#f59e0b" />
                      <Text style={styles.detailText}>
                        {place.rating ? place.rating.toFixed(1) : 'N/A'} yıldız
                      </Text>
                    </View>

                    {/* Uygunluk */}
                    <View style={styles.detailRow}>
                      <MaterialCommunityIcons name="check-circle" size={16} color="#10b981" />
                      <Text style={styles.detailText}>
                        Uygunluk: {place._score ? place._score.toFixed(0) : 0}%
                      </Text>
                    </View>

                    {/* Adres */}
                    {place.address && (
                      <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="map-marker" size={16} color="#ef4444" />
                        <Text style={[styles.detailText, styles.addressText]}>
                          {place.address}
                        </Text>
                      </View>
                    )}

                    {/* Harita Butonu */}
                    <TouchableOpacity 
                      style={styles.mapButton}
                      onPress={() => openMaps(place)}
                    >
                      <MaterialCommunityIcons name="navigation" size={16} color="#fff" />
                      <Text style={styles.mapButtonText}>Haritada Aç</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Mesafe Göstergesi */}
                {distance && (
                  <View style={styles.distanceContainer}>
                    <View style={styles.distanceLine} />
                    <View style={styles.distanceInfo}>
                      <MaterialCommunityIcons name="arrow-down" size={18} color="#d1d5db" />
                      <Text style={styles.distanceText}>{distance} km</Text>
                    </View>
                    <View style={styles.distanceLine} />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* İpuçları */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Tavsiyeler</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>• Sabah erkenden başlamayı unutmayın</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>• Hava durumunu kontrol etmeyi unutmayın</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipText}>• Yeterli suyu yanınızda bulundurun</Text>
          </View>
        </View>

        {/* Geri Butonu */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
          <Text style={styles.backButtonText}>Haritaya Dön</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  newRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: -16,
    gap: 10,
  },
  newRouteBannerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  headerSubtitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
    marginVertical: 4,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#E5B0A8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  summary: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f2937',
    marginTop: 2,
  },
  stagesContainer: {
    marginBottom: 24,
  },
  stageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  stageNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F7C5B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageNumberText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  stageInfo: {
    flex: 1,
  },
  stageLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  stageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 2,
  },
  stageType: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 4,
  },
  stageBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageBadgeText: {
    fontSize: 24,
  },
  stageDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  addressText: {
    fontWeight: '500',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 12,
  },
  distanceLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#d1d5db',
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  tipsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  tipItem: {
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F7C5B',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    marginBottom: 16,
  },
  errorLink: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    padding: 12,
  },
});
