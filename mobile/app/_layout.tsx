import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

export default function RootLayout() {

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack
        screenOptions={{
          headerTitle: "",
          headerShadowVisible: false,
          headerTintColor: "#F59E0B",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="add" />
        <Stack.Screen name="ask" />
        <Stack.Screen name="answer" />
        <Stack.Screen name="history" />
        <Stack.Screen name="knowledge" />
        <Stack.Screen name="cases" />
      </Stack>

      <StatusBar style={"dark"} />
    </ThemeProvider>
  );
}
