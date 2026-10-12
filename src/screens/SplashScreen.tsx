/**
 * src/screens/SplashScreen.tsx
 * App Launch Splash - Uses W Logo (Book W)
 * Android Native Splash Style, Premium Minimalist
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  StatusBar,
} from "react-native";

export interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require("../assets/images/splash_logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.appName}>Word Learning</Text>
        <Text style={styles.tagline}>অফলাইন শব্দ শেখা</Text>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    width: 240,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    // Subtle shadow for premium feel
    shadowColor: "#6750A4",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  logo: {
    width: 200,
    height: 200,
  },
  footer: {
    position: "absolute",
    bottom: 60,
    alignItems: "center",
  },
  appName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1B1F",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 12,
    color: "#6750A4",
    marginTop: 4,
    fontWeight: "500",
  },
  dots: {
    flexDirection: "row",
    marginTop: 20,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E7E0EC",
  },
  dotActive: {
    backgroundColor: "#6750A4",
    width: 18,
  },
});

export default SplashScreen;
