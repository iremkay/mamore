import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { deriveProfileType } from '../utils/profileEngine';
import { saveProfile, loadAuth } from '../utils/storage';
import { updateUserProfile } from '../utils/firebaseService';

const OPTIONS = {
  activity: [
    { key: 'cafe', label: '☕ Kafe keşfetmek' },
    { key: 'food', label: '🍽️ Yemek avı' },
    { key: 'museum', label: '🎨 Müze / sergi / tarih' },
    { key: 'nature', label: '🌿 Doğa / sahil' },
    { key: 'games', label: '🎮 Oyun / eğlence' },
    { key: 'shopping', label: '🛍️ Alışveriş / pazarlar' },
  ],
  vibe: [
    { key: 'quiet', label: '😌 Sessiz & sakin' },
    { key: 'medium', label: '🙂 Orta, tatlı kalabalık' },
    { key: 'crowded', label: '🔥 Kalabalık & hareketli' },
  ],
  budget: [
    { key: 'budget', label: '💰 Uygun fiyatlı' },
    { key: 'moderate', label: '💵 Orta fiyat' },
    { key: 'premium', label: '💎 Premium / lüks' },
  ],
  food: [
    { key: 'coffee', label: '☕ Kahve ağırlıklı' },
    { key: 'dessert', label: '🍰 Tatlı odaklı' },
    { key: 'local', label: '🥘 Türk mutfağı' },
    { key: 'world', label: '🌍 Dünya mutfağı' },
    { key: 'healthy', label: '🥗 Sağlıklı / vegan' },
  ],
  weather: [
    { key: 'indoor', label: '🏠 Kapalı alanlar' },
    { key: 'outdoor', label: '☀️ Açık hava' },
    { key: 'both', label: '🌤️ Duruma göre' },
  ],
  group: [
    { key: 'solo', label: '🧘 Solo / kişisel' },
    { key: 'couple', label: '👫 Çift' },
    { key: 'friends', label: '👥 Arkadaş grubu' },
    { key: 'family', label: '👨‍👩‍👧 Aile' },
  ],
  interests: [
    { key: 'art', label: '🎭 Sanat' },
    { key: 'books', label: '📚 Kitap / sahaf' },
    { key: 'outdoor', label: '🌿 Outdoor' },
    { key: 'coffee', label: '☕ Kahve' },
    { key: 'food', label: '🍽️ Yemek' },
    { key: 'games', label: '🎮 Oyun' },
    { key: 'photography', label: '📸 Fotoğrafçılık' },
    { key: 'music', label: '🎵 Müzik / konser' },
    { key: 'fashion', label: '👗 Moda / style' },
    { key: 'sports', label: '⚽ Spor' },
  ],
};

export default function SurveyScreen({ navigation, onSurveyComplete }) {
  const [activity, setActivity] = useState([]);
  const [vibe, setVibe] = useState([]);
  const [budget, setBudget] = useState([]);
  const [food, setFood] = useState([]);
  const [weather, setWeather] = useState([]);
  const [group, setGroup] = useState([]);
  const [interests, setInterests] = useState([]);

  const isComplete = activity.length > 0 && vibe.length > 0 && budget.length > 0 && food.length > 0 && weather.length > 0 && group.length > 0;

  const answers = useMemo(
    () => ({ activity, vibe, budget, food, weather, group, interests }),
    [activity, vibe, budget, food, weather, group, interests]
  );

  const toggleOption = (state, setState, key) => {
    setState((prev) => (prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]));
  };

  const onFinish = async () => {
    if (!isComplete) return;

    const derived = deriveProfileType(answers);
    
    // Mevcut profil verisini al
    const { loadProfile: loadExistingProfile } = require('../utils/storage');
    const existingProfile = await loadExistingProfile() || {};
    
    // Yeni anket verileriyle mevcut profili birleştir
    const profile = {
      ...existingProfile, // username, email, uid gibi mevcut verileri koru
      ...answers, // Yeni anket cevapları
      ...derived, // profileType, profileKey, etc.
      createdAt: existingProfile.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('📝 Anket tamamlandı, profil tipi:', derived.profileType);
    await saveProfile(profile);
    
    // Firebase'e de kaydet (eğer giriş yaptıysa)
    const auth = await loadAuth();
    console.log('🔍 SurveyScreen - Auth bilgisi:', { uid: auth?.uid, username: auth?.username });
    
    if (auth && auth.uid) {
      const updateData = {
        profileType: profile.profileType,
        profileKey: profile.profileKey,
        activity: profile.activity,
        vibe: profile.vibe,
        budget: profile.budget,
        food: profile.food,
        weather: profile.weather,
        group: profile.group,
        interests: profile.interests
      };
      console.log('🔍 SurveyScreen - Firebase\'e kaydedilecek veri:', updateData);
      
      const result = await updateUserProfile(auth.uid, updateData);
      console.log('✅ Firebase kayıt sonucu:', result);
      
      if (result.success) {
        console.log('✅ Profil Firebase\'e başarıyla kaydedildi');
      } else {
        console.error('❌ Firebase kayıt hatası:', result.error);
        Alert.alert('Uyarı', 'Profil bilgileri yerel olarak kaydedildi ancak senkronizasyon başarısız oldu.');
      }
    } else {
      console.log('⚠️ Auth bilgisi yok, Firebase\'e kaydedilmedi');
    }
    
    // Onboarding flow içinde miyiz?
    if (onSurveyComplete) {
      console.log('✅ Hoş geldin ekranına yönlendiriliyor...');
      onSurveyComplete();
    } else {
      // İlk kayıt mı güncelleme mi kontrol et
      if (existingProfile && existingProfile.profileType) {
        // Güncelleme modu: geri dön
        console.log('✅ Anket güncellendi, geri dönülüyor...');
        Alert.alert('Başarılı', 'Anketiniz güncellendi!', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]);
      } else {
        // İlk kayıt: anasayfaya yönlendir
        console.log('✅ İlk anket tamamlandı, anasayfaya yönlendiriliyor...');
        Alert.alert('Hoş Geldin!', `Profil tipin: ${derived.profileType}`, [
          { text: 'Başlayalım!', onPress: () => {
            // WelcomeStack'ten çık, AppTabs'e geç
            navigation.getParent()?.navigate('AppTabs', { screen: 'Home' });
          }}
        ]);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Seni tanıyıp “profil tipi” çıkaralım ✨</Text>

      <Block title="1) Ne yapmayı daha çok seversin?">
        {OPTIONS.activity.map(opt => (
          <Option key={opt.key} label={opt.label} selected={activity.includes(opt.key)} onPress={() => toggleOption(activity, setActivity, opt.key)} />
        ))}
      </Block>

      <Block title="2) Ortam tercihin?">
        {OPTIONS.vibe.map(opt => (
          <Option key={opt.key} label={opt.label} selected={vibe.includes(opt.key)} onPress={() => toggleOption(vibe, setVibe, opt.key)} />
        ))}
      </Block>

      <Block title="3) Bütçe tercihin?">
        {OPTIONS.budget.map(opt => (
          <Option key={opt.key} label={opt.label} selected={budget.includes(opt.key)} onPress={() => toggleOption(budget, setBudget, opt.key)} />
        ))}
      </Block>

      <Block title="4) Damak zevkin?">
        {OPTIONS.food.map(opt => (
          <Option key={opt.key} label={opt.label} selected={food.includes(opt.key)} onPress={() => toggleOption(food, setFood, opt.key)} />
        ))}
      </Block>

      <Block title="5) Hava durumuna göre tercihin?">
        {OPTIONS.weather.map(opt => (
          <Option key={opt.key} label={opt.label} selected={weather.includes(opt.key)} onPress={() => toggleOption(weather, setWeather, opt.key)} />
        ))}
      </Block>

      <Block title="6) Kimlerle gezmeyi seviyorsun?">
        {OPTIONS.group.map(opt => (
          <Option key={opt.key} label={opt.label} selected={group.includes(opt.key)} onPress={() => toggleOption(group, setGroup, opt.key)} />
        ))}
      </Block>

      <Block title="7) İlgi alanların (birden fazla seçebilirsin)">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {OPTIONS.interests.map(opt => (
            <Chip key={opt.key} label={opt.label} selected={interests.includes(opt.key)} onPress={() => toggleOption(interests, setInterests, opt.key)} />
          ))}
        </View>
      </Block>

      <TouchableOpacity
        style={[styles.button, !isComplete && styles.buttonDisabled]}
        onPress={onFinish}
        disabled={!isComplete}
      >
        <Text style={styles.buttonText}>{isComplete ? 'Profilimi Oluştur' : 'Her kategoriyi en az bir seçeneğiyle doldur 😊'}</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>Profil ekranın da otomatik oluşacak 😌</Text>
    </ScrollView>
  );
}

function Block({ title, children }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Option({ label, selected, onPress }) {
  return (
    <TouchableOpacity style={[styles.option, selected && styles.optionSelected]} onPress={onPress}>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Chip({ label, selected, onPress }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 34, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: 14 },
  block: { marginBottom: 14 },
  blockTitle: { fontSize: 15, fontWeight: '800', color: '#374151', marginBottom: 8 },
  option: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  optionSelected: { backgroundColor: '#fed7aa', borderColor: '#fb923c' },
  optionText: { color: '#4b5563', fontSize: 14 },
  optionTextSelected: { color: '#7c2d12', fontWeight: '900' },
  chip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb' },
  chipSelected: { backgroundColor: '#ffedd5', borderColor: '#fb923c' },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextSelected: { fontWeight: '900', color: '#7c2d12' },
  button: { marginTop: 8, backgroundColor: '#f97316', paddingVertical: 14, borderRadius: 999, alignItems: 'center' },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  hint: { marginTop: 10, fontSize: 12, color: '#6b7280', textAlign: 'center' },
});
