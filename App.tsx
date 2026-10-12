import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, AppState, AppStateStatus, useColorScheme, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SQLiteManager from './src/database/SQLiteManager';
import { ttsBrainMMKV } from './src/storage/MMKVInstance';
import BankManager from './src/storage/DailyBank/BankManager';
import TTSController from './src/services/TTSEngine/TTSController';

import HomeScreen from './src/screens/HomeScreen';
import ChapterScreen from './src/screens/ChapterScreen';
import WordDetailScreen from './src/screens/WordDetailScreen';
import DailyEventScreen from './src/screens/DailyEventScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SplashScreen from './src/screens/SplashScreen';

import { getTheme, lightColors, darkColors } from './src/theme/colors';

const Stack = createNativeStackNavigator();

const App: React.FC = () => {
  const systemColorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [appTheme, setAppTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [isDark, setIsDark] = useState(false);

  const initializeApp = useCallback(async () => {
    try {
      console.log('[App] Starting init...');

      // SQLite with timeout - 5 sec max
      const sqlitePromise = SQLiteManager.init().catch(e => {
        console.error('[App] SQLite init error, continuing:', e);
        return null;
      });

      // TTS with timeout - 2 sec max, non-blocking (was causing splash stuck)
      const ttsPromise = Promise.race([
        TTSController.initialize().catch(e => {
          console.error('[App] TTS init error, continuing:', e);
          return null;
        }),
        new Promise(resolve => setTimeout(() => {
          console.log('[App] TTS init timeout, continuing...');
          resolve(null);
        }, 2000))
      ]);

      // Bank with timeout
      const bankPromise = BankManager.initialize().catch(e => {
        console.error('[App] Bank init error, continuing:', e);
        return null;
      });

      // Run in parallel, max 5 sec total
      await Promise.race([
        Promise.all([sqlitePromise, ttsPromise, bankPromise]),
        new Promise(resolve => setTimeout(() => {
          console.log('[App] Overall init timeout, forcing ready');
          resolve(null);
        }, 5000))
      ]);

      // Try sync bank, but don't block
      BankManager.syncFromSQLite().catch(() => {});

      const savedTheme = ttsBrainMMKV.getString('app_theme') as 'light' | 'dark' | 'system';
      if (savedTheme) {
        setAppTheme(savedTheme);
        if (savedTheme === 'dark') setIsDark(true);
        else if (savedTheme === 'light') setIsDark(false);
        else setIsDark(systemColorScheme === 'dark');
      } else {
        setIsDark(systemColorScheme === 'dark');
      }

      console.log('[App] Init done, showing Home in 2 sec');

      // Keep splash for at least 2 seconds for branding, then go to Home
      setTimeout(() => {
        setIsReady(true);
        setTimeout(() => setShowSplash(false), 500);
      }, 2000);

    } catch (error) {
      console.error('[App] Init Failed, forcing Home:', error);
      // Force go to Home even if error - prevents white screen stuck
      setIsReady(true);
      setTimeout(() => setShowSplash(false), 500);
    }
  }, [systemColorScheme]);


  useEffect(() => {
    initializeApp();
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/)) {
        const bgEnabled = TTSController.isBackgroundEnabled();
        const activeMode = TTSController.getActiveMode();
        if (!bgEnabled || (activeMode !== 'm2' && activeMode !== 'm5')) {
          TTSController.onNavigationExit();
        }
      }
    });
    return () => {
      subscription.remove();
      TTSController.stopImmediately('NAVIGATION_EXIT');
    };
  }, [initializeApp]);

  const theme = getTheme(appTheme, systemColorScheme === 'dark');
  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: { ...DarkTheme.colors, background: darkColors.background, card: darkColors.surface, text: darkColors.text, primary: darkColors.primary },
      }
    : {
        ...DefaultTheme,
        colors: { ...DefaultTheme.colors, background: lightColors.background, card: lightColors.surface, text: lightColors.text, primary: lightColors.primary },
      };

  if (showSplash) {
    return <SplashScreen />;
  }

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#6750A4" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Chapter" component={ChapterScreen} />
          <Stack.Screen name="WordDetail" component={WordDetailScreen} />
          <Stack.Screen name="DailyEvent" component={DailyEventScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;

