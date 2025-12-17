import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import WelcomeScreen from './screens/WelcomeScreen';
import SurveyScreen from './screens/SurveyScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import MapScreen from './screens/MapScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const WelcomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#f97316' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} options={{ title: 'Hoş Geldin', headerShown: true }} />
      <Stack.Screen name="Survey" component={SurveyScreen} options={{ title: 'Seni Tanıyalım' }} />
    </Stack.Navigator>
  );
};

const AppTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#f97316' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { backgroundColor: '#fff7ed', borderTopColor: '#fed7aa' },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          title: 'Önerilerin',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{
          title: 'Harita',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          title: 'Profilin',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(null);

  React.useEffect(() => {
    const checkLogin = async () => {
      // Welcome'den Home'a geçince logged in olacak
      setIsLoggedIn(false);
    };
    checkLogin();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="WelcomeStack" component={WelcomeStack} />
        <Stack.Screen name="AppTabs" component={AppTabs} options={{ animationEnabled: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
