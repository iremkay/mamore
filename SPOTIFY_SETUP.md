# Spotify API Kurulum Rehberi

Bu özellik, Spotify API kullanarak şarkılardan mood analizi yapar ve mekanları filtreler.

## 1. Spotify Developer Hesabı Oluşturma

1. [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)'a gidin
2. Spotify hesabınızla giriş yapın
3. "Create an App" butonuna tıklayın
4. Uygulama adı ve açıklaması girin (örn: "AuraMap Music")
5. "Create" butonuna tıklayın

## 2. Client Credentials Alma

1. Uygulamanızın sayfasında **Client ID** ve **Client Secret** değerlerini görün
2. Bu bilgileri kopyalayın

## 3. Uygulamaya Entegrasyon

`utils/spotifyService.js` dosyasını açın ve şu satırları güncelleyin:

```javascript
const SPOTIFY_CLIENT_ID = 'BURAYA_CLIENT_ID_GIRIN';
const SPOTIFY_CLIENT_SECRET = 'BURAYA_CLIENT_SECRET_GIRIN';
```

## 4. Nasıl Çalışır?

### Kullanıcı Akışı:
1. Kullanıcı harita ekranında sağ üst köşedeki 🎵 butonuna tıklar
2. Şarkı adı veya sanatçı arar
3. Arama sonuçlarından bir şarkı seçer
4. Sistem şarkının mood özelliklerini analiz eder:
   - **Energy** (Enerji seviyesi)
   - **Valence** (Mutluluk/Üzüntü)
   - **Danceability** (Dans edilebilirlik)
   - **Acousticness** (Akustiklik)
   - **Tempo** (Hız)

### Mood Kategorileri:

- **Enerjik & Neşeli**: Yüksek enerji + Mutlu → Eğlenceli, hareketli mekanlar
- **Sakin & Huzurlu**: Düşük enerji + Akustik → Sessiz, sakin kafeler
- **Romantik & Duygusal**: Orta tempo, romantik → Romantik, samimi mekanlar
- **Parti & Dans**: Yüksek tempo + Dans edilebilir → Parti mekanları
- **Dengeli & Rahat**: Varsayılan → Rahat, dengeli mekanlar

### Filtreleme:
Sistem mood'a göre mekanları filtreler:
- `quiet` (Sakin) → Düşük kalabalıklık
- `crowded` (Kalabalık) → Yüksek kalabalıklık
- `medium` (Orta) → Tüm mekanlar

## 5. Örnek Kullanım

```
Şarkı: "Wonderwall - Oasis"
→ Mood: Sakin & Huzurlu
→ Sonuç: Sessiz kafeleri gösterir

Şarkı: "Uptown Funk - Bruno Mars"
→ Mood: Parti & Dans
→ Sonuç: Hareketli, eğlenceli mekanları gösterir
```

## 6. Hata Ayıklama

- **"Token alınamadı"**: Client ID ve Secret doğru girilmiş mi kontrol edin
- **"Şarkı bulunamadı"**: Farklı bir arama terimi deneyin
- **API limitleri**: Spotify ücretsiz planında dakikada 180 istek limiti vardır

## 7. Güvenlik Notu

⚠️ **ÖNEMLİ**: Production ortamında Client Secret'ı frontend kodunda saklamayın!
- Backend servisi kullanın
- Environment variables kullanın
- API isteklerini backend'den yapın

Bu demo amaçlı bir implementasyondur. Production için güvenlik önlemleri alın.
