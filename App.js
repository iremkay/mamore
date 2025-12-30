import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import LoginScreen from './screens/LoginScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import SurveyScreen from './screens/SurveyScreen';
import HomeScreen from './screens/HomeScreen';
import PlaceDetailScreen from './screens/PlaceDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import MapScreen from './screens/MapScreen';
import RouteScreen from './screens/RouteScreen';
import MemoriesScreen from './screens/MemoriesScreen';
import FollowersFollowingScreen from './screens/FollowersFollowingScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import FeedScreen from './screens/FeedScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import FriendStampsScreen from './screens/FriendStampsScreen';
import DiceGameScreen from './screens/DiceGameScreen';
import { loadAuth } from './utils/storage';
import { getCurrentUser } from './utils/firebaseService';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const WelcomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F7C5B' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} options={{ title: 'Hoş Geldin', headerShown: true }} />
      <Stack.Screen name="Survey" component={SurveyScreen} options={{ title: 'Seni Tanıyalım' }} />
    </Stack.Navigator>
  );
};

const MapStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F7C5B' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen 
        name="MapScreen" 
        component={MapScreen} 
        options={{ title: 'Harita', headerShown: false }}
      />
      <Stack.Screen 
        name="PlaceDetail" 
        component={PlaceDetailScreen} 
        options={{ title: 'Mekan Detayları' }}
      />
      <Stack.Screen 
        name="Route" 
        component={RouteScreen} 
        options={{ title: 'Günlük Rota' }}
      />
    </Stack.Navigator>
  );
};

const FeedStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F7C5B' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen 
        name="FeedScreen" 
        component={FeedScreen} 
        options={{ title: 'Akış', headerShown: false }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: 'Bildirimler', headerShown: false }}
      />
      <Stack.Screen 
        name="FriendStamps" 
        component={FriendStampsScreen} 
        options={{ title: 'Arkadaş Pulları', headerShown: false }}
      />
      <Stack.Screen 
        name="DiceGame" 
        component={DiceGameScreen} 
        options={{ title: 'Bugün Nereye?', headerShown: false }}
      />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfileScreen} 
        options={{ title: 'Profil' }}
      />
    </Stack.Navigator>
  );
};

const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F7C5B' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen 
        name="HomeScreen" 
        component={HomeScreen} 
        options={{ title: 'Önerilerin', headerShown: false }}
      />
      <Stack.Screen 
        name="PlaceDetail" 
        component={PlaceDetailScreen} 
        options={{ title: 'Mekan Detayları' }}
      />
      <Stack.Screen 
        name="SurveyUpdate" 
        component={SurveyScreen} 
        options={{ title: 'Anketi Güncelle' }}
      />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0F7C5B' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen 
        name="ProfileScreen" 
        component={ProfileScreen} 
        options={{ title: 'Profilin' }}
      />
      <Stack.Screen 
        name="MemoriesScreen" 
        component={MemoriesScreen} 
        options={{ title: 'Anılar' }}
      />
      <Stack.Screen 
        name="FollowersFollowing" 
        component={FollowersFollowingScreen} 
        options={({ route }) => ({ 
          title: route.params?.type === 'followers' ? 'Takipçiler' : 'Takip Edilenler' 
        })}
      />
      <Stack.Screen 
        name="UserProfile" 
        component={UserProfileScreen} 
        options={({ route }) => ({ 
          title: route.params?.username || 'Kullanıcı Profili' 
        })}
      />
      <Stack.Screen 
        name="SurveyUpdate" 
        component={SurveyScreen} 
        options={{ title: 'Anketi Güncelle' }}
      />
    </Stack.Navigator>
  );
};

const AppTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#0F7C5B' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: '#0F7C5B',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#F5F5F0', borderTopColor: '#E5B0A8' },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack} 
        options={{
          title: 'Önerilerin',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="MapTab" 
        component={MapStack} 
        options={{
          title: 'Harita',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Feed" 
        component={FeedStack} 
        options={{
          title: 'Akış',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-stream" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack} 
        options={{
          title: 'Profilin',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default function App() {
  const [isReady, setIsReady] = React.useState(false);
  const [hasAuth, setHasAuth] = React.useState(false);

  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        // Hem storage hem de Firebase'den kontrol et
        const auth = await loadAuth();
        const firebaseUser = getCurrentUser();
        setHasAuth((auth && auth.isLoggedIn) || firebaseUser !== null);
      } catch (error) {
        console.error('Auth check error:', error);
        setHasAuth(false);
      } finally {
        setIsReady(true);
      }
    };
    checkAuth();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F0' }}>
        <ActivityIndicator size="large" color="#0F7C5B" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={hasAuth ? 'AppTabs' : 'Login'}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="WelcomeStack" component={WelcomeStack} />
        <Stack.Screen name="AppTabs" component={AppTabs} options={{ animationEnabled: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
