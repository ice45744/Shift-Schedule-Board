import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import {
  useListMembers,
  useCreateMember,
  useDeleteMember,
  useListLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  useListSchedules,
  useCreateSchedule,
  useDeleteSchedule,
  getListMembersQueryKey,
  getListLocationsQueryKey,
  getListSchedulesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";

type Tab = "members" | "locations" | "schedules";

const COLORS_PRESET = [
  "#00e5ff", "#ff4081", "#69f0ae", "#ffab40",
  "#e040fb", "#40c4ff", "#ff6e40", "#b2ff59",
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("members");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const styles = makeStyles(colors);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "members", label: "สมาชิก", icon: "users" },
    { key: "locations", label: "สถานที่", icon: "map-pin" },
    { key: "schedules", label: "ตาราง", icon: "calendar" },
  ];

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>การตั้งค่า</Text>
        <Text style={styles.headerSub}>จัดการสมาชิก สถานที่ และตารางเวร</Text>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab(t.key);
            }}
            activeOpacity={0.7}
          >
            <Feather
              name={t.icon as keyof typeof Feather.glyphMap}
              size={14}
              color={activeTab === t.key ? colors.primaryForeground : colors.mutedForeground}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === t.key && styles.tabLabelActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === "members" && <MembersSection />}
        {activeTab === "locations" && <LocationsSection />}
        {activeTab === "schedules" && <SchedulesSection />}
      </ScrollView>
    </View>
  );
}

function MembersSection() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useListMembers();
  const createMember = useCreateMember();
  const deleteMember = useDeleteMember();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS_PRESET[0]);

  const styles = makeStyles(colors);

  const handleCreate = () => {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createMember.mutate(
      { data: { name: name.trim(), color } },
      {
        onSuccess: () => {
          setName("");
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        },
      }
    );
  };

  const handleDelete = (id: number, memberName: string) => {
    Alert.alert("ลบสมาชิก", `ลบ "${memberName}" ออกจากระบบ?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteMember.mutate(
            { id },
            { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }) }
          );
        },
      },
    ]);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>รายชื่อสมาชิก</Text>
      <View style={styles.formCard}>
        <Text style={styles.fieldLabel}>ชื่อสมาชิก</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="เช่น สมชาย..."
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />
        <Text style={styles.fieldLabel}>สี</Text>
        <View style={styles.colorRow}>
          {COLORS_PRESET.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                color === c && styles.colorSwatchActive,
              ]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, (!name.trim() || createMember.isPending) && styles.addBtnDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || createMember.isPending}
          activeOpacity={0.8}
        >
          {createMember.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <>
              <Feather name="plus" size={16} color={colors.primaryForeground} />
              <Text style={styles.addBtnText}>เพิ่มสมาชิก</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : members?.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="users" size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>ยังไม่มีรายชื่อสมาชิก</Text>
        </View>
      ) : (
        members?.map((member) => (
          <View key={member.id} style={styles.listItem}>
            <View
              style={[styles.memberDot, { backgroundColor: member.color ?? colors.primary }]}
            />
            <Text style={styles.listItemName}>{member.name}</Text>
            <TouchableOpacity
              onPress={() => handleDelete(member.id, member.name)}
              style={styles.deleteBtn}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

function LocationsSection() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: locations, isLoading } = useListLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  const [name, setName] = useState("");
  const [maxSlots, setMaxSlots] = useState(4);

  const styles = makeStyles(colors);

  const handleCreate = () => {
    if (!name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createLocation.mutate(
      { data: { name: name.trim(), maxSlots } },
      {
        onSuccess: () => {
          setName("");
          setMaxSlots(4);
          queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        },
      }
    );
  };

  const handleSlots = (id: number, val: number) => {
    if (val < 1 || val > 20) return;
    updateLocation.mutate(
      { id, data: { maxSlots: val } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() }) }
    );
  };

  const handleDelete = (id: number, locName: string) => {
    Alert.alert("ลบสถานที่", `ลบ "${locName}" ออกจากระบบ?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteLocation.mutate(
            { id },
            { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() }) }
          );
        },
      },
    ]);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>สถานที่</Text>
      <View style={styles.formCard}>
        <Text style={styles.fieldLabel}>ชื่อสถานที่</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="เช่น ER, OPD..."
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />
        <Text style={styles.fieldLabel}>จำนวนคน/วัน</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setMaxSlots((v) => Math.max(1, v - 1))}
          >
            <Feather name="minus" size={16} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.counterValue}>{maxSlots}</Text>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setMaxSlots((v) => Math.min(20, v + 1))}
          >
            <Feather name="plus" size={16} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, (!name.trim() || createLocation.isPending) && styles.addBtnDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || createLocation.isPending}
          activeOpacity={0.8}
        >
          {createLocation.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <>
              <Feather name="plus" size={16} color={colors.primaryForeground} />
              <Text style={styles.addBtnText}>เพิ่มสถานที่</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : locations?.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="map-pin" size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>ยังไม่มีสถานที่</Text>
        </View>
      ) : (
        locations?.map((loc) => (
          <View key={loc.id} style={styles.listItem}>
            <Text style={[styles.listItemName, { flex: 1 }]}>{loc.name}</Text>
            <View style={styles.counterRowSmall}>
              <TouchableOpacity
                style={styles.counterBtnSm}
                onPress={() => handleSlots(loc.id, loc.maxSlots - 1)}
                disabled={loc.maxSlots <= 1}
              >
                <Feather name="minus" size={12} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={styles.counterValueSm}>{loc.maxSlots}</Text>
              <TouchableOpacity
                style={styles.counterBtnSm}
                onPress={() => handleSlots(loc.id, loc.maxSlots + 1)}
                disabled={loc.maxSlots >= 20}
              >
                <Feather name="plus" size={12} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(loc.id, loc.name)}
              style={styles.deleteBtn}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

function SchedulesSection() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { data: schedules, isLoading } = useListSchedules();
  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const [title, setTitle] = useState("");
  const [weekLabel, setWeekLabel] = useState("");

  const styles = makeStyles(colors);

  const handleCreate = () => {
    if (!title.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createSchedule.mutate(
      { data: { title: title.trim(), weekLabel: weekLabel.trim() || undefined } },
      {
        onSuccess: () => {
          setTitle("");
          setWeekLabel("");
          queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
        },
      }
    );
  };

  const handleDelete = (id: number, scheduleName: string) => {
    Alert.alert("ลบตารางเวร", `ลบ "${scheduleName}" และข้อมูลทั้งหมด?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          deleteSchedule.mutate(
            { id },
            { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() }) }
          );
        },
      },
    ]);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>ตารางเวร</Text>
      <View style={styles.formCard}>
        <Text style={styles.fieldLabel}>ชื่อตารางเวร</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="เช่น สัปดาห์แรกของเดือน..."
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="next"
        />
        <Text style={styles.fieldLabel}>ช่วงเวลา (ไม่บังคับ)</Text>
        <TextInput
          style={styles.input}
          value={weekLabel}
          onChangeText={setWeekLabel}
          placeholder="เช่น 1-5 พ.ย."
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="done"
          onSubmitEditing={handleCreate}
        />
        <TouchableOpacity
          style={[styles.addBtn, (!title.trim() || createSchedule.isPending) && styles.addBtnDisabled]}
          onPress={handleCreate}
          disabled={!title.trim() || createSchedule.isPending}
          activeOpacity={0.8}
        >
          {createSchedule.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <>
              <Feather name="plus" size={16} color={colors.primaryForeground} />
              <Text style={styles.addBtnText}>สร้างตาราง</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : schedules?.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="calendar" size={32} color={colors.mutedForeground} />
          <Text style={styles.emptyText}>ยังไม่มีตารางเวร</Text>
        </View>
      ) : (
        schedules?.map((schedule) => (
          <View key={schedule.id} style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listItemName}>{schedule.title}</Text>
              {schedule.weekLabel ? (
                <Text style={styles.listItemSub}>{schedule.weekLabel}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(schedule.id, schedule.title)}
              style={styles.deleteBtn}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    headerTitle: {
      color: colors.primary,
      fontSize: 20,
      fontWeight: "700",
      fontFamily: "Inter_700Bold",
    },
    headerSub: {
      color: colors.mutedForeground,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    tabBar: {
      flexDirection: "row",
      margin: 12,
      backgroundColor: colors.muted,
      borderRadius: 10,
      padding: 3,
    },
    tabBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 8,
      borderRadius: 8,
    },
    tabBtnActive: { backgroundColor: colors.primary },
    tabLabel: {
      color: colors.mutedForeground,
      fontSize: 12,
      fontFamily: "Inter_500Medium",
    },
    tabLabelActive: { color: colors.primaryForeground },
    content: { flex: 1 },
    contentContainer: { padding: 16, paddingBottom: 80 },
    section: { gap: 8 },
    sectionTitle: {
      color: colors.foreground,
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      marginBottom: 4,
    },
    formCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
      marginBottom: 8,
    },
    fieldLabel: {
      color: colors.mutedForeground,
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: colors.input,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    colorSwatch: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: "transparent",
    },
    colorSwatchActive: { borderColor: "#ffffff", transform: [{ scale: 1.2 }] },
    counterRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    counterBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    counterValue: {
      color: colors.primary,
      fontSize: 18,
      fontFamily: "Inter_700Bold",
      minWidth: 32,
      textAlign: "center",
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      marginTop: 4,
    },
    addBtnDisabled: { opacity: 0.4 },
    addBtnText: {
      color: colors.primaryForeground,
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    emptyState: {
      alignItems: "center",
      gap: 8,
      paddingVertical: 32,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
      borderRadius: 12,
    },
    emptyText: {
      color: colors.mutedForeground,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10,
    },
    memberDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      flexShrink: 0,
    },
    listItemName: {
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      flex: 1,
    },
    listItemSub: {
      color: colors.primary,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    deleteBtn: { padding: 4 },
    counterRowSmall: { flexDirection: "row", alignItems: "center", gap: 6 },
    counterBtnSm: {
      width: 26,
      height: 26,
      borderRadius: 6,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    counterValueSm: {
      color: colors.primary,
      fontSize: 14,
      fontFamily: "Inter_700Bold",
      minWidth: 24,
      textAlign: "center",
    },
  });
}
