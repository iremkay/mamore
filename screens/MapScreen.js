import React, { useState, useMemo, useEffect } from 'react';
import { Text, View, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { loadProfile } from '../utils/storage';
import { placesFromGoogle, getCurrentLocation } from '../utils/placesService';
import { scorePlace } from '../utils/profileEngine';

const START = {
  latitude: 41.015137,
  longitude: 28.97953,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen({ navigation }) {
  const [userLocation, setUserLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    setLoading(true);
    try {
      // Profil yükle
      const p = await loadProfile();
      setProfile(p);

      // Konum al
      const location = await getCurrentLocation();
      if (location) {
        setUserLocation(location);

        // Yakındaki mekanları al (Google Places API)
        if (p) {
          const googlePlaces = await placesFromGoogle(location, p.profileKey);
          if (googlePlaces && googlePlaces.length > 0) {
            // Mekanları puanlandır
            const scored = googlePlaces.map(place => ({
              ...place,
              profiles: [p.profileKey],
              _score: scorePlace(place, { 
                interests: p.interests || [],
                vibe: p.vibe,
                food: p.food
              }, p.profileKey),
            })).sort((a, b) => b._score - a._score);
            
            setPlaces(scored);
          } else {
            setPlaces([]);
          }
        }
      }
    } catch (error) {
      console.error('Harita verisi hatası:', error);
      Alert.alert('Hata', 'Konum veya mekanlar alınamadı');
    }
    setLoading(false);
  };

  const mapHTML = useMemo(() => {
    const center = userLocation || { latitude: 41.015137, longitude: 28.97953 };
    
    // Marker verileri
    let markers = '';
    
    // Kullanıcı konumu (mavi nokta)
    if (userLocation) {
      markers += `
        L.circleMarker([${userLocation.latitude}, ${userLocation.longitude}], {
          radius: 10,
          fillColor: '#3b82f6',
          color: '#fff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map).bindPopup('<div style="text-align: center;"><b>📍 Benim Konumum</b></div>', {maxWidth: 200});
      `;
    }

    // Mekan markerları - HTML marker ile simgeli
    places.forEach((place) => {
      const color = place._score > 70 ? '#10b981' : place._score > 50 ? '#f59e0b' : '#ef4444';
      const emoji = place._score > 70 ? '⭐' : place._score > 50 ? '✓' : '•';
      
      markers += `
        L.circleMarker([${place.latitude}, ${place.longitude}], {
          radius: 8,
          fillColor: '${color}',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85
        }).addTo(map).bindPopup('<div style="text-align: center;"><b>☕ ${place.name}</b><br>⭐ ${place.rating ? place.rating.toFixed(1) : 'N/A'}<br>Uygunluk: ${place._score ? place._score.toFixed(0) : 0}%</div>', {maxWidth: 250});
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { width: 100%; height: 100%; }
          .leaflet-popup-content { font-size: 13px; font-family: system-ui; }
          .leaflet-popup-content-wrapper { border-radius: 8px; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${center.latitude}, ${center.longitude}], 14);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19,
            minZoom: 10
          }).addTo(map);
          
          ${markers}
          
          // Zoom kontrolleri
          map.zoomControl.setPosition('bottomright');
        </script>
      </body>
      </html>
    `;
  }, [userLocation, places]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Konum ve mekanlar yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ Konum alınamadı</Text>
          <Button title="Tekrar Dene" onPress={loadMapData} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <WebView 
        style={styles.map}
        source={{ html: mapHTML }}
        scrollEnabled={true}
        zoomEnabled={true}
      />

      <View style={styles.bottomPanel}>
        <Text style={styles.hint}>
          📍 Mekanlar: {places.length} bulundu
        </Text>
        <View style={styles.buttonContainer}>
          <Button title="Yenile" onPress={loadMapData} color="#3b82f6" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    marginBottom: 16,
  },
  bottomPanel: {
    padding: 12,
    backgroundColor: '#1f2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  hint: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
});

