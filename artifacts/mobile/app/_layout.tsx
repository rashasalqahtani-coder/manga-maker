import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Feather } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppResumeInterstitial } from "@/components/AppResumeInterstitial";
import { DownloadProvider } from "@/context/DownloadContext";
import { LibraryProvider } from "@/context/LibraryContext";
import { ReaderSettingsProvider } from "@/context/ReaderSettingsContext";
import { SourceProvider } from "@/context/SourceContext";
import { TeamProvider } from "@/context/TeamContext";
import { ThemeProvider } from "@/context/ThemeContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="manga/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="reader/[chapterId]" options={{ headerShown: false }} />
      <Stack.Screen name="browse/[type]" options={{ headerShown: false }} />
      <Stack.Screen name="suggestions" options={{ headerShown: false }} />
      <Stack.Screen name="genres" options={{ headerShown: false }} />
      <Stack.Screen name="team/index" options={{ headerShown: false }} />
      <Stack.Screen name="team/create" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="comick/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="comick/reader/[hid]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Feather.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (Platform.OS !== "web" && !fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      proxyUrl={proxyUrl}
    >
      <SafeAreaProvider>
        <ThemeProvider>
          <SourceProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <LibraryProvider>
                <TeamProvider>
                <ReaderSettingsProvider>
                <DownloadProvider>
                  <GestureHandlerRootView>
                    <KeyboardProvider>
                      <RootLayoutNav />
                      <AppResumeInterstitial />
                    </KeyboardProvider>
                  </GestureHandlerRootView>
                </DownloadProvider>
                </ReaderSettingsProvider>
                </TeamProvider>
              </LibraryProvider>
            </QueryClientProvider>
          </ErrorBoundary>
          </SourceProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
