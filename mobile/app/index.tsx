import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getCurrentCase, type CaseItem } from "@/src/storage/cases";
import { useCallback, useState } from "react";

export default function HomeScreen() {
  const isDark = useColorScheme() === "dark";
  const [currentCase, setCurrentCase] = useState<CaseItem | null>(null);
  const hasCase = Boolean(currentCase);

  const refresh = useCallback(async () => {
    const c = await getCurrentCase();
    setCurrentCase(c);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const colors = {
    bg: isDark ? "#0B0F17" : "#F6F7FB",
    card: isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF",
    card2: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.10)",
    text: isDark ? "#FFFFFF" : "#0F172A",
    subtext: isDark ? "rgba(255,255,255,0.65)" : "rgba(15,23,42,0.60)",
    muted: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.45)",
    orange: "#F59E0B",
    orangeBg: isDark ? "rgba(245,158,11,0.16)" : "rgba(245,158,11,0.10)",
  };

  return (
    <SafeAreaView style={[styles.safe, styles.screen, { backgroundColor: colors.bg }]}>
      {/* Logo header */}
      <View style={styles.topBar}>
        <View style={[styles.logoBadge, { backgroundColor: colors.orangeBg, borderColor: colors.border }]}>
          <Text style={[styles.logoBadgeText, { color: colors.orange }]}>CF</Text>
        </View>

        <View style={styles.brandBlock}>
          <Text style={[styles.brand, { color: colors.text }]}>Caseflow</Text>
          <Text style={[styles.tagline, { color: colors.subtext }]}>
            Private case intelligence, grounded in your notes.
          </Text>
        </View>
      </View>

      {/* Current case */}
      <View style={[styles.caseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.upperLabel, { color: colors.muted }]}>Current case</Text>

        <View style={styles.caseRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.caseName, { color: colors.text }]} numberOfLines={1}>
              {currentCase?.name ?? "No case selected"}
            </Text>
            <Text style={[styles.caseHint, { color: colors.subtext }]} numberOfLines={1}>
              {currentCase ? "Isolated workspace • no cross-case mixing" : "Select a case to start working"}
            </Text>

          </View>

          <Pressable
            onPress={() => router.push("/cases")}
            style={[styles.pill, { backgroundColor: colors.card2, borderColor: colors.border }]}
          >
            <Text style={{ color: colors.orange, fontWeight: "800" }}>
              {currentCase ? "Switch" : "Choose"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Primary actions */}
      <View style={styles.actionsBlock}>
        <Pressable
          disabled={!hasCase}
          onPress={() =>
            hasCase && router.push({ pathname: "/add", params: { highlight: "clipboard" } })
          }
          style={[
            styles.primary,
            {
              backgroundColor: hasCase ? colors.orange : colors.orangeBg,
              opacity: hasCase ? 1 : 0.45,
            },
          ]}
        >
          <Text style={styles.primaryText}>Add knowledge</Text>
          <Text style={styles.primarySubText}>
            {hasCase ? "Paste from clipboard or type case notes" : "Select a case first"}
          </Text>
        </Pressable>


        <Pressable
          disabled={!hasCase}
          onPress={() => hasCase && router.push("/ask")}
          style={[
            styles.secondary,
            {
              opacity: hasCase ? 1 : 0.45,
            },
          ]}
        >
          <Text style={[styles.secondaryText, { color: colors.text }]}>
            Ask a question
          </Text>
          <Text style={[styles.secondarySubText, { color: colors.subtext }]}>
            {hasCase ? "Get grounded answers with sources" : "Choose a case to begin"}
          </Text>
        </Pressable>

      </View>

      {/* Workspace */}
      <View>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>Workspace</Text>

        <View style={[styles.workspaceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable onPress={() => router.push("/knowledge")} style={styles.row}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Knowledge base</Text>
            <Text style={[styles.rowHint, { color: colors.subtext }]}>What this case contains</Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Pressable onPress={() => router.push("/history")} style={styles.row}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Q&A history</Text>
            <Text style={[styles.rowHint, { color: colors.subtext }]}>Your reasoning trail</Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Pressable onPress={() => router.push("/cases")} style={styles.row}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Cases</Text>
            <Text style={[styles.rowHint, { color: colors.subtext }]}>Create & switch workspaces</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.tip, { color: colors.muted }]}>
        Tip: keep notes focused. Better retrieval → better answers.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { padding: 20, gap: 22 },

  topBar: { flexDirection: "row", gap: 12, alignItems: "center" },
  brandBlock: { gap: 6, marginBottom: 14 },

  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBadgeText: { fontWeight: "900", fontSize: 16, letterSpacing: 0.5 },

  brand: { fontSize: 30, fontWeight: "900", letterSpacing: -0.6 },
  tagline: { fontSize: 13 },

  caseCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  upperLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },

  caseRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  caseName: { fontSize: 18, fontWeight: "900" },
  caseHint: { fontSize: 12, marginTop: 2 },

  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  actionsBlock: { gap: 12, marginBottom: 26 },

  primary: { borderRadius: 18, padding: 16, gap: 6 },
  primaryText: { color: "#111827", fontSize: 18, fontWeight: "900" },
  primarySubText: { color: "rgba(17,24,39,0.75)", fontSize: 13, fontWeight: "700" },

  secondary: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 6 },
  secondaryText: { fontSize: 18, fontWeight: "900" },
  secondarySubText: { fontSize: 13, fontWeight: "700" },

  sectionTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 10 },

  workspaceCard: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },

  row: { paddingVertical: 14, paddingHorizontal: 16, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: "900" },
  rowHint: { fontSize: 12, fontWeight: "700" },

  divider: { height: StyleSheet.hairlineWidth },

  tip: { marginTop: "auto", fontSize: 12, fontWeight: "700" },
});
