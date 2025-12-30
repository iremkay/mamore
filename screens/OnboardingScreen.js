import React, { useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Animated } from 'react-native';
import LoginScreen from './LoginScreen';
import SurveyScreen from './SurveyScreen';
import WelcomeScreen from './WelcomeScreen';

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const scrollViewRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goToNextStep = () => {
    const nextStep = currentStep + 1;
    console.log('🚀 Sonraki adıma geçiliyor:', nextStep);
    if (nextStep < 3) {
      scrollViewRef.current?.scrollTo({ x: width * nextStep, animated: true });
      setCurrentStep(nextStep);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const step = Math.round(offsetX / width);
        setCurrentStep(step);
      },
    }
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.page}>
          <LoginScreen navigation={navigation} onRegisterSuccess={goToNextStep} />
        </View>
        
        <View style={styles.page}>
          <SurveyScreen navigation={navigation} onSurveyComplete={goToNextStep} />
        </View>
        
        <View style={styles.page}>
          <WelcomeScreen navigation={navigation} isOnboarding={true} />
        </View>
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {[0, 1, 2].map((index) => {
          const opacity = scrollX.interpolate({
            inputRange: [(index - 1) * width, index * width, (index + 1) * width],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          const scale = scrollX.interpolate({
            inputRange: [(index - 1) * width, index * width, (index + 1) * width],
            outputRange: [0.8, 1.2, 0.8],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity,
                  transform: [{ scale }],
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  page: {
    width,
    flex: 1,
  },
  pagination: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0F7C5B',
  },
});
