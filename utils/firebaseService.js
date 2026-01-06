import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { auth, db, storage } from '../config/firebase';

// ============ AUTHENTICATION ============

export async function registerUser(email, password, username) {
  try {
    // Firebase Authentication ile kullanıcı oluştur
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Kullanıcı profil adını güncelle
    await updateProfile(user, { displayName: username });

    // Firestore'a kullanıcı bilgilerini kaydet
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email.toLowerCase(),
      username: username,
      profilePicture: null,
      followers: [],
      following: [],
      createdAt: new Date().toISOString(),
    });

    return { success: true, user };
  } catch (error) {
    // Kullanıcı dostu hata mesajları
    let errorMessage = 'Kayıt oluşturulamadı';
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Bu email adresi zaten kullanılıyor';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Geçersiz email adresi';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Şifre çok zayıf. En az 6 karakter olmalı';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'İnternet bağlantısı yok';
    }
    
    return { success: false, error: errorMessage };
  }
}

export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    // Kullanıcı dostu hata mesajları
    let errorMessage = 'Giriş yapılamadı';
    
    const errorCode = error.code || '';
    
    if (errorCode.includes('user-not-found')) {
      errorMessage = 'Kayıt bulunamadı. Lütfen önce kayıt olun';
    } else if (errorCode.includes('wrong-password')) {
      errorMessage = 'Şifre yanlış';
    } else if (errorCode.includes('invalid-email')) {
      errorMessage = 'Geçersiz email adresi';
    } else if (errorCode.includes('user-disabled')) {
      errorMessage = 'Bu hesap devre dışı bırakılmış';
    } else if (errorCode.includes('too-many-requests')) {
      errorMessage = 'Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin';
    } else if (errorCode.includes('network-request-failed')) {
      errorMessage = 'İnternet bağlantısı yok';
    } else if (errorCode.includes('invalid-credential')) {
      errorMessage = 'Kayıt bulunamadı. Lütfen bilgilerinizi kontrol edin';
    }
    
    return { success: false, error: errorMessage };
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

// ============ USER MANAGEMENT ============

export async function getUserProfile(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Get user profile error:', error);
    return { success: false, error: error.message };
  }
}

export async function updateUserProfile(uid, data) {
  try {
    await updateDoc(doc(db, 'users', uid), data);
    return { success: true };
  } catch (error) {
    console.error('Update user profile error:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllUsersFromFirebase() {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = [];
    usersSnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, users };
  } catch (error) {
    console.error('Get all users error:', error);
    return { success: false, error: error.message };
  }
}

export async function searchUsers(searchQuery) {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = [];
    const lowerQuery = searchQuery.toLowerCase().trim();
    
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (
        data.username.toLowerCase().includes(lowerQuery) ||
        data.email.toLowerCase().includes(lowerQuery)
      ) {
        users.push({ id: doc.id, ...data });
      }
    });
    
    return { success: true, users };
  } catch (error) {
    console.error('Search users error:', error);
    return { success: false, error: error.message };
  }
}

// ============ FOLLOW SYSTEM ============

export async function followUserFirebase(currentUid, targetUid) {
  try {
    // Kendi following listene ekle
    await updateDoc(doc(db, 'users', currentUid), {
      following: arrayUnion(targetUid)
    });

    // Karşı tarafın followers listesine ekle
    await updateDoc(doc(db, 'users', targetUid), {
      followers: arrayUnion(currentUid)
    });

    return { success: true };
  } catch (error) {
    console.error('Follow user error:', error);
    return { success: false, error: error.message };
  }
}

export async function unfollowUserFirebase(currentUid, targetUid) {
  try {
    // Kendi following listenden çıkar
    await updateDoc(doc(db, 'users', currentUid), {
      following: arrayRemove(targetUid)
    });

    // Karşı tarafın followers listesinden çıkar
    await updateDoc(doc(db, 'users', targetUid), {
      followers: arrayRemove(currentUid)
    });

    return { success: true };
  } catch (error) {
    console.error('Unfollow user error:', error);
    return { success: false, error: error.message };
  }
}

export async function getFollowersFirebase(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { success: true, followers: userDoc.data().followers || [] };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Get followers error:', error);
    return { success: false, error: error.message };
  }
}

export async function getFollowingFirebase(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { success: true, following: userDoc.data().following || [] };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Get following error:', error);
    return { success: false, error: error.message };
  }
}

// ============ STORAGE ============

export async function uploadProfilePicture(uid, imageUri) {
  try {
    console.log('Starting upload for user:', uid);
    console.log('Image URI:', imageUri);
    
    // Option 1: Try to convert to base64 and save to Firestore
    try {
      // Fetch the image from the local URI
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error('Failed to fetch image from URI');
      }
      
      const blob = await response.blob();
      console.log('Blob created, size:', blob.size);
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      const base64Data = await base64Promise;
      console.log('Base64 conversion successful');
      
      // Save base64 string directly to Firestore
      await updateDoc(doc(db, 'users', uid), {
        profilePicture: base64Data
      });
      console.log('Firestore updated with base64 image');
      
      return { success: true, url: base64Data };
    } catch (base64Error) {
      console.error('Base64 conversion error:', base64Error);
      
      // Option 2: Fallback to Firebase Storage if base64 fails
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const filename = `profile_${uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `profilePictures/${filename}`);
      
      console.log('Attempting Firebase Storage upload');
      
      const metadata = {
        contentType: 'image/jpeg',
        customMetadata: {
          'userId': uid
        }
      };
      
      const uploadTask = await uploadBytes(storageRef, blob, metadata);
      console.log('Storage upload successful');
      
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL obtained:', downloadURL);
      
      await updateDoc(doc(db, 'users', uid), {
        profilePicture: downloadURL
      });
      console.log('Firestore updated with URL');
      
      return { success: true, url: downloadURL };
    }
  } catch (error) {
    console.error('Upload profile picture error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    let errorMessage = 'Fotoğraf yüklenemedi';
    if (error.code === 'storage/unauthorized') {
      errorMessage = 'Firebase Storage izin hatası. Lütfen Firebase ayarlarını kontrol edin.';
    } else if (error.code === 'storage/canceled') {
      errorMessage = 'Yükleme iptal edildi';
    } else if (error.code === 'storage/unknown') {
      errorMessage = 'Firebase Storage hatası. Fotoğraf yerel olarak kaydedildi.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

// ============ MEMORIES / FEED SYSTEM ============

export async function getFollowingFeed(uid) {
  try {
    // Kullanıcının takip ettiklerini al
    const followingResult = await getFollowingFirebase(uid);
    if (!followingResult.success) {
      return { success: true, memories: [] };
    }

    const following = followingResult.following || [];
    
    // Kendi anılarını da ekle
    const userIds = [uid, ...following];
    
    // Tüm memories koleksiyonundan bu kullanıcıların anılarını çek
    const memoriesSnapshot = await getDocs(collection(db, 'memories'));
    const memories = [];
    
    for (const memoryDoc of memoriesSnapshot.docs) {
      const data = memoryDoc.data();
      if (userIds.includes(data.userId)) {
        // Kullanıcı bilgilerini al
        const userProfile = await getUserProfile(data.userId);
        memories.push({
          id: memoryDoc.id,
          ...data,
          username: userProfile.success ? userProfile.data.username : 'Bilinmeyen',
          userPhoto: userProfile.success ? userProfile.data.profilePicture : null,
        });
      }
    }
    
    // Tarihe göre sırala (en yeni en üstte)
    memories.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });
    
    return { success: true, memories };
  } catch (error) {
    console.error('Get following feed error:', error);
    return { success: false, error: error.message };
  }
}

export async function createMemory(userId, memoryData) {
  try {
    const memoryRef = doc(collection(db, 'memories'));
    await setDoc(memoryRef, {
      userId,
      placeName: memoryData.placeName,
      note: memoryData.note || '',
      photo: memoryData.photo || null,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
    });
    
    return { success: true, memoryId: memoryRef.id };
  } catch (error) {
    console.error('Create memory error:', error);
    return { success: false, error: error.message };
  }
}

export async function likeMemory(memoryId, userId) {
  try {
    await updateDoc(doc(db, 'memories', memoryId), {
      likes: arrayUnion(userId)
    });
    return { success: true };
  } catch (error) {
    console.error('Like memory error:', error);
    return { success: false, error: error.message };
  }
}

export async function unlikeMemory(memoryId, userId) {
  try {
    await updateDoc(doc(db, 'memories', memoryId), {
      likes: arrayRemove(userId)
    });
    return { success: true };
  } catch (error) {
    console.error('Unlike memory error:', error);
    return { success: false, error: error.message };
  }
}

export async function addComment(memoryId, userId, username, text) {
  try {
    await updateDoc(doc(db, 'memories', memoryId), {
      comments: arrayUnion({
        userId,
        username,
        text,
        createdAt: new Date().toISOString()
      })
    });
    return { success: true };
  } catch (error) {
    console.error('Add comment error:', error);
    return { success: false, error: error.message };
  }
}

// ============ NOTIFICATIONS SYSTEM ============

export async function createNotification(recipientUid, notificationData) {
  try {
    const notificationRef = doc(collection(db, 'notifications'));
    await setDoc(notificationRef, {
      recipientUid,
      type: notificationData.type, // 'stamp', 'like', 'comment', 'follow'
      senderUid: notificationData.senderUid,
      senderUsername: notificationData.senderUsername,
      message: notificationData.message,
      placeId: notificationData.placeId || null,
      placeName: notificationData.placeName || null,
      stampCategory: notificationData.stampCategory || null,
      stampEmoji: notificationData.stampEmoji || null,
      read: false,
      createdAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Create notification error:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserNotifications(uid) {
  try {
    const notificationsSnapshot = await getDocs(collection(db, 'notifications'));
    const notifications = [];
    
    notificationsSnapshot.forEach((doc) => {
      const data = doc.data();
      // recipientUid veya toUserId field'larını kontrol et
      if (data.recipientUid === uid || data.toUserId === uid) {
        notifications.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    // Tarihe göre sırala (en yeni en üstte)
    notifications.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });
    
    return { success: true, notifications };
  } catch (error) {
    console.error('Get notifications error:', error);
    return { success: false, error: error.message };
  }
}

export async function markNotificationAsRead(notificationId) {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
    return { success: true };
  } catch (error) {
    console.error('Mark notification as read error:', error);
    return { success: false, error: error.message };
  }
}

// ============ GOOD DEEDS (İYİLİK PULLARI) ============

// İyilik pulu oluştur ve rastgele restorana askıda yemek kuponu ekle
export async function createGoodDeed(userUid, username, triggerPlaceId, triggerPlaceName) {
  try {
    const goodDeedId = `gooddeed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const goodDeedData = {
      id: goodDeedId,
      userUid,
      username,
      triggerPlaceId, // Pulu tetikleyen mekan
      triggerPlaceName,
      createdAt: new Date().toISOString(),
      status: 'pending', // pending, assigned, used
      assignedRestaurantId: null,
      assignedRestaurantName: null,
    };
    
    await setDoc(doc(db, 'goodDeeds', goodDeedId), goodDeedData);
    
    console.log('✅ İyilik Pulu oluşturuldu:', goodDeedId);
    return { success: true, goodDeedId, goodDeed: goodDeedData };
  } catch (error) {
    console.error('Create good deed error:', error);
    return { success: false, error: error.message };
  }
}

// Rastgele bir restorana iyilik pulu (askıda yemek) ata ve HERKESE bildirim gönder
export async function assignGoodDeedToRestaurant(goodDeedId, restaurantId, restaurantName, donorUsername) {
  try {
    await updateDoc(doc(db, 'goodDeeds', goodDeedId), {
      status: 'assigned',
      assignedRestaurantId: restaurantId,
      assignedRestaurantName: restaurantName,
      assignedAt: new Date().toISOString(),
    });
    
    console.log('✅ İyilik Pulu restorana atandı:', restaurantName);
    
    // HERKESE BİLDİRİM GÖNDER - Askıda yemek var!
    try {
      const allUsersResult = await getAllUsersFromFirebase();
      if (allUsersResult.success && allUsersResult.users.length > 0) {
        console.log(`📢 ${allUsersResult.users.length} kullanıcıya askıda yemek bildirimi gönderiliyor...`);
        
        for (const user of allUsersResult.users) {
          // Her kullanıcıya bildirim gönder
          await createNotification(user.uid, {
            type: 'goodDeed', // Yeni tip: askıda yemek
            senderUid: 'system',
            senderUsername: 'AuraMap',
            message: `🎁 ${restaurantName} restoranında askıda yemek var! ${donorUsername} bir iyilik yaptı.`,
            restaurantId: restaurantId,
            restaurantName: restaurantName,
            goodDeedId: goodDeedId,
          });
        }
        
        console.log(`✅ ${allUsersResult.users.length} kullanıcıya askıda yemek bildirimi gönderildi!`);
      }
    } catch (notifError) {
      console.error('Askıda yemek bildirimi hatası:', notifError);
      // Bildirim hatası ana işlemi etkilemesin
    }
    
    return { success: true };
  } catch (error) {
    console.error('Assign good deed error:', error);
    return { success: false, error: error.message };
  }
}

// Kullanıcının iyilik pullarını getir
export async function getUserGoodDeeds(uid) {
  try {
    const goodDeedsSnapshot = await getDocs(collection(db, 'goodDeeds'));
    const goodDeeds = [];
    
    goodDeedsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.userUid === uid) {
        goodDeeds.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    // Tarihe göre sırala (en yeni en üstte)
    goodDeeds.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });
    
    return { success: true, goodDeeds };
  } catch (error) {
    console.error('Get good deeds error:', error);
    return { success: false, error: error.message };
  }
}

// Restoranın bekleyen iyilik pullarını getir (restoran sahibi için)
export async function getRestaurantGoodDeeds(restaurantId) {
  try {
    const goodDeedsSnapshot = await getDocs(collection(db, 'goodDeeds'));
    const goodDeeds = [];
    
    goodDeedsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.assignedRestaurantId === restaurantId && data.status === 'assigned') {
        goodDeeds.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    return { success: true, goodDeeds, count: goodDeeds.length };
  } catch (error) {
    console.error('Get restaurant good deeds error:', error);
    return { success: false, error: error.message };
  }
}

// ============ DICE GAME (BUGÜN NEREYE?) ============

// Zar oyunu davetiyesi gönder
export async function createDiceGameInvite(fromUserId, fromUsername, toUserId, toUsername) {
  try {
    // Bugün zaten davetiye var mı kontrol et
    const today = new Date().toISOString().split('T')[0];
    const gamesSnapshot = await getDocs(collection(db, 'diceGames'));
    
    let existingGame = null;
    gamesSnapshot.forEach((doc) => {
      const data = doc.data();
      const gameDate = new Date(data.createdAt).toISOString().split('T')[0];
      if (gameDate === today && 
          ((data.player1Id === fromUserId && data.player2Id === toUserId) ||
           (data.player1Id === toUserId && data.player2Id === fromUserId))) {
        existingGame = { id: doc.id, ...data };
      }
    });

    if (existingGame) {
      return { success: false, error: 'Bugün bu arkadaşınla zaten bir oyun oluşturdun!' };
    }

    // Yeni oyun oluştur
    const gameRef = doc(collection(db, 'diceGames'));
    const gameData = {
      id: gameRef.id,
      player1Id: fromUserId,
      player1Username: fromUsername,
      player2Id: toUserId,
      player2Username: toUsername,
      status: 'pending', // pending, accepted, rolled, completed
      diceResult: null,
      category: null,
      selectedPlace: null,
      createdAt: new Date().toISOString(),
      acceptedAt: null,
      rolledAt: null,
    };

    await setDoc(gameRef, gameData);

    // Bildirim gönder
    const notifRef = doc(collection(db, 'notifications'));
    await setDoc(notifRef, {
      id: notifRef.id,
      type: 'diceInvite',
      fromUserId: fromUserId,
      fromUsername: fromUsername,
      toUserId: toUserId,
      gameId: gameRef.id,
      message: `${fromUsername} seni zar oyununa davet etti! 🎲`,
      createdAt: new Date().toISOString(),
      read: false,
    });

    return { success: true, gameId: gameRef.id, game: gameData };
  } catch (error) {
    console.error('Create dice game invite error:', error);
    return { success: false, error: error.message };
  }
}

// Zar oyunu davetiyesini kabul et
export async function acceptDiceInvite(gameId, userId) {
  try {
    const gameRef = doc(db, 'diceGames', gameId);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      return { success: false, error: 'Oyun bulunamadı!' };
    }

    const gameData = gameDoc.data();
    if (gameData.player2Id !== userId) {
      return { success: false, error: 'Bu oyuna katılma yetkiniz yok!' };
    }

    await updateDoc(gameRef, {
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    });

    // Davet eden kullanıcıya bildirim gönder
    const notifRef = doc(collection(db, 'notifications'));
    await setDoc(notifRef, {
      id: notifRef.id,
      type: 'diceAccepted',
      fromUserId: userId,
      fromUsername: gameData.player2Username,
      toUserId: gameData.player1Id,
      gameId: gameId,
      message: `${gameData.player2Username} davetini kabul etti! Zarı atabilirsiniz 🎲`,
      createdAt: new Date().toISOString(),
      read: false,
    });

    return { success: true, game: { id: gameId, ...gameData, status: 'accepted' } };
  } catch (error) {
    console.error('Accept dice invite error:', error);
    return { success: false, error: error.message };
  }
}

// Zar at ve rastgele mekan seç
export async function rollDice(gameId, userId, allPlaces) {
  try {
    const gameRef = doc(db, 'diceGames', gameId);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      return { success: false, error: 'Oyun bulunamadı!' };
    }

    const gameData = gameDoc.data();
    
    if (gameData.status !== 'accepted') {
      return { success: false, error: 'Oyun henüz başlamadı!' };
    }

    if (gameData.player1Id !== userId && gameData.player2Id !== userId) {
      return { success: false, error: 'Bu oyuna katılma yetkiniz yok!' };
    }

    // Zar at (1-6)
    const diceResult = Math.floor(Math.random() * 6) + 1;
    
    // Kategori belirle (Google Places API types)
    const categories = {
      1: { name: 'Kahve/Çay', emoji: '☕', types: ['cafe', 'coffee_shop'] },
      2: { name: 'Yemek', emoji: '🍽️', types: ['restaurant', 'meal_takeaway'] },
      3: { name: 'Tatlı', emoji: '🍰', types: ['bakery', 'cafe'] },
      4: { name: 'Fast Food', emoji: '🍔', types: ['meal_delivery', 'meal_takeaway'] },
      5: { name: 'Bar/Pub', emoji: '🍺', types: ['bar', 'night_club'] },
      6: { name: 'Sürpriz', emoji: '🎉', types: [] }, // Rastgele
    };

    const category = categories[diceResult];
    
    // Rastgele mekan seç - Google Places API types field'ı ile filtreleme
    let filteredPlaces = allPlaces;
    if (diceResult !== 6 && category.types.length > 0) {
      filteredPlaces = allPlaces.filter(place => 
        category.types.some(type => 
          place.types?.includes(type)
        )
      );
    }

    if (filteredPlaces.length === 0) {
      filteredPlaces = allPlaces; // Fallback
    }

    const randomPlace = filteredPlaces[Math.floor(Math.random() * filteredPlaces.length)];

    // Oyun güncelle
    await updateDoc(gameRef, {
      status: 'rolled',
      diceResult: diceResult,
      category: category.name,
      categoryEmoji: category.emoji,
      selectedPlace: randomPlace,
      rolledAt: new Date().toISOString(),
    });

    // Her iki oyuncuya bildirim gönder
    const otherPlayerId = userId === gameData.player1Id ? gameData.player2Id : gameData.player1Id;
    const rollerUsername = userId === gameData.player1Id ? gameData.player1Username : gameData.player2Username;
    
    const notifRef = doc(collection(db, 'notifications'));
    await setDoc(notifRef, {
      id: notifRef.id,
      type: 'diceRolled',
      fromUserId: userId,
      fromUsername: rollerUsername,
      toUserId: otherPlayerId,
      gameId: gameId,
      message: `Zar atıldı! ${category.emoji} ${category.name} - ${randomPlace.name}`,
      createdAt: new Date().toISOString(),
      read: false,
    });

    return { 
      success: true, 
      diceResult, 
      category: category.name,
      categoryEmoji: category.emoji,
      selectedPlace: randomPlace,
      game: { id: gameId, ...gameData, status: 'rolled' }
    };
  } catch (error) {
    console.error('Roll dice error:', error);
    return { success: false, error: error.message };
  }
}

// Kullanıcının aktif zar oyunlarını getir
export async function getUserDiceGames(userId) {
  try {
    const gamesSnapshot = await getDocs(collection(db, 'diceGames'));
    const games = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    gamesSnapshot.forEach((doc) => {
      const data = doc.data();
      const gameDate = new Date(data.createdAt);
      gameDate.setHours(0, 0, 0, 0);
      
      // Sadece bugünkü oyunları getir
      if (gameDate.getTime() === today.getTime() &&
          (data.player1Id === userId || data.player2Id === userId)) {
        games.push({
          id: doc.id,
          ...data
        });
      }
    });

    return { success: true, games };
  } catch (error) {
    console.error('Get user dice games error:', error);
    return { success: false, error: error.message };
  }
}

// Zar sonucunu kaydet ve her iki oyuncuya bildirim gönder
export async function saveDiceResultAndNotify(gameId, diceResult, category, categoryEmoji, selectedPlace) {
  try {
    const gameRef = doc(db, 'diceGames', gameId);
    const gameDoc = await getDoc(gameRef);

    if (!gameDoc.exists()) {
      return { success: false, error: 'Oyun bulunamadı!' };
    }

    const gameData = gameDoc.data();

    // Oyun güncelle
    await updateDoc(gameRef, {
      status: 'rolled',
      diceResult: diceResult,
      category: category,
      categoryEmoji: categoryEmoji,
      selectedPlace: selectedPlace,
      rolledAt: new Date().toISOString(),
    });

    // Her iki oyuncuya bildirim gönder
    const notificationMessage = `Zar atıldı! ${categoryEmoji} ${category} - ${selectedPlace.name}`;
    
    const notifPromises = [gameData.player1Id, gameData.player2Id].map(async (playerId) => {
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        id: notifRef.id,
        type: 'diceRolled',
        fromUserId: playerId === gameData.player1Id ? gameData.player2Id : gameData.player1Id,
        fromUsername: playerId === gameData.player1Id ? gameData.player2Username : gameData.player1Username,
        toUserId: playerId,
        gameId: gameId,
        message: notificationMessage,
        placeName: selectedPlace.name,
        placeAddress: selectedPlace.vicinity,
        createdAt: new Date().toISOString(),
        read: false,
      });
    });

    await Promise.all(notifPromises);

    return { success: true };
  } catch (error) {
    console.error('Save dice result error:', error);
    return { success: false, error: error.message };
  }
}
