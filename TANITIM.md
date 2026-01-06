# 🗺️ MAMORE - Personalized Venue Discovery Application

## 📱 Project Overview

**Mamore** is an innovative mobile application that provides personalized venue recommendations based on users' moods, social situations, and needs. With its AI-powered recommendation system and social networking features, it aims to enrich users' daily lives.

**Development Date:** 2026  
**Platform:** iOS and Android  
**Technology:** React Native, Firebase, Google Places API  
**Total Commits:** 7

---

## 🎯 Key Features

### 1. **Smart Survey System**
- User profile creation (8 different personality types)
- Activity preferences (Calm, Active, Adventure)
- Atmosphere selection (Peaceful, Energetic, Romantic, Fun)
- Budget determination (Budget-friendly, Mid-range, Luxury)
- Food preferences (Local, International, Coffee)
- Weather preferences
- Group preferences (Solo, Friends, Family, Couple)

### 2. **Mood-Based Recommendations**
- 8 different mood options
- Social situation filters (Alone, With Friends, With Family, Romantic, Business)
- Need categories (Work, Entertainment, Food, Culture, Sports, Shopping, Nature)
- Location-based real-time recommendations

### 3. **Social Network Features**
- User follow system
- Post sharing and liking
- Commenting
- 24-hour story feature
- Venue photo sharing
- Friend suggestions

### 4. **Travel Passport and Stamp System**
- 5 different category stamps:
  - ☕ Coffee Enthusiast
  - 🌳 Nature Explorer
  - 🎨 Culture Lover
  - 🍽️ Gourmet
  - 🎉 Entertainment Addict
- Earn stamps by checking in
- Category-based visit history
- Total visit statistics

### 5. **Interactive Map**
- Google Maps integration
- View venues on the map
- Real-time location tracking
- Venue details and photos
- Directions feature

### 6. **Favorites and Collection System**
- Add venues to favorites
- Create custom collections
- Automatic route suggestions from favorites
- Category-based filtering

### 7. **Memories and Memory Book**
- Add photos to visited venues
- Date and location records
- Personal memory gallery
- Share memories on social media

### 8. **AI-Powered Route Planning**
- Create daily routes from favorites
- Multi-stop route optimization
- Route visualization on map
- Distance and duration calculation

---

## 🛠️ Technical Infrastructure

### **Frontend**
- **React Native 0.81.5** - Cross-platform mobile application
- **Expo SDK 54** - Rapid development platform
- **React Navigation 7** - Page navigation
- **Expo Linear Gradient** - Modern gradient designs

### **Backend & Database**
- **Firebase Authentication** - User authentication
- **Firebase Firestore** - NoSQL database
- **Firebase Storage** - Media file storage
- **AsyncStorage** - Local data storage

### **External APIs**
- **Google Places API** - Venue data
- **Google Maps API** - Map integration
- **Google Geocoding API** - Location resolution

### **UI/UX Libraries**
- **React Native Maps** - Map display
- **Expo Image Picker** - Photo selection/capture
- **Expo Location** - GPS location

---

## 💻 Installation and Setup

### **Prerequisites**
- Node.js >= 20.x
- npm or yarn
- Expo CLI (optional): `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator
- Expo Go app (for physical device testing)

### **Installation Steps**

1. **Clone the repository:**
```bash
git clone https://github.com/iremkay/mamore.git
cd mamore
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
Create a `.env` file in the root directory with the following:
```env
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

4. **Start the development server:**
```bash
npm start
```

5. **Run on device/emulator:**
- **For iOS Simulator:**
  ```bash
  npm run ios
  ```
- **For Android Emulator:**
  ```bash
  npm run android
  ```
- **Or scan QR code with Expo Go app on your physical device**

### **Build for Production**
```bash
# iOS
expo build:ios

# Android
expo build:android
```

---

## 📊 Data Architecture

### **User Profile**
```javascript
{
  uid: string,
  username: string,
  email: string,
  profilePicture: string | null,
  profileType: string,
  activity: string,
  vibe: string,
  budget: string,
  food: string,
  weather: string,
  group: string,
  interests: array,
  followers: array,
  following: array,
  createdAt: timestamp
}
```

### **Stamp System**
```javascript
{
  stamps: [
    {
      placeId: string,
      placeName: string,
      placeAddress: string,
      category: string,
      timestamp: string,
      location: { latitude, longitude }
    }
  ],
  totalVisits: number,
  categoryStats: {
    laptop: number,
    nature: number,
    culture: number,
    foodie: number,
    fun: number
  }
}
```

### **Post Structure**
```javascript
{
  id: string,
  userId: string,
  username: string,
  userProfilePicture: string,
  text: string,
  placeId: string,
  placeName: string,
  images: array,
  likes: array,
  comments: array,
  timestamp: timestamp
}
```

---

## 🎨 Design Features

### **Color Palette**
- **Primary Color:** #0F7C5B (Green - Nature and Discovery)
- **Accent Color:** #FFB30F (Orange - Energy)
- **Background:** #1e293b (Dark Blue - Modern)
- **Text:** #f1f5f9 (Light Gray)

### **Design Principles**
- Modern gradient designs
- Minimalist interface
- Dark theme (Dark Mode)
- Responsive design
- Smooth animations

---

## 👥 User Flows

### **New User Flow**
1. Login/Register screen
2. Welcome screen
3. Personalization survey
4. Home screen (Recommendations)

### **Venue Discovery Flow**
1. Mood selection
2. Music-based venue discovery
3. Need category selection
4. Personalized recommendations
5. Venue detail view
6. Check-in and earn stamps

### **Social Interaction Flow**
1. Feed screen
2. Post sharing
3. Like/comment
4. View memories
5. Visit friend profile

---

## 📈 Statistics and Gamification

### **User Statistics**
- Total visit count
- Earned stamp count
- Category-based statistics
- Follower/following count
- Shared memory count

### **Badges and Achievements**
- Coffee Enthusiast (☕)
- Nature Explorer (🌳)
- Culture Lover (🎨)
- Gourmet (🍽️)
- Entertainment Addict (🎉)

---

## 🔐 Security Features

- Secure login with Firebase Authentication
- Email/Password verification
- Password encryption
- Secure data transmission (HTTPS)
- User data encryption
- Privacy policy compliance

---

## 🚀 Future Developments

### **Short Term (Q1 2026)**
- Push notification integration
- Offline mode support
- Advanced search filters
- QR code check-in system

### **Medium Term (Q2-Q3 2026)**
- AR (Augmented Reality) venue preview
- Voice assistant integration
- Premium membership system
- Venue reservation system
- Payment integration

### **Long Term (Q4 2026+)**
- Custom machine learning model
- Social network expansion
- Marketplace (Venue advertisements)
- API platform (3rd party developer API)
- Web platform

---

## 📱 Screenshot List

### **Authentication Screens (4 screens)**
1. Welcome Screen
2. Login Screen
3. Register Screen
4. Onboarding Screen

### **Main Screens (3 screens)**
1. Home Screen - Modern icon cards
2. Feed Screen - Social feed
3. Search Screen - Advanced filtering

### **Discovery and Filtering Screens (5 screens)**
1. Mood Selection Screen
2. Friend Filter Screen
3. Need Filter Screen
4. Recommendation Screen
5. Location Preference Screen

### **Venue Screens (3 screens)**
1. Venue Detail Screen - Photo gallery
2. Venue Comparison Screen
3. Live Status Screen

### **Route and Feature Screens (4 screens)**
1. AI Assistant Screen
2. Route Generator Screen
3. Saved Routes Screen
4. Ambient Control Screen

### **Social Screens (8 screens)**
1. Create Post Screen
2. Add Story Screen
3. Story Viewer Screen
4. Story 24h Screen
5. Messages Screen
6. Chat Screen
7. Friends Screen - Enhanced search
8. Friend Suggestions Screen
9. Comments Modal

### **Profile and Account Screens (8 screens)**
1. Profile Screen
2. Collections Screen - Modern gradient
3. Favorites Screen - Enhanced UI
4. My Ratings Screen - Statistics cards
5. User Posts Screen
6. Notifications Screen
7. Rating Screen
8. Share Recommendation Screen

---

## 📞 Contact and Support

**Project Name:** Mamore  
**Version:** 1.0.0  
**Platform:** React Native + Expo  
**Development Year:** 2026  
**Total Commits:** 7

---

## 📊 Project Statistics

- **Total Screens:** 30+
- **Total Commits:** 7
- **Development Duration:** Q4 2025 - Q1 2026
- **Lines of Code:** ~10,000+
- **Core Features:** 8
- **API Integrations:** 3 (Google Places, Maps, Geocoding)

---

## 📄 License

This is a proprietary project and all rights are reserved.

---

## 🎓 Educational Notes

This application is designed to demonstrate modern mobile application development techniques and includes:

- **Component-based architecture** - Reusable components
- **Service layer pattern** - Business logic separation
- **Context API** - Global state management
- **Repository pattern** - Data access abstraction
- **Observer pattern** - Firebase real-time updates
- **Responsive design** - Multi-device support

---

**Last Update:** January 2026
