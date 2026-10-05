import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '../contexts/AuthContext.jsx';
import { ThemeProvider as CustomThemeProvider, useTheme } from '../contexts/ThemeContext.jsx';

const APP_TITLE = 'Bayabas Toril Schedule App';

function RootLayoutNav() {
  const { isDark } = useTheme();
  const pathname = usePathname();

  // Web-only guard: badgin (expo-router dep) crashes on navigation when the
  // <title> element exists but has no text node ("Cannot set properties of
  // undefined (setting 'nodeValue')"). Empty Stack titles produced exactly
  // that. Ensure a non-empty title node after every navigation.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    try {
      let el = document.querySelector('title');
      if (!el) {
        el = document.createElement('title');
        document.head.appendChild(el);
      }
      if (!el.childNodes.length) {
        el.textContent = APP_TITLE;
      }
    } catch {}
  }, [pathname]);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false, title: `Sign In | ${APP_TITLE}` }} />
        <Stack.Screen name="register" options={{ headerShown: false, title: `Register | ${APP_TITLE}` }} />
        <Stack.Screen name="dashboard" options={{ headerShown: false, title: `Dashboard | ${APP_TITLE}` }} />
        <Stack.Screen name="section" options={{ headerShown: false, title: `Sections | ${APP_TITLE}` }} />
        <Stack.Screen name="school_year" options={{ headerShown: false, title: `School Years | ${APP_TITLE}` }} />
        <Stack.Screen name="teacher_account" options={{ headerShown: false, title: `Teachers | ${APP_TITLE}` }} />
        <Stack.Screen name="registration_request" options={{ headerShown: false, title: `Registrations | ${APP_TITLE}` }} />
        <Stack.Screen name="make_consultation" options={{ headerShown: false, title: `Consultation | ${APP_TITLE}` }} />
        <Stack.Screen name="consultation_request" options={{ headerShown: false, title: `Requests | ${APP_TITLE}` }} />
        <Stack.Screen name="forgotpassword" options={{ headerShown: false, title: `Forgot Password | ${APP_TITLE}` }} />
        <Stack.Screen name="verify_otp" options={{ headerShown: false, title: `Verify OTP | ${APP_TITLE}` }} />
        <Stack.Screen name="settings" options={{ headerShown: false, title: `Settings | ${APP_TITLE}` }} />
        <Stack.Screen name="profile" options={{ headerShown: false, title: `Profile | ${APP_TITLE}` }} />
        <Stack.Screen name="about" options={{ headerShown: false, title: `About | ${APP_TITLE}` }} />
        <Stack.Screen name="developer" options={{ headerShown: false, title: `Developer | ${APP_TITLE}` }} />
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
