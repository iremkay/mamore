import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { loadProfile } from '../utils/storage';

export default function WelcomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await loadProfile();
      setHasProfile(!!p);
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
    <View style={styles.container}>
      <Text style={styles.title}>Mamore</Text>
      <Text style={styles.subtitle}>Kişiliğine göre mekan & aktivite önerileri ✨</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          if (hasProfile) {
            navigation.getParent().navigate('AppTabs', { screen: 'Home' });
          } else {
            navigation.navigate('Survey');
          }
        }}
      >
        <Text style={styles.buttonText}>{hasProfile ? 'Önerilere Git' : 'Başlayalım'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Survey')}>
        <Text style={styles.link}>Anketi (yeniden) doldur</Text>
      </TouchableOpacity>

      <Text style={styles.small}>Sıradan bir haritadan daha fazlası!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 34, fontWeight: '900', color: '#7c2d12', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#4b5563', textAlign: 'center', marginBottom: 26 },
  button: { backgroundColor: '#f97316', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 999, elevation: 2 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  linkBtn: { marginTop: 14, paddingVertical: 6, paddingHorizontal: 10 },
  link: { color: '#c2410c', fontWeight: '700' },
  small: { marginTop: 16, fontSize: 12, color: '#6b7280', textAlign: 'center' },
});
