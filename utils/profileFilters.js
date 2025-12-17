/**
 * Profil Tipi -> Mekan Filtreleri
 * Örn: Gamer profiline göre mekan kategorileri önemlilik sırasına göre
 */

// Her profil tipi için mekan tercih haritası
const PROFILE_TO_PLACE_PREFERENCES = {
  'Peaceful Wanderer': {
    // Sakin, doğa, solo seveni
    priority_tags: ['park', 'library', 'museum', 'cafe'],
    vibe_preference: 'quiet',
    budget_range: 'budget',
    keywords: ['park', 'natural', 'quiet', 'peaceful'],
  },
  'Social Butterfly': {
    // Sosyal, kalabalık, grup
    priority_tags: ['bar', 'night_club', 'restaurant', 'cafe'],
    vibe_preference: 'crowded',
    budget_range: 'moderate',
    keywords: ['social', 'group', 'lively', 'crowded'],
  },
  'Foodie Explorer': {
    // Yemek tutkunları
    priority_tags: ['restaurant', 'cafe', 'bakery', 'bar_and_grill'],
    vibe_preference: 'medium',
    budget_range: 'premium',
    keywords: ['food', 'restaurant', 'cuisine', 'dining'],
  },
  'Gaming Enthusiast': {
    // Oyun severler
    priority_tags: ['entertainment', 'arcade', 'cafe'],
    vibe_preference: 'crowded',
    budget_range: 'moderate',
    keywords: ['arcade', 'game', 'entertainment', 'gaming'],
  },
  'Culture Seeker': {
    // Sanat, kültür
    priority_tags: ['museum', 'art_gallery', 'theater', 'cultural_center'],
    vibe_preference: 'quiet',
    budget_range: 'moderate',
    keywords: ['art', 'culture', 'museum', 'gallery'],
  },
  'Outdoor Adventurer': {
    // Doğa, outdoor
    priority_tags: ['park', 'hiking_area', 'beach', 'viewpoint'],
    vibe_preference: 'outdoor',
    budget_range: 'budget',
    keywords: ['nature', 'outdoor', 'hiking', 'trail'],
  },
};

/**
 * Mekanları profil tercihleriyle eşleştir ve puanlandır
 * profileEngine'deki scorePlace() ile aynı mantık
 */
export function filterPlacesByProfile(places, profileType, userProfile) {
  const preferences = PROFILE_TO_PLACE_PREFERENCES[profileType];

  if (!preferences) {
    console.log(`Profil tipi ${profileType} için tercihler bulunamadı`);
    return places; // Filtresiz döndür
  }

  return places
    .map(place => {
      const score = calculatePlaceScore(place, preferences, userProfile);
      return { ...place, _compatibilityScore: score };
    })
    .filter(place => place._compatibilityScore > 0)
    .sort((a, b) => b._compatibilityScore - a._compatibilityScore);
}

/**
 * Mekan uyum puanı hesapla (0-100)
 */
function calculatePlaceScore(place, preferences, userProfile) {
  let score = 50; // Base score

  // 1) Tag uyumu
  const matchedTags = (place.tags || []).filter(tag =>
    preferences.priority_tags.some(p => tag.includes(p) || p.includes(tag))
  );
  score += matchedTags.length * 10; // Her tag eşleşmesi +10

  // 2) Vibe uyumu
  if (place.vibe === preferences.vibe_preference) {
    score += 15;
  }

  // 3) Rating
  if (place.rating) {
    score += (place.rating / 5) * 10; // 4.5 rating = +9
  }

  // 4) Bütçe uyumu (userProfile var mı kontrol et)
  if (userProfile && userProfile.budget === preferences.budget_range) {
    score += 10;
  }

  // 5) Açık/Kapalı alanı
  if (userProfile && userProfile.weather === 'outdoor' && place.outdoor) {
    score += 5;
  }

  // 6) Grup tipi uyumu
  if (userProfile && userProfile.group === 'friends' && place.good_for_groups) {
    score += 5;
  }

  return Math.min(score, 100); // Max 100
}

/**
 * Profil tipine göre "Ne aramalı?" sorusu
 */
export function getRecommendationMessage(profileType) {
  const messages = {
    'Peaceful Wanderer': '🌿 Sana sakin, doğacı mekanlar ön plana alındı...',
    'Social Butterfly': '🦋 Sana sosyal, hareketli mekanlar önerildi...',
    'Foodie Explorer': '🍽️ Sana lezzetli mekanlar hazırlandı...',
    'Gaming Enthusiast': '🎮 Sana oyun & eğlence mekanları gösteriliyor...',
    'Culture Seeker': '🎨 Sana kültür & sanat mekanları sunuluyor...',
    'Outdoor Adventurer': '⛰️ Sana outdoor & doğa macerası bekleniyor...',
  };

  return messages[profileType] || '✨ Sana özel mekanlar gösteriliyor...';
}

/**
 * Mekan uyum seviyesi (UI'da gösterilecek)
 * @param {number} score 0-100
 */
export function getCompatibilityLabel(score) {
  if (score >= 80) return '🔥 Tam sana göre!';
  if (score >= 60) return '✨ Çok iyi eşleşme';
  if (score >= 40) return '👍 İyi seçim';
  return '🤔 Keşfetmeye değer';
}
