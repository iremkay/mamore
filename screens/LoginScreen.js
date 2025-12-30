import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { registerUser, loginUser, getUserProfile } from '../utils/firebaseService';
import { saveAuth, saveProfile, saveUserData } from '../utils/storage';

export default function LoginScreen({ navigation, onRegisterSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Hata', 'Email ve şifre alanları boş olamaz');
      return;
    }

    setLoading(true);
    const result = await loginUser(email.trim(), password);
    
    if (result.success) {
      // Firebase'den kullanıcı profilini al
      const profileResult = await getUserProfile(result.user.uid);
      
      if (profileResult.success) {
        // Auth bilgilerini kaydet
        await saveAuth({
          email: result.user.email,
          username: profileResult.data.username || result.user.displayName || result.user.email.split('@')[0],
          isLoggedIn: true,
          uid: result.user.uid
        });
        
        // Firebase'den gelen profil verilerini yerel storage'a kaydet
        await saveProfile({
          username: profileResult.data.username,
          email: profileResult.data.email,
          uid: result.user.uid,
          // Anket verilerini de kaydet
          profileType: profileResult.data.profileType,
          profileKey: profileResult.data.profileKey,
          activity: profileResult.data.activity,
          vibe: profileResult.data.vibe,
          budget: profileResult.data.budget,
          food: profileResult.data.food,
          weather: profileResult.data.weather,
          group: profileResult.data.group,
          interests: profileResult.data.interests,
        });
        
        // Kullanıcı verisi yoksa oluştur
        await saveUserData({
          profilePicture: profileResult.data.profilePicture || null,
          memories: [],
          favorites: []
        });
        
        setLoading(false);
        // Onboarding flow içinde değilse normal navigation
        if (onRegisterSuccess) {
          // Zaten auth'da, sadece callback çalıştır
          return;
        }
        // Profili kontrol et, yoksa ankete yönlendir
        const { loadProfile } = require('../utils/storage');
        const profile = await loadProfile();
        if (!profile) {
          navigation.replace('WelcomeStack');
        } else {
          navigation.replace('AppTabs');
        }
      } else {
        setLoading(false);
        Alert.alert('Hata', 'Profil yüklenemedi. Lütfen tekrar deneyin.');
      }
    } else {
      setLoading(false);
      Alert.alert('Hata', result.error || 'Giriş yapılamadı');
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !username.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Hata', 'Tüm alanları doldurun');
      return;
    }

    // Email formatı kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Hata', 'Geçerli bir email adresi girin');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalı');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);
    const result = await registerUser(email.trim(), password, username.trim());
    setLoading(false);

    if (result.success) {
      // Auth bilgilerini kaydet
      await saveAuth({
        email: email.trim(),
        username: username.trim(),
        isLoggedIn: true,
        uid: result.user.uid
      });
      
      // Yerel profil verisi oluştur
      const { saveProfile, saveUserData } = require('../utils/storage');
      await saveProfile({
        username: username.trim(),
        email: email.trim(),
        uid: result.user.uid
      });
      await saveUserData({
        profilePicture: null,
        memories: [],
        favorites: []
      });
      
      console.log('✅ Kayıt başarılı, ankete yönlendiriliyor...');
      // Kayıttan sonra direkt ankete yönlendir
      navigation.replace('WelcomeStack', { screen: 'Survey' });
    } else {
      Alert.alert('Hata', result.error || 'Kayıt oluşturulamadı');
    }
  };

  return (
    <ImageBackground
      source={require('../assets/login-bg.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>🗺️</Text>
          <Text style={styles.title}>Mamore</Text>
          <Text style={styles.subtitle}>
            {isRegister ? 'Hesap Oluştur' : 'Hoş Geldin!'}
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Kullanıcı Adı"
              placeholderTextColor="#9ca3af"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Şifre"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {isRegister && (
            <TextInput
              style={styles.input}
              placeholder="Şifre Tekrar"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          )}

          <TouchableOpacity
            onPress={isRegister ? handleRegister : handleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={['#0F7C5B', '#0a5a43', '#0F7C5B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.button}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {isRegister ? 'Kayıt Ol' : 'Giriş Yap'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsRegister(!isRegister);
              setEmail('');
              setUsername('');
              setPassword('');
              setConfirmPassword('');
            }}
          >
            <Text style={styles.switchText}>
              {isRegister 
                ? 'Zaten hesabın var mı? Giriş Yap' 
                : 'Hesabın yok mu? Kayıt Ol'}
            </Text>
          </TouchableOpacity>
        </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(245, 245, 240, 0.92)',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#5A2447',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E5B0A8',
    color: '#111827',
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    elevation: 8,
    shadowColor: '#0F7C5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#0F7C5B',
    fontSize: 14,
    fontWeight: '700',
  },
});
