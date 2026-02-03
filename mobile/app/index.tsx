import { Link } from "expo-router";
import { View, Text, Pressable } from "react-native";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>
        Answers only from your notes
      </Text>

      <Text style={{ opacity: 0.7 }}>
        Add knowledge first, then ask questions. You’ll always see sources.
      </Text>

      <View style={{ gap: 12 }}>
        <Link href="/add" asChild>
          <Pressable
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.10)",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600" }}>Add knowledge</Text>
          </Pressable>
        </Link>

        <Link href="/ask" asChild>
          <Pressable
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600" }}>Ask a question</Text>
          </Pressable>
        </Link>

        <Link href="/history" asChild>
          <Pressable style={{ paddingVertical: 8 }}>
            <Text style={{ opacity: 0.8 }}>View history</Text>
          </Pressable>
        </Link>
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={{ fontWeight: "600", marginBottom: 8 }}>Recent questions</Text>
        <Text style={{ opacity: 0.6 }}>No questions yet.</Text>
      </View>
    </View>
  );
}
