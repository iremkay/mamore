const PROFILES = [
  { key: 'culture', label: '🎨 Sanat & Kültürcü' },
  { key: 'nature', label: '🌿 Doğa & Sakinlik Sever' },
  { key: 'foodie', label: '🍽️ Foodie – yemek odaklı' },
  { key: 'fun', label: '🎮 Eğlence & Oyun' },
  { key: 'laptop', label: '☕ Sakin kafe – laptopçı tayfa' },
];

function initScores() {
  const s = {};
  for (const p of PROFILES) s[p.key] = 0;
  return s;
}

export function deriveProfileType(answers) {
  const score = initScores();

  // Aktivite (ana belirleyici)
  if (answers.activity === 'museum') score.culture += 6;
  if (answers.activity === 'nature') score.nature += 6;
  if (answers.activity === 'food') score.foodie += 6;
  if (answers.activity === 'games') score.fun += 6;
  if (answers.activity === 'cafe') score.laptop += 6;

  // Ortam (vibe)
  if (answers.vibe === 'quiet') {
    score.nature += 2;
    score.laptop += 2;
    score.culture += 1;
  }
  if (answers.vibe === 'medium') {
    score.foodie += 1;
    score.fun += 1;
  }
  if (answers.vibe === 'crowded') {
    score.fun += 2;
    score.foodie += 1;
  }

  // Damak
  if (answers.food === 'coffee') score.laptop += 2;
  if (answers.food === 'dessert') score.foodie += 2;
  if (answers.food === 'local') score.foodie += 2;
  if (answers.food === 'world') score.foodie += 2;

  // İlgi alanları (multi)
  const tags = answers.interests || [];
  if (tags.includes('art')) score.culture += 2;
  if (tags.includes('books')) {
    score.culture += 1;
    score.laptop += 1;
  }
  if (tags.includes('outdoor')) score.nature += 2;
  if (tags.includes('coffee')) score.laptop += 2;
  if (tags.includes('food')) score.foodie += 2;
  if (tags.includes('games')) score.fun += 2;

  // Kazanan
  let bestKey = null;
  let bestVal = -Infinity;
  for (const [k, v] of Object.entries(score)) {
    if (v > bestVal) {
      bestVal = v;
      bestKey = k;
    }
  }

  const best = PROFILES.find(p => p.key === bestKey);
  return {
    profileKey: bestKey || 'laptop',
    profileType: best?.label || '☕ Sakin kafe – laptopçı tayfa',
    score,
  };
}

export function scorePlace(place, answers, profileKey) {
  let s = 0;

  // Base score: rating
  if (place.rating) s += place.rating * 2;

  // Mekanın hedef profili ile uyum (eğer varsa)
  if (place.profiles?.includes(profileKey)) s += 6;

  // Tag eşleşmesi (kullanıcı ilgi alanları)
  const interests = answers.interests || [];
  const placeTags = place.tags || [];
  for (const t of interests) if (placeTags.includes(t)) s += 2;

  // Vibe & damak eşleşmesi
  if (answers.vibe && place.vibe === answers.vibe) s += 2;
  if (answers.food && place.food === answers.food) s += 2;

  // Bonus: 100 puana normalize et
  return Math.min(Math.max(s, 0), 100);
}
