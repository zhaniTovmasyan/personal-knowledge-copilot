import React, { useState } from "react";
import { Alert, Button, Text, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addKnowledge } from "../api/client";

export default function KnowledgeScreen() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    if (!text.trim()) {
      Alert.alert("Please paste some text first.");
      return;
    }
    try {
      setLoading(true);
      console.log(text,'Text?')
      const res = await addKnowledge(text);
      Alert.alert("Saved", `id=${res.id} chars=${res.chars}`);
      setText("");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>Knowledge</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Paste notes / text here…"
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          minHeight: 180,
          textAlignVertical: "top",
        }}
      />
      <Button title={loading ? "Saving..." : "Save to knowledge"} onPress={onSave} disabled={loading} />
    </SafeAreaView>
  );
}
