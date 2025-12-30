// Spotify API Servisi
// Not: Spotify Developer Dashboard'dan Client ID ve Client Secret alın
// https://developer.spotify.com/dashboard

const SPOTIFY_CLIENT_ID = 'YOUR_CLIENT_ID'; // Buraya kendi Client ID'nizi girin
const SPOTIFY_CLIENT_SECRET = 'YOUR_CLIENT_SECRET'; // Buraya kendi Client Secret'ınızı girin

// DEMO MODE - API olmadan çalışır
const DEMO_MODE = true; // true = mock data, false = gerçek Spotify API

let accessToken = null;
let tokenExpiry = null;

// Mock şarkı veritabanı
const MOCK_TRACKS = [
  // Enerjik & Neşeli
  { id: '1', name: 'Uptown Funk', artist: 'Bruno Mars', energy: 0.9, valence: 0.9, danceability: 0.8, acousticness: 0.1, tempo: 115 },
  { id: '2', name: 'Happy', artist: 'Pharrell Williams', energy: 0.8, valence: 0.95, danceability: 0.75, acousticness: 0.2, tempo: 160 },
  { id: '3', name: 'Can\'t Stop the Feeling', artist: 'Justin Timberlake', energy: 0.85, valence: 0.9, danceability: 0.8, acousticness: 0.15, tempo: 113 },
  
  // Sakin & Huzurlu
  { id: '4', name: 'Bilmem mi', artist: 'Mabel Matiz', energy: 0.3, valence: 0.4, danceability: 0.4, acousticness: 0.7, tempo: 85 },
  { id: '5', name: 'Wonderwall', artist: 'Oasis', energy: 0.35, valence: 0.5, danceability: 0.3, acousticness: 0.75, tempo: 87 },
  { id: '6', name: 'The Scientist', artist: 'Coldplay', energy: 0.3, valence: 0.3, danceability: 0.35, acousticness: 0.8, tempo: 146 },
  { id: '7', name: 'Elastic Heart', artist: 'Sia', energy: 0.4, valence: 0.35, danceability: 0.4, acousticness: 0.65, tempo: 136 },
  
  // Romantik & Duygusal
  { id: '8', name: 'Gel', artist: 'Barış Manço', energy: 0.5, valence: 0.5, danceability: 0.5, acousticness: 0.5, tempo: 95 },
  { id: '9', name: 'Thinking Out Loud', artist: 'Ed Sheeran', energy: 0.45, valence: 0.6, danceability: 0.45, acousticness: 0.55, tempo: 79 },
  { id: '10', name: 'All of Me', artist: 'John Legend', energy: 0.4, valence: 0.55, danceability: 0.4, acousticness: 0.6, tempo: 120 },
  
  // Parti & Dans
  { id: '11', name: 'Levitating', artist: 'Dua Lipa', energy: 0.85, valence: 0.8, danceability: 0.9, acousticness: 0.05, tempo: 103 },
  { id: '12', name: 'Blinding Lights', artist: 'The Weeknd', energy: 0.9, valence: 0.7, danceability: 0.85, acousticness: 0.0, tempo: 171 },
  { id: '13', name: 'Gesi Bağları', artist: 'Athena', energy: 0.8, valence: 0.75, danceability: 0.85, acousticness: 0.1, tempo: 128 },
  
  // Türkçe Popüler
  { id: '14', name: 'Yalan', artist: 'Tarkan', energy: 0.7, valence: 0.6, danceability: 0.7, acousticness: 0.3, tempo: 110 },
  { id: '15', name: 'Her Şey Yolunda Merkaba', artist: 'Gülşen', energy: 0.65, valence: 0.7, danceability: 0.75, acousticness: 0.25, tempo: 105 },
  { id: '16', name: 'Çoban Yıldızı', artist: 'Teoman', energy: 0.35, valence: 0.4, danceability: 0.35, acousticness: 0.7, tempo: 90 },
  { id: '17', name: 'Bir Teselli Ver', artist: 'Müslüm Gürses', energy: 0.3, valence: 0.2, danceability: 0.3, acousticness: 0.75, tempo: 80 },
  { id: '18', name: 'Aşk Bitsin', artist: 'Ajda Pekkan', energy: 0.6, valence: 0.5, danceability: 0.65, acousticness: 0.4, tempo: 100 },
];

// Access token al
async function getAccessToken() {
  // Eğer token varsa ve süresi dolmamışsa, mevcut token'ı kullan
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  // Client ID ve Secret kontrolü
  if (SPOTIFY_CLIENT_ID === 'YOUR_CLIENT_ID' || SPOTIFY_CLIENT_SECRET === 'YOUR_CLIENT_SECRET') {
    console.error('❌ Spotify Client ID ve Secret girilmemiş!');
    return null;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET)
      },
      body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Spotify token hatası:', data);
      return null;
    }
    
    console.log('✅ Spotify token alındı');
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    return accessToken;
  } catch (error) {
    console.error('❌ Spotify token error:', error);
    return null;
  }
}

// Şarkı ara
export async function searchTrack(query) {
  console.log('🔍 Şarkı aranıyor:', query);
  
  // DEMO MODE
  if (DEMO_MODE) {
    console.log('🎭 DEMO MODE aktif - Mock data kullanılıyor');
    
    // Küçük harfe çevir ve arama yap
    const searchTerm = query.toLowerCase();
    const results = MOCK_TRACKS.filter(track => 
      track.name.toLowerCase().includes(searchTerm) || 
      track.artist.toLowerCase().includes(searchTerm)
    );
    
    if (results.length > 0) {
      console.log('✅', results.length, 'şarkı bulundu');
      return { 
        success: true, 
        tracks: results.map(track => ({
          id: track.id,
          name: track.name,
          artist: track.artist,
          album: 'Demo Album',
          image: null,
          previewUrl: null
        }))
      };
    } else {
      // Hiç sonuç yoksa ilk 5 şarkıyı göster
      console.log('⚠️ Eşleşme yok, popüler şarkılar gösteriliyor');
      return {
        success: true,
        tracks: MOCK_TRACKS.slice(0, 5).map(track => ({
          id: track.id,
          name: track.name,
          artist: track.artist,
          album: 'Demo Album',
          image: null,
          previewUrl: null
        }))
      };
    }
  }
  
  // GERÇEK SPOTIFY API
  try {
    const token = await getAccessToken();
    if (!token) {
      console.error('❌ Token alınamadı - Spotify Client ID ve Secret kontrol edin');
      return { success: false, error: 'Spotify API bağlantısı kurulamadı. SPOTIFY_SETUP.md dosyasını okuyun.' };
    }

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Spotify arama hatası:', data);
      return { success: false, error: 'Arama başarısız oldu' };
    }
    
    console.log('✅ Spotify arama sonucu:', data.tracks?.items?.length || 0, 'şarkı bulundu');
    
    if (data.tracks && data.tracks.items.length > 0) {
      const tracks = data.tracks.items.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        image: track.album.images[0]?.url,
        previewUrl: track.preview_url
      }));
      return { success: true, tracks };
    }
    
    console.log('⚠️ Şarkı bulunamadı');
    return { success: false, error: 'Şarkı bulunamadı' };
  } catch (error) {
    console.error('❌ Spotify search error:', error);
    return { success: false, error: error.message };
  }
}

// Şarkının ses özelliklerini al (tempo, energy, valence, etc.)
export async function getAudioFeatures(trackId) {
  console.log('🎵 Şarkı özellikleri alınıyor:', trackId);
  
  // DEMO MODE
  if (DEMO_MODE) {
    const track = MOCK_TRACKS.find(t => t.id === trackId);
    if (track) {
      console.log('✅ Mock özellikler alındı');
      return {
        success: true,
        features: {
          energy: track.energy,
          valence: track.valence,
          danceability: track.danceability,
          acousticness: track.acousticness,
          tempo: track.tempo,
          loudness: -5
        }
      };
    } else {
      console.error('❌ Track bulunamadı');
      return { success: false, error: 'Track bulunamadı' };
    }
  }
  
  // GERÇEK SPOTIFY API
  try {
    const token = await getAccessToken();
    if (!token) {
      return { success: false, error: 'Token alınamadı' };
    }

    const response = await fetch(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const features = await response.json();
    
    return {
      success: true,
      features: {
        energy: features.energy, // 0-1: Enerjik mi?
        valence: features.valence, // 0-1: Mutlu mu üzgün mü?
        danceability: features.danceability, // 0-1: Dans edilebilir mi?
        acousticness: features.acousticness, // 0-1: Akustik mi?
        tempo: features.tempo, // BPM
        loudness: features.loudness // dB
      }
    };
  } catch (error) {
    console.error('Spotify audio features error:', error);
    return { success: false, error: error.message };
  }
}

// Mood'u analiz et ve mekan önerisi kategorisine çevir
export function analyzeMood(features) {
  const { energy, valence, danceability, acousticness, tempo } = features;

  // Yüksek enerji + Mutlu = Eğlenceli mekanlar
  if (energy > 0.7 && valence > 0.6) {
    return {
      mood: 'energetic',
      moodText: 'Enerjik & Neşeli',
      vibe: 'crowded', // Kalabalık & hareketli
      suggested: 'Eğlenceli, hareketli mekanlar sana göre!'
    };
  }

  // Düşük enerji + Akustik = Sakin kafeler
  if (energy < 0.4 && acousticness > 0.5) {
    return {
      mood: 'calm',
      moodText: 'Sakin & Huzurlu',
      vibe: 'quiet', // Sessiz & sakin
      suggested: 'Sessiz, huzurlu kafeler sana göre!'
    };
  }

  // Orta tempo + Romantik (orta valence) = Romantic mekanlar
  if (valence > 0.4 && valence < 0.7 && energy < 0.6) {
    return {
      mood: 'romantic',
      moodText: 'Romantik & Duygusal',
      vibe: 'medium', // Orta
      suggested: 'Romantik, samimi mekanlar sana göre!'
    };
  }

  // Yüksek tempo + Yüksek danceability = Parti mekanları
  if (danceability > 0.7 && tempo > 120) {
    return {
      mood: 'party',
      moodText: 'Parti & Dans',
      vibe: 'crowded', // Kalabalık
      suggested: 'Parti yapabileceğin mekanlar sana göre!'
    };
  }

  // Varsayılan: Orta
  return {
    mood: 'moderate',
    moodText: 'Dengeli & Rahat',
    vibe: 'medium',
    suggested: 'Rahat, dengeli mekanlar sana göre!'
  };
}
