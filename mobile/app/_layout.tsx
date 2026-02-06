import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerTitleAlign: "center" }}>
        <Stack.Screen name="index" options={{ title: "Copilot" }} />
        <Stack.Screen name="add" options={{ title: "Add knowledge" }} />
        <Stack.Screen name="ask" options={{ title: "Ask" }} />
        <Stack.Screen name="answer" options={{ title: "Answer" }} />
        <Stack.Screen name="history" options={{ title: "History" }} />
        <Stack.Screen name="knowledge" options={{ title: "Knowledge" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
