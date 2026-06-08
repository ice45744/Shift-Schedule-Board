import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMembers,
  useListLocations,
  useListSchedules,
  useGetSchedule,
  useCreateAssignment,
  useDeleteAssignment,
  getGetScheduleQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { X, CalendarDays, ChevronDown, Check, Settings, PanelRightClose, PanelRightOpen } from "lucide-react";
import { playDropSound, playRemoveSound } from "@/lib/audio";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Link } from "wouter";

const DAYS = [
  { id: 1, label: "จันทร์" },
  { id: 2, label: "อังคาร" },
  { id: 3, label: "พุธ" },
  { id: 4, label: "พฤหัสบดี" },
  { id: 5, label: "ศุกร์" },
];

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const { data: schedules, isLoading: isLoadingSchedules } = useListSchedules();
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [dragOverRow, setDragOverRow] = useState<string | null>(null);
  const dragCounters = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!selectedScheduleId && schedules && schedules.length > 0) {
      setSelectedScheduleId(schedules[0].id);
    }
  }, [schedules, selectedScheduleId]);

  const { data: members, isLoading: isLoadingMembers } = useListMembers();
  const { data: locations, isLoading: isLoadingLocations } = useListLocations();

  const { data: scheduleDetail, isLoading: isLoadingScheduleDetail } = useGetSchedule(
    selectedScheduleId ?? 0,
    { query: { enabled: !!selectedScheduleId, queryKey: getGetScheduleQueryKey(selectedScheduleId ?? 0) } }
  );

  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const rowKey = (locationId: number, dayId: number) => `${locationId}-${dayId}`;

  const handleDragStart = (e: React.DragEvent, memberId: number) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", memberId.toString());
  };
  const handleDragEnd = () => { dragCounters.current = {}; setDragOverRow(null); };
  const handleRowDragEnter = (e: React.DragEvent, locationId: number, dayId: number) => {
    e.preventDefault();
    const key = rowKey(locationId, dayId);
    dragCounters.current[key] = (dragCounters.current[key] ?? 0) + 1;
    setDragOverRow(key);
  };
  const handleRowDragLeave = (e: React.DragEvent, locationId: number, dayId: number) => {
    const key = rowKey(locationId, dayId);
    dragCounters.current[key] = Math.max(0, (dragCounters.current[key] ?? 1) - 1);
    if (dragCounters.current[key] === 0) setDragOverRow((p) => (p === key ? null : p));
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; };
  const handleDrop = (e: React.DragEvent, locationId: number, dayOfWeek: number) => {
    e.preventDefault();
    const key = rowKey(locationId, dayOfWeek);
    dragCounters.current[key] = 0;
    setDragOverRow(null);
    const memberId = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!memberId || isNaN(memberId) || !selectedScheduleId) return;
    createAssignment.mutate(
      { scheduleId: selectedScheduleId, data: { memberId, locationId, dayOfWeek } },
      { onSuccess: () => { playDropSound(); queryClient.invalidateQueries({ queryKey: getGetScheduleQueryKey(selectedScheduleId) }); } }
    );
  };
  const handleRemove = (assignmentId: number) => {
    if (!selectedScheduleId) return;
    deleteAssignment.mutate(
      { scheduleId: selectedScheduleId, id: assignmentId },
      { onSuccess: () => { playRemoveSound(); queryClient.invalidateQueries({ queryKey: getGetScheduleQueryKey(selectedScheduleId) }); } }
    );
  };

  if (isLoadingSchedules) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse" style={{ color: "hsl(186 100% 50%)" }}>
          <CalendarDays className="w-12 h-12" />
          <p className="text-sm" style={{ color: "hsl(215 20% 48%)" }}>กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <div className="flex flex-col h-full p-6 items-center justify-center">
        <div
          className="max-w-sm w-full text-center space-y-5 p-8 rounded-2xl glass-panel"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "hsl(186 100% 50% / 0.1)", color: "hsl(186 100% 60%)", boxShadow: "0 0 20px hsl(186 100% 50% / 0.2)" }}
          >
            <CalendarDays className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold" style={{ color: "hsl(210 40% 94%)" }}>ยังไม่มีตารางเวร</h2>
          <p className="text-sm" style={{ color: "hsl(215 20% 48%)" }}>ไปที่หน้าตั้งค่าเพื่อสร้างตารางเวรแรก</p>
          <Link href="/settings">
            <Button className="w-full btn-neon border-0 font-semibold">ไปที่หน้าตั้งค่า</Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId);

  return (
    <div className="flex flex-col h-full">
      {/* ── Top Bar ── */}
      <header
        className="h-14 px-4 flex items-center justify-between shrink-0 z-20 gap-2"
        style={{
          background: "linear-gradient(180deg, hsl(222 47% 8%) 0%, hsl(222 47% 7%) 100%)",
          borderBottom: "1px solid hsl(217 33% 13%)",
          boxShadow: "0 4px 24px hsl(0 0% 0% / 0.4)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h1
            className="text-sm font-bold hidden sm:block whitespace-nowrap"
            style={{ color: "hsl(186 100% 60%)", textShadow: "0 0 12px hsl(186 100% 50% / 0.4)" }}
          >
            ตารางเวร
          </h1>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-2 px-3 h-9 rounded-lg text-xs sm:text-sm font-medium transition-all"
                style={{
                  background: "hsl(222 47% 10%)",
                  border: "1px solid hsl(217 33% 18%)",
                  color: "hsl(210 40% 85%)",
                  boxShadow: "0 2px 8px hsl(0 0% 0% / 0.3), inset 0 1px 0 hsl(210 40% 94% / 0.04)",
                  minWidth: 160,
                  maxWidth: 220,
                }}
                data-testid="button-schedule-selector"
              >
                <span className="truncate flex-1 text-left">
                  {selectedSchedule ? selectedSchedule.title : "เลือกตารางเวร..."}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[220px] p-0"
              align="start"
              style={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(217 33% 18%)" }}
            >
              <Command style={{ background: "transparent" }}>
                <CommandInput placeholder="ค้นหา..." className="h-8 text-sm" />
                <CommandList>
                  <CommandEmpty>ไม่พบตารางเวร</CommandEmpty>
                  <CommandGroup>
                    {schedules.map((s) => (
                      <CommandItem
                        key={s.id}
                        value={s.title}
                        onSelect={() => { setSelectedScheduleId(s.id); setPopoverOpen(false); }}
                        className="text-sm"
                      >
                        <Check className={`mr-2 h-3 w-3 ${selectedScheduleId === s.id ? "opacity-100" : "opacity-0"}`} />
                        {s.title}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedSchedule?.weekLabel && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full hidden sm:inline whitespace-nowrap"
              style={{ background: "hsl(186 100% 50% / 0.08)", color: "hsl(186 100% 60%)", border: "1px solid hsl(186 100% 50% / 0.2)" }}
            >
              {selectedSchedule.weekLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-2 rounded-lg transition-all"
            style={{ color: "hsl(215 20% 45%)" }}
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? "ซ่อนสมาชิก" : "แสดงสมาชิก"}
            data-testid="button-toggle-sidebar"
          >
            {sidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
          <Link href="/settings">
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
              style={{ color: "hsl(215 20% 45%)" }}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ตั้งค่า</span>
            </button>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Main Table ── */}
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          {isLoadingLocations ? (
            <div className="space-y-1">
              {Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" style={{ background: "hsl(222 47% 10%)" }} />)}
            </div>
          ) : locations?.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <p className="text-sm" style={{ color: "hsl(215 20% 45%)" }}>ยังไม่ได้เพิ่มสถานที่</p>
                <Link href="/settings"><Button size="sm" className="btn-neon border-0">ไปที่ตั้งค่า</Button></Link>
              </div>
            </div>
          ) : (
            /* Full table — horizontal scroll on all screen sizes */
            <div
              className="rounded-xl overflow-hidden"
              style={{ boxShadow: "0 8px 40px hsl(0 0% 0% / 0.5), 0 0 0 1px hsl(217 33% 14%)" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse table-3d" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th
                        className="text-left px-3 py-3 text-xs font-bold border-r"
                        style={{
                          width: 110,
                          color: "hsl(186 100% 65%)",
                          background: "linear-gradient(180deg, hsl(222 47% 12%) 0%, hsl(222 47% 10%) 100%)",
                          borderColor: "hsl(217 33% 16%)",
                        }}
                      >
                        สถานที่
                      </th>
                      <th
                        className="text-left px-3 py-3 text-xs font-bold border-r"
                        style={{
                          width: 90,
                          color: "hsl(186 100% 65%)",
                          background: "linear-gradient(180deg, hsl(222 47% 12%) 0%, hsl(222 47% 10%) 100%)",
                          borderColor: "hsl(217 33% 16%)",
                        }}
                      >
                        วัน
                      </th>
                      {(() => {
                        const maxSlots = Math.max(...(locations?.map((l) => l.maxSlots) ?? [4]));
                        return Array.from({ length: maxSlots }, (_, i) => (
                          <th
                            key={i}
                            className="text-center px-2 py-3 text-xs font-bold border-r last:border-r-0"
                            style={{
                              minWidth: 100,
                              color: "hsl(215 20% 48%)",
                              background: "linear-gradient(180deg, hsl(222 47% 12%) 0%, hsl(222 47% 10%) 100%)",
                              borderColor: "hsl(217 33% 16%)",
                            }}
                          >
                            คนที่ {i + 1}
                          </th>
                        ));
                      })()}
                    </tr>
                  </thead>
                  <tbody>
                    {locations?.map((location, locIndex) => {
                      const isLastLoc = locIndex === (locations?.length ?? 0) - 1;
                      return DAYS.map((day, dayIndex) => {
                        const key = rowKey(location.id, day.id);
                        const isOver = dragOverRow === key;
                        const rowAssignments = scheduleDetail?.assignments?.filter(
                          (a) => a.locationId === location.id && a.dayOfWeek === day.id
                        ) ?? [];
                        const isFirstDay = dayIndex === 0;
                        const isLastDay = dayIndex === DAYS.length - 1;
                        const evenRow = dayIndex % 2 === 0;

                        return (
                          <tr
                            key={key}
                            data-testid={`row-${key}`}
                            className={isOver ? "cell-drop-active" : ""}
                            style={{
                              borderBottom: isLastDay && !isLastLoc
                                ? "2px solid hsl(217 33% 18%)"
                                : "1px solid hsl(217 33% 12%)",
                              background: isOver
                                ? undefined
                                : evenRow
                                  ? "hsl(222 47% 7%)"
                                  : "hsl(222 47% 8.5%)",
                            }}
                            onDragEnter={(e) => handleRowDragEnter(e, location.id, day.id)}
                            onDragLeave={(e) => handleRowDragLeave(e, location.id, day.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, location.id, day.id)}
                          >
                            {/* Location (rowspan 5) */}
                            {isFirstDay && (
                              <td
                                rowSpan={5}
                                className="px-3 py-2 border-r align-middle"
                                style={{
                                  borderColor: "hsl(217 33% 16%)",
                                  borderBottom: "2px solid hsl(217 33% 18%)",
                                  background: "hsl(222 47% 7%)",
                                }}
                              >
                                <div className="location-badge inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap">
                                  {location.name}
                                </div>
                              </td>
                            )}

                            {/* Day */}
                            <td
                              className="px-3 py-2 border-r text-xs font-semibold whitespace-nowrap"
                              style={{
                                borderColor: "hsl(217 33% 14%)",
                                color: isOver ? "hsl(186 100% 65%)" : "hsl(215 20% 55%)",
                              }}
                            >
                              {day.label}
                            </td>

                            {/* Slot cells */}
                            {Array.from({ length: location.maxSlots }, (_, slotIndex) => {
                              const assignment = rowAssignments[slotIndex];
                              return (
                                <td
                                  key={slotIndex}
                                  className="px-1.5 py-1.5 border-r last:border-r-0"
                                  style={{
                                    borderColor: "hsl(217 33% 12%)",
                                    minHeight: 38,
                                  }}
                                >
                                  <AnimatePresence>
                                    {assignment && (
                                      <motion.div
                                        key={assignment.id}
                                        initial={{ opacity: 0, scale: 0.75, y: -4 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.75, y: 4 }}
                                        transition={{ duration: 0.15, ease: "easeOut" }}
                                        className="chip-3d inline-flex items-center gap-1 pl-2 pr-0.5 py-0.5 rounded-md text-xs font-medium max-w-full"
                                        style={{
                                          background: assignment.memberColor
                                            ? `linear-gradient(135deg, ${assignment.memberColor}22, ${assignment.memberColor}10)`
                                            : "hsl(222 47% 13%)",
                                          border: `1px solid ${assignment.memberColor ? assignment.memberColor + "44" : "hsl(217 33% 18%)"}`,
                                          color: "hsl(210 40% 88%)",
                                        }}
                                        data-testid={`chip-${assignment.id}`}
                                      >
                                        <div
                                          className="w-1.5 h-1.5 rounded-full shrink-0"
                                          style={{
                                            backgroundColor: assignment.memberColor ?? "#4dd",
                                            boxShadow: assignment.memberColor ? `0 0 6px ${assignment.memberColor}` : "none",
                                          }}
                                        />
                                        <span className="truncate max-w-[80px]">{assignment.memberName}</span>
                                        <button
                                          onClick={() => handleRemove(assignment.id)}
                                          className="p-0.5 rounded-full transition-opacity opacity-30 hover:opacity-100 shrink-0"
                                          style={{ color: "hsl(0 72% 60%)" }}
                                          data-testid={`button-remove-${assignment.id}`}
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── Members Sidebar ── */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="shrink-0 flex flex-col overflow-hidden"
              style={{
                borderLeft: "1px solid hsl(217 33% 13%)",
                background: "hsl(222 47% 7%)",
                boxShadow: "-4px 0 24px hsl(0 0% 0% / 0.3)",
              }}
            >
              <div className="w-44 sm:w-52 flex flex-col flex-1 overflow-hidden">
                <div
                  className="px-3 py-2.5 flex items-center gap-2"
                  style={{
                    borderBottom: "1px solid hsl(217 33% 13%)",
                    background: "linear-gradient(180deg, hsl(222 47% 9%) 0%, hsl(222 47% 8%) 100%)",
                  }}
                >
                  <div>
                    <p
                      className="font-bold text-xs whitespace-nowrap"
                      style={{ color: "hsl(186 100% 65%)", textShadow: "0 0 8px hsl(186 100% 50% / 0.4)" }}
                    >
                      สมาชิก
                    </p>
                    <p className="text-[10px] mt-0.5 hidden sm:block whitespace-nowrap" style={{ color: "hsl(215 20% 40%)" }}>
                      ลากชื่อไปวางในแถว
                    </p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {isLoadingMembers ? (
                    Array(5).fill(0).map((_, i) => (
                      <div key={i} className="h-9 w-full rounded-lg animate-pulse" style={{ background: "hsl(222 47% 10%)" }} />
                    ))
                  ) : members?.length === 0 ? (
                    <p
                      className="text-[11px] text-center p-3 rounded-lg mt-2"
                      style={{ color: "hsl(215 20% 40%)", border: "1px dashed hsl(217 33% 18%)" }}
                    >
                      ยังไม่มีสมาชิก
                    </p>
                  ) : (
                    members?.map((member) => (
                      <div
                        key={member.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, member.id)}
                        onDragEnd={handleDragEnd}
                        className="member-card-3d flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing select-none"
                        data-testid={`chip-member-${member.id}`}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: member.color ?? "#4dd",
                            boxShadow: member.color ? `0 0 8px ${member.color}88` : "none",
                          }}
                        />
                        <span className="text-xs font-medium truncate" style={{ color: "hsl(210 40% 85%)" }}>
                          {member.name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
