import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert, RefreshControl, Modal, FlatList, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { loadAuth } from '../utils/storage';
import { getFollowingFeed, likeMemory, unlikeMemory, addComment, getUserProfile, searchUsers, followUserFirebase, unfollowUserFirebase, getFollowingFirebase } from '../utils/firebaseService';

const { width } = Dimensions.get('window');

export default function FeedScreen({ navigation }) {
  const [auth, setAuth] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [following, setFollowing] = useState([]);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const a = await loadAuth();
      setAuth(a);

      if (a && a.uid) {
        // Firebase'den takip edilenlerin anılarını çek
        const feedResult = await getFollowingFeed(a.uid);
        if (feedResult.success) {
          setFeed(feedResult.memories || []);
        }
        
        // Takip listesini al
        const followingResult = await getFollowingFirebase(a.uid);
        if (followingResult.success) {
          setFollowing(followingResult.following || []);
        }
      }
    } catch (error) {
      console.error('Feed load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFeed();
  };

  const handleLike = async (memoryId, isLiked) => {
    if (!auth || !auth.uid) return;

    try {
      if (isLiked) {
        await unlikeMemory(memoryId, auth.uid);
      } else {
        await likeMemory(memoryId, auth.uid);
      }
      loadFeed();
    } catch (error) {
      console.error('Like error:', error);
      Alert.alert('Hata', 'Beğeni işlemi başarısız');
    }
  };

  const handleComment = async (memoryId) => {
    if (!auth || !auth.uid) return;
    const text = commentText[memoryId];
    if (!text || !text.trim()) return;

    try {
      await addComment(memoryId, auth.uid, auth.username, text.trim());
      setCommentText({ ...commentText, [memoryId]: '' });
      loadFeed();
      Alert.alert('Başarılı', 'Yorum eklendi');
    } catch (error) {
      console.error('Comment error:', error);
      Alert.alert('Hata', 'Yorum eklenemedi');
    }
  };

  const toggleComments = (memoryId) => {
    setShowComments({
      ...showComments,
      [memoryId]: !showComments[memoryId]
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const result = await searchUsers(searchQuery);
    if (result.success) {
      // Kendini listeden çıkar
      const filtered = result.users.filter(u => u.uid !== auth?.uid);
      setSearchResults(filtered);
    }
  };

  const handleFollowToggle = async (user) => {
    if (!auth || !auth.uid) return;
    
    const isFollowing = following.includes(user.uid);
    
    try {
      if (isFollowing) {
        await unfollowUserFirebase(auth.uid, user.uid);
      } else {
        await followUserFirebase(auth.uid, user.uid);
      }
      
      // Takip listesini yenile
      const followingResult = await getFollowingFirebase(auth.uid);
      if (followingResult.success) {
        setFollowing(followingResult.following || []);
      }
      
      // Feed'i yenile
      loadFeed();
    } catch (error) {
      console.error('Follow toggle error:', error);
      Alert.alert('Hata', 'İşlem başarısız');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Akış</Text>
            <Text style={styles.headerSubtitle}>Takip ettiklerinin anıları</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => navigation.navigate('FriendStamps')}
            >
              <MaterialCommunityIcons name="gift" size={28} color="#f97316" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <MaterialCommunityIcons name="bell" size={28} color="#0F7C5B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Search Section */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Kullanıcı ara..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={handleSearch}
            >
              <Text style={styles.searchButtonText}>Ara</Text>
            </TouchableOpacity>
          </View>
          
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.slice(0, 10).map(user => {
                const isFollowing = following.includes(user.uid);
                return (
                  <View key={user.uid} style={styles.searchResultItem}>
                    <TouchableOpacity 
                      style={styles.searchResultLeft}
                      onPress={() => {
                        // Kendi profiline mi başka kullanıcıya mı gidiyor kontrol et
                        if (user.uid === auth?.uid) {
                          navigation.navigate('Profile', { screen: 'ProfileScreen' });
                        } else {
                          navigation.navigate('UserProfile', {
                            userId: user.uid,
                            username: user.username
                          });
                        }
                      }}
                    >
                      <View style={styles.searchResultAvatar}>
                        {user.profilePicture ? (
                          <Image 
                            source={{ uri: user.profilePicture }} 
                            style={styles.searchResultAvatarImage}
                          />
                        ) : (
                          <Text style={styles.searchResultAvatarText}>
                            {user.username?.charAt(0).toUpperCase() || '?'}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.searchResultUsername}>{user.username}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.followButton,
                        isFollowing && styles.followingButton
                      ]}
                      onPress={() => handleFollowToggle(user)}
                    >
                      <Text style={[
                        styles.followButtonText,
                        isFollowing && styles.followingButtonText
                      ]}>
                        {isFollowing ? 'Takipten Çık' : 'Takip Et'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {feed.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>Henüz paylaşılan anı yok</Text>
            <Text style={styles.emptySubtext}>Arkadaşlarını takip et ve anılarını gör!</Text>
          </View>
        ) : (
          feed.map((memory) => {
            const isLiked = memory.likes && memory.likes.includes(auth?.uid);
            const likesCount = memory.likes ? memory.likes.length : 0;
            const commentsCount = memory.comments ? memory.comments.length : 0;

            return (
              <TouchableOpacity 
                key={memory.id} 
                style={styles.memoryCard}
                onPress={() => {
                  setSelectedMemory(memory);
                  setShowMemoryModal(true);
                }}
                activeOpacity={0.95}
              >
                {/* User Info */}
                <TouchableOpacity 
                  style={styles.userInfo}
                  onPress={() => {
                    if (memory.userId === auth?.uid) {
                      navigation.navigate('Profile', { screen: 'ProfileScreen' });
                    } else {
                      navigation.navigate('Profile', { 
                        screen: 'UserProfile',
                        params: {
                          userId: memory.userId,
                          username: memory.username
                        }
                      });
                    }
                  }}
                >
                  <View style={styles.avatar}>
                    {memory.userPhoto ? (
                      <Image source={{ uri: memory.userPhoto }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>
                        {memory.username ? memory.username.charAt(0).toUpperCase() : '?'}
                      </Text>
                    )}
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.username}>{memory.username || 'Bilinmeyen'}</Text>
                    <Text style={styles.timestamp}>
                      {memory.createdAt ? new Date(memory.createdAt).toLocaleDateString('tr-TR') : ''}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Memory Content */}
                <View style={styles.memoryContent}>
                  <Text style={styles.placeName}>📍 {memory.placeName}</Text>
                  {memory.note && <Text style={styles.note}>{memory.note}</Text>}
                  
                  {/* Photos - Multiple or Single */}
                  {memory.photos && memory.photos.length > 0 ? (
                    <View style={styles.photosContainer}>
                      <FlatList
                        data={memory.photos}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item, index) => `${memory.id}-${index}`}
                        renderItem={({ item }) => (
                          <Image source={{ uri: item }} style={styles.carouselPhoto} />
                        )}
                      />
                      {memory.photos.length > 1 && (
                        <View style={styles.photoIndicatorSmall}>
                          <MaterialCommunityIcons name="image-multiple" size={16} color="#fff" />
                          <Text style={styles.photoIndicatorTextSmall}>{memory.photos.length}</Text>
                        </View>
                      )}
                    </View>
                  ) : memory.photo ? (
                    <Image source={{ uri: memory.photo }} style={styles.memoryPhoto} />
                  ) : null}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleLike(memory.id, isLiked)}
                  >
                    <Text style={styles.actionIcon}>{isLiked ? '❤️' : '🤍'}</Text>
                    <Text style={styles.actionText}>{likesCount}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => toggleComments(memory.id)}
                  >
                    <Text style={styles.actionIcon}>💬</Text>
                    <Text style={styles.actionText}>{commentsCount}</Text>
                  </TouchableOpacity>
                </View>

                {/* Comments Section */}
                {showComments[memory.id] && (
                  <View style={styles.commentsSection}>
                    {/* Existing Comments */}
                    {memory.comments && memory.comments.length > 0 && (
                      <View style={styles.commentsList}>
                        {memory.comments.map((comment, index) => (
                          <View key={index} style={styles.comment}>
                            <Text style={styles.commentUser}>{comment.username}</Text>
                            <Text style={styles.commentText}>{comment.text}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Add Comment */}
                    <View style={styles.addCommentContainer}>
                      <TextInput
                        style={styles.commentInput}
                        placeholder="Yorum yaz..."
                        value={commentText[memory.id] || ''}
                        onChangeText={(text) => setCommentText({ ...commentText, [memory.id]: text })}
                        multiline
                      />
                      <TouchableOpacity
                        style={styles.sendButton}
                        onPress={() => handleComment(memory.id)}
                      >
                        <Text style={styles.sendButtonText}>Gönder</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Memory Detail Modal */}
      <Modal
        visible={showMemoryModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMemoryModal(false)}
      >
        {selectedMemory && (
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowMemoryModal(false)}>
                <MaterialCommunityIcons name="close" size={28} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Anı Detayı</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              {/* User Info */}
              <View style={styles.modalUserInfo}>
                <View style={styles.avatar}>
                  {selectedMemory.userPhoto ? (
                    <Image source={{ uri: selectedMemory.userPhoto }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {selectedMemory.username ? selectedMemory.username.charAt(0).toUpperCase() : '?'}
                    </Text>
                  )}
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.username}>{selectedMemory.username || 'Bilinmeyen'}</Text>
                  <Text style={styles.timestamp}>
                    {selectedMemory.createdAt ? new Date(selectedMemory.createdAt).toLocaleDateString('tr-TR') : ''}
                  </Text>
                </View>
              </View>

              {/* Place */}
              <Text style={styles.modalPlaceName}>📍 {selectedMemory.placeName}</Text>

              {/* Photos Carousel - Multiple photos support */}
              {selectedMemory.photos && selectedMemory.photos.length > 0 ? (
                <View style={styles.photosContainer}>
                  <FlatList
                    data={selectedMemory.photos}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => (
                      <Image 
                        source={{ uri: item }} 
                        style={styles.modalPhoto}
                        resizeMode="contain"
                      />
                    )}
                  />
                  {selectedMemory.photos.length > 1 && (
                    <View style={styles.photoIndicator}>
                      <Text style={styles.photoIndicatorText}>
                        {selectedMemory.photos.length} fotoğraf
                      </Text>
                    </View>
                  )}
                </View>
              ) : selectedMemory.photo ? (
                <Image 
                  source={{ uri: selectedMemory.photo }} 
                  style={styles.modalPhoto}
                  resizeMode="contain"
                />
              ) : null}

              {/* Note */}
              {selectedMemory.note && (
                <Text style={styles.modalNote}>{selectedMemory.note}</Text>
              )}

              {/* Stats */}
              <View style={styles.modalStats}>
                <Text style={styles.modalStatText}>
                  ❤️ {selectedMemory.likes ? selectedMemory.likes.length : 0} beğeni
                </Text>
                <Text style={styles.modalStatText}>
                  💬 {selectedMemory.comments ? selectedMemory.comments.length : 0} yorum
                </Text>
              </View>

              {/* Comments */}
              <View style={styles.modalComments}>
                <Text style={styles.modalCommentsTitle}>Yorumlar</Text>
                {selectedMemory.comments && selectedMemory.comments.length > 0 ? (
                  selectedMemory.comments.map((comment, index) => (
                    <View key={index} style={styles.modalComment}>
                      <Text style={styles.modalCommentUser}>{comment.username}</Text>
                      <Text style={styles.modalCommentText}>{comment.text}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.modalNoComments}>Henüz yorum yok</Text>
                )}
              </View>

              {/* Add Comment in Modal */}
              <View style={styles.modalAddComment}>
                <TextInput
                  style={styles.modalCommentInput}
                  placeholder="Yorum yaz..."
                  value={commentText[selectedMemory.id] || ''}
                  onChangeText={(text) => setCommentText({ ...commentText, [selectedMemory.id]: text })}
                  multiline
                />
                <TouchableOpacity
                  style={styles.modalSendButton}
                  onPress={() => {
                    handleComment(selectedMemory.id);
                    setShowMemoryModal(false);
                  }}
                >
                  <Text style={styles.modalSendButtonText}>Gönder</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  content: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#0F7C5B',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerIconButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e0e0',
    marginTop: 5,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  memoryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#0F7C5B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  memoryContent: {
    marginBottom: 12,
  },
  placeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F7C5B',
    marginBottom: 8,
  },
  note: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
    lineHeight: 20,
  },
  memoryPhoto: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginTop: 8,
  },
  photosContainer: {
    width: width - 32,
    height: 250,
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  carouselPhoto: {
    width: width - 32,
    height: 250,
  },
  photoIndicatorSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoIndicatorTextSmall: {
    color: 'white',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  commentSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  commentItem: {
    marginBottom: 10,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F7C5B',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 13,
    color: '#333',
  },
  addCommentContainer: {
    flexDirection: 'row',
    marginTop: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#0F7C5B',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Search Styles
  searchSection: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 22.5,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
    fontSize: 14,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#0F7C5B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22.5,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchResults: {
    marginTop: 15,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F7C5B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchResultAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchResultAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchResultUsername: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  followButton: {
    backgroundColor: '#0F7C5B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0F7C5B',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#0F7C5B',
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 5,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentsList: {
    marginBottom: 10,
  },
  comment: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F7C5B',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 13,
    color: '#333',
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#0F7C5B',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#0F7C5B',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalPlaceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F7C5B',
    marginBottom: 16,
  },
  modalPhoto: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  modalNote: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalStatText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  modalComments: {
    marginBottom: 20,
  },
  modalCommentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalComment: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  modalCommentUser: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F7C5B',
    marginBottom: 6,
  },
  modalCommentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  modalNoComments: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalAddComment: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  modalCommentInput: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalSendButton: {
    backgroundColor: '#0F7C5B',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalSendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  photoIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  photoIndicatorText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
});
