import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? "light";

  const isDark = colorScheme === "dark";

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerTitle: "",
          headerShadowVisible: false,
          headerTintColor: isDark ? "#F59E0B" : "#000000",
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

      <StatusBar style={isDark ? "light" : "dark"} />
    </ThemeProvider>
  );
}
