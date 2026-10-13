
import React, {useEffect, useState, useCallback} from 'react';
import {
  StatusBar,
  AppState,
  AppStateStatus,
  useColorScheme,
  View,
  ActivityIndicator,
} from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import SQLiteManager from './src/database/SQLiteManager';
import RemoteDataImporter from './src/database/RemoteDataImporter';
import {ttsBrainMMKV} from './src/storage/MMKVInstance';
import BankManager from './src/storage/DailyBank/BankManager';
import TTSController from './src/services/TTSEngine/TTSController';

import HomeScreen from './src/screens/HomeScreen';
import ChapterScreen from './src/screens/ChapterScreen';
import WordDetailScreen from './src/screens/WordDetailScreen';
import DailyEventScreen from './src/screens/DailyEventScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SplashScreen from './src/screens/SplashScreen';

import {getTheme, lightColors, darkColors} from './src/theme/colors';

const Stack = createNativeStackNavigator();

const DATA_URL =
  'https://raw.githubusercontent.com/mdkadirkhan0515/JSON-/main/data_00.json';

type AppTheme = 'light' | 'dark' | 'system';

const wait = (milliseconds: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const App: React.FC = () => {
  const systemColorScheme = useColorScheme();

  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [appTheme, setAppTheme] = useState<AppTheme>('system');
  const [isDark, setIsDark] = useState(false);

  const initializeApp = useCallback(async () => {
    try {
      console.log('[App] Starting initialization');

      // Database initialization is essential; log errors without crashing React.
      try {
        await SQLiteManager.init();
      } catch (error) {
        console.error('[App] SQLite initialization failed:', error);
      }

      // Seed local fallback data if the database is available.
      try {
        await SQLiteManager.forceSeedDefaultData();
      } catch (error) {
        console.warn('[App] Local default data unavailable:', error);
      }

      // Import remote data with a time limit so slow internet cannot
      // keep the app on the splash screen indefinitely.
      try {
        await Promise.race([
          RemoteDataImporter.syncFromUrl(DATA_URL),
          wait(2500),
        ]);
      } catch (error) {
        console.warn(
          '[App] Remote data unavailable; continuing with local data:',
          error,
        );
      }

      // Initialize optional services independently.
      try {
        await Promise.race([
          TTSController.initialize(),
          wait(1500),
        ]);
      } catch (error) {
        console.warn('[App] TTS initialization failed:', error);
      }

      try {
        await Promise.race([
          BankManager.initialize(),
          wait(1500),
        ]);
      } catch (error) {
        console.warn('[App] Bank initialization failed:', error);
      }

      try {
        void BankManager.syncFromSQLite().catch(error => {
          console.warn('[App] Bank synchronization failed:', error);
        });
      } catch (error) {
        console.warn('[App] Could not start bank synchronization:', error);
      }

      // Read the saved theme without making theme storage fatal.
      try {
        const savedTheme = ttsBrainMMKV.getString('app_theme') as
          | AppTheme
          | undefined;

        if (
          savedTheme === 'light' ||
          savedTheme === 'dark' ||
          savedTheme === 'system'
        ) {
          setAppTheme(savedTheme);
          setIsDark(
            savedTheme === 'dark' ||
              (savedTheme === 'system' && systemColorScheme === 'dark'),
          );
        } else {
          setAppTheme('system');
          setIsDark(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.warn('[App] Theme preference unavailable:', error);
        setAppTheme('system');
        setIsDark(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.error('[App] Initialization error:', error);
    } finally {
      // Always leave the splash screen, even if optional setup fails.
      setIsReady(true);
      await wait(500);
      setShowSplash(false);
    }
  }, [systemColorScheme]);

  useEffect(() => {
    void initializeApp();

    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'inactive' || nextAppState === 'background') {
          try {
            const backgroundEnabled = TTSController.isBackgroundEnabled();
            const activeMode = TTSController.getActiveMode();

            if (
              !backgroundEnabled ||
              (activeMode !== 'm2' && activeMode !== 'm5')
            ) {
              TTSController.onNavigationExit();
            }
          } catch (error) {
            console.warn('[App] Background audio handling failed:', error);
          }
        }
      },
    );

    return () => {
      subscription.remove();

      try {
        TTSController.stopImmediately('NAVIGATION_EXIT');
      } catch (error) {
        console.warn('[App] Audio cleanup failed:', error);
      }
    };
  }, [initializeApp]);

  const theme = getTheme(appTheme, systemColorScheme === 'dark');

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: darkColors.background,
          card: darkColors.surface,
          text: darkColors.text,
          primary: darkColors.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: lightColors.background,
          card: lightColors.surface,
          text: lightColors.text,
          primary: lightColors.primary,
        },
      };

  if (showSplash) {
    return <SplashScreen />;
  }

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
        }}>
        <ActivityIndicator size="large" color="#6750A4" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.colors.background}
        />

        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: {
              backgroundColor: theme.colors.background,
            },
          }}>
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

