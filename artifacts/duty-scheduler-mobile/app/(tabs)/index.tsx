import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import {
  useListSchedules,
  useGetSchedule,
  useListMembers,
  useListLocations,
  useCreateAssignment,
  useDeleteAssignment,
  getGetScheduleQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColors";

const DAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const DAY_LABELS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

export default function ScheduleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: schedules, isLoading: isLoadingSchedules } = useListSchedules();
  const { data: members } = useListMembers();
  const { data: locations } = useListLocations();

  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ locationId: number; day: number } | null>(null);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  const currentScheduleId = selectedScheduleId ?? (schedules?.[0]?.id ?? null);
  const currentSchedule = schedules?.find((s) => s.id === currentScheduleId);

  const { data: scheduleDetail, isLoading: isLoadingDetail } = useGetSchedule(
    currentScheduleId ?? 0,
    { query: { enabled: currentScheduleId != null } }
  );

  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const getAssignmentsForCell = useCallback(
    (locationId: number, day: number) => {
      if (!scheduleDetail?.assignments) return [];
      return scheduleDetail.assignments.filter(
        (a) => a.locationId === locationId && a.day === day
      );
    },
    [scheduleDetail]
  );

  const getMemberById = useCallback(
    (memberId: number) => members?.find((m) => m.id === memberId),
    [members]
  );

  const getLocationMaxSlots = useCallback(
    (locationId: number) => locations?.find((l) => l.id === locationId)?.maxSlots ?? 4,
    [locations]
  );

  const handleCellPress = (locationId: number, day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCell({ locationId, day });
    setShowMemberPicker(true);
  };

  const handleAssignMember = (memberId: number) => {
    if (!selectedCell || !currentScheduleId) return;
    const { locationId, day } = selectedCell;
    const existing = getAssignmentsForCell(locationId, day);
    const maxSlots = getLocationMaxSlots(locationId);
    if (existing.length >= maxSlots) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createAssignment.mutate(
      { data: { scheduleId: currentScheduleId, memberId, locationId, day } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetScheduleQueryKey(currentScheduleId) });
        },
      }
    );
  };

  const handleRemoveAssignment = (assignmentId: number) => {
    if (!currentScheduleId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteAssignment.mutate(
      { id: assignmentId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetScheduleQueryKey(currentScheduleId) });
        },
      }
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const styles = makeStyles(colors);

  if (isLoadingSchedules) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <Feather name="calendar" size={48} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>ยังไม่มีตารางเวร</Text>
        <Text style={styles.emptySubtitle}>ไปที่ "ตั้งค่า" เพื่อสร้างตารางเวรใหม่</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>ตารางเวร</Text>
          {currentSchedule?.weekLabel ? (
            <Text style={styles.headerSub}>{currentSchedule.weekLabel}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.schedulePickerBtn}
          onPress={() => setShowSchedulePicker(true)}
        >
          <Text style={styles.schedulePickerLabel} numberOfLines={1}>
            {currentSchedule?.title ?? "เลือกตาราง"}
          </Text>
          <Feather name="chevron-down" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoadingDetail ? (
        <View style={styles.centerFlex}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !locations || locations.length === 0 ? (
        <View style={styles.centerFlex}>
          <Feather name="map-pin" size={36} color={colors.mutedForeground} />
          <Text style={styles.emptyTitle}>ยังไม่มีสถานที่</Text>
          <Text style={styles.emptySubtitle}>เพิ่มสถานที่ใน "ตั้งค่า" ก่อน</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.gridScroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gridHorizontalContent}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              <View style={styles.dayHeaderRow}>
                <View style={styles.locationLabelCell} />
                {DAYS.map((d, i) => (
                  <View key={i} style={styles.dayHeaderCell}>
                    <Text style={styles.dayHeaderText}>{d}</Text>
                  </View>
                ))}
              </View>

              {locations.map((loc) => (
                <View key={loc.id} style={styles.locationRow}>
                  <View style={styles.locationLabelCell}>
                    <Text style={styles.locationLabel} numberOfLines={2}>
                      {loc.name}
                    </Text>
                    <Text style={styles.locationSlots}>max {loc.maxSlots}</Text>
                  </View>
                  {DAYS.map((_, day) => {
                    const assignments = getAssignmentsForCell(loc.id, day);
                    const maxSlots = loc.maxSlots;
                    const isFull = assignments.length >= maxSlots;
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[styles.cell, isFull && styles.cellFull]}
                        onPress={() => handleCellPress(loc.id, day)}
                        activeOpacity={0.7}
                      >
                        {assignments.map((a) => {
                          const member = getMemberById(a.memberId);
                          return (
                            <TouchableOpacity
                              key={a.id}
                              style={[
                                styles.memberChip,
                                { backgroundColor: member?.color ? `${member.color}22` : "#00e5ff22" },
                              ]}
                              onPress={() => handleRemoveAssignment(a.id)}
                              activeOpacity={0.7}
                            >
                              <View
                                style={[
                                  styles.memberDot,
                                  { backgroundColor: member?.color ?? "#00e5ff" },
                                ]}
                              />
                              <Text
                                style={[styles.memberChipText, { color: member?.color ?? colors.primary }]}
                                numberOfLines={1}
                              >
                                {member?.name ?? "?"}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                        {!isFull && (
                          <View style={styles.addSlot}>
                            <Feather name="plus" size={10} color={colors.mutedForeground} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      <Modal
        visible={showSchedulePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSchedulePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSchedulePicker(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>เลือกตารางเวร</Text>
            <FlatList
              data={schedules}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    item.id === currentScheduleId && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setSelectedScheduleId(item.id);
                    setShowSchedulePicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item.title}</Text>
                  {item.weekLabel ? (
                    <Text style={styles.pickerItemSub}>{item.weekLabel}</Text>
                  ) : null}
                  {item.id === currentScheduleId && (
                    <Feather name="check" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showMemberPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMemberPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMemberPicker(false)}>
          <View style={styles.memberSheet}>
            <View style={styles.memberSheetHandle} />
            <View style={styles.memberSheetHeader}>
              <Text style={styles.pickerTitle}>
                {selectedCell
                  ? `${locations?.find((l) => l.id === selectedCell.locationId)?.name} — ${DAY_LABELS[selectedCell.day]}`
                  : "เลือกสมาชิก"}
              </Text>
              <TouchableOpacity onPress={() => setShowMemberPicker(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {selectedCell && (
              <>
                {getAssignmentsForCell(selectedCell.locationId, selectedCell.day).length > 0 && (
                  <View style={styles.currentAssignments}>
                    <Text style={styles.sectionLabel}>มอบหมายแล้ว (แตะเพื่อลบ)</Text>
                    <View style={styles.chipsRow}>
                      {getAssignmentsForCell(selectedCell.locationId, selectedCell.day).map((a) => {
                        const member = getMemberById(a.memberId);
                        return (
                          <TouchableOpacity
                            key={a.id}
                            style={[styles.bigChip, { borderColor: member?.color ?? colors.primary }]}
                            onPress={() => {
                              handleRemoveAssignment(a.id);
                            }}
                          >
                            <View style={[styles.memberDot, { backgroundColor: member?.color ?? colors.primary }]} />
                            <Text style={[styles.bigChipText, { color: member?.color ?? colors.primary }]}>
                              {member?.name ?? "?"}
                            </Text>
                            <Feather name="x" size={12} color={member?.color ?? colors.primary} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {(() => {
                  const maxSlots = getLocationMaxSlots(selectedCell.locationId);
                  const assigned = getAssignmentsForCell(selectedCell.locationId, selectedCell.day);
                  const isFull = assigned.length >= maxSlots;
                  const assignedMemberIds = new Set(assigned.map((a) => a.memberId));
                  const available = members?.filter((m) => !assignedMemberIds.has(m.id)) ?? [];

                  return isFull ? (
                    <Text style={styles.fullText}>ครบจำนวนแล้ว ({maxSlots} คน)</Text>
                  ) : (
                    <>
                      <Text style={styles.sectionLabel}>เพิ่มสมาชิก</Text>
                      {available.length === 0 ? (
                        <Text style={styles.fullText}>ไม่มีสมาชิกให้เพิ่ม</Text>
                      ) : (
                        <FlatList
                          data={available}
                          keyExtractor={(item) => String(item.id)}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.memberPickerItem}
                              onPress={() => {
                                handleAssignMember(item.id);
                              }}
                            >
                              <View
                                style={[styles.memberDotLg, { backgroundColor: item.color ?? colors.primary }]}
                              />
                              <Text style={styles.memberPickerName}>{item.name}</Text>
                              <Feather name="plus" size={16} color={colors.primary} />
                            </TouchableOpacity>
                          )}
                          ItemSeparatorComponent={() => <View style={styles.separator} />}
                        />
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    centerFlex: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    emptyTitle: {
      color: colors.foreground,
      fontSize: 18,
      fontWeight: "600",
      fontFamily: "Inter_600SemiBold",
    },
    emptySubtitle: {
      color: colors.mutedForeground,
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      paddingHorizontal: 40,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    headerLeft: { flex: 1 },
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
    schedulePickerBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.secondary,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      maxWidth: 160,
    },
    schedulePickerLabel: {
      color: colors.foreground,
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      flex: 1,
    },
    gridScroll: { flex: 1 },
    gridHorizontalContent: { flexGrow: 1 },
    grid: { flexDirection: "column", padding: 8 },
    dayHeaderRow: { flexDirection: "row", marginBottom: 4 },
    locationLabelCell: {
      width: 72,
      paddingRight: 6,
      justifyContent: "center",
      alignItems: "flex-end",
    },
    locationLabel: {
      color: colors.foreground,
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      textAlign: "right",
    },
    locationSlots: {
      color: colors.mutedForeground,
      fontSize: 9,
      fontFamily: "Inter_400Regular",
      textAlign: "right",
    },
    dayHeaderCell: {
      width: 68,
      alignItems: "center",
      paddingVertical: 4,
    },
    dayHeaderText: {
      color: colors.primary,
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    locationRow: {
      flexDirection: "row",
      marginBottom: 6,
      alignItems: "flex-start",
    },
    cell: {
      width: 68,
      minHeight: 48,
      marginHorizontal: 1,
      backgroundColor: colors.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 3,
      gap: 2,
      alignItems: "stretch",
    },
    cellFull: { borderColor: colors.primary + "44" },
    memberChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      borderRadius: 5,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    memberDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      flexShrink: 0,
    },
    memberDotLg: {
      width: 10,
      height: 10,
      borderRadius: 5,
      flexShrink: 0,
    },
    memberChipText: {
      fontSize: 9,
      fontFamily: "Inter_500Medium",
      flex: 1,
    },
    addSlot: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 4,
      opacity: 0.4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    pickerSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
      maxHeight: 400,
    },
    memberSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
      maxHeight: 520,
    },
    memberSheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center",
      marginBottom: 12,
    },
    memberSheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    pickerTitle: {
      color: colors.foreground,
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    pickerItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      gap: 8,
    },
    pickerItemActive: {},
    pickerItemText: {
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      flex: 1,
    },
    pickerItemSub: {
      color: colors.primary,
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
    },
    currentAssignments: { marginBottom: 12 },
    sectionLabel: {
      color: colors.mutedForeground,
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    bigChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    bigChipText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    fullText: {
      color: colors.mutedForeground,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      paddingVertical: 16,
    },
    memberPickerItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
    },
    memberPickerName: {
      color: colors.foreground,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      flex: 1,
    },
  });
}
