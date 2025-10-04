import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '../contexts/AuthContext.jsx';
import { ThemeProvider as CustomThemeProvider, useTheme } from '../contexts/ThemeContext.jsx';

function RootLayoutNav() {
  const { isDark } = useTheme();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="register" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="section" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="school_year" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="teacher_account" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="registration_request" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="make_consultation" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="consultation_request" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="forgotpassword" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="verify_otp" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="settings" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="profile" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="about" options={{ headerShown: false, title: '' }} />
        <Stack.Screen name="developer" options={{ headerShown: false, title: '' }} />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CustomThemeProvider>
        <RootLayoutNav />
      </CustomThemeProvider>
    </AuthProvider>
  );
}
