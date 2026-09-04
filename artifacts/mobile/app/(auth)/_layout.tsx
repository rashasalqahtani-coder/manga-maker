import { Stack } from "expo-router";
import React from "react";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_bottom" }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" options={{ title: "إنشاء حساب" }} />
    </Stack>
  );
}
