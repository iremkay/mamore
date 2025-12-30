import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { loadProfile } from '../utils/storage';

export default function WelcomeScreen({ navigation, isOnboarding }) {
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await loadProfile();
      setHasProfile(!!p && !!p.profileType);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <Text style={styles.small}>Hazırlanıyor…</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/istanbul-bg.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.contentContainer}>
          <Text style={styles.cityIcon}>🗺️</Text>
        <Text style={styles.title}>Mamore</Text>
        <Text style={styles.subtitle}>Kişiliğine göre mekan & aktivite önerileri ✨</Text>

        <TouchableOpacity
          onPress={() => {
            if (hasProfile) {
              navigation.getParent().navigate('AppTabs', { screen: 'Home' });
            } else {
              navigation.navigate('Survey');
            }
          }}
        >
          <LinearGradient
            colors={['#0F7C5B', '#0a5a43', '#0F7C5B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Önerilere Git</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Survey')}>
          <Text style={styles.link}>Anketi (yeniden) doldur</Text>
        </TouchableOpacity>

        <Text style={styles.small}>Sıradan bir haritadan daha fazlası!</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(245, 245, 240, 0.85)',
  },
  contentContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 24 
  },
  cityIcon: {
    fontSize: 80,
    marginBottom: 20,
    opacity: 0.3,
  },
  title: { 
    fontSize: 42, 
    fontWeight: '900', 
    color: '#5A2447', 
    marginBottom: 10, 
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: { fontSize: 16, color: '#4b5563', textAlign: 'center', marginBottom: 30, fontWeight: '600' },
  button: { paddingVertical: 16, paddingHorizontal: 50, borderRadius: 999, elevation: 8, shadowColor: '#0F7C5B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  linkBtn: { marginTop: 16, paddingVertical: 8, paddingHorizontal: 10 },
  link: { color: '#c2410c', fontWeight: '700', fontSize: 14 },
  small: { marginTop: 20, fontSize: 13, color: '#6b7280', textAlign: 'center', fontWeight: '500' },
});
