import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMembers,
  useListLocations,
  useListSchedules,
  useGetSchedule,
  useCreateAssignment,
  useDeleteAssignment,
  useAutoAssign,
  getGetScheduleQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { X, CalendarDays, ChevronDown, Check, Settings, Wand2, ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen } from "lucide-react";
import { playDropSound, playRemoveSound, playSuccessSound } from "@/lib/audio";
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

// Mobile: show one day at a time
const MOBILE_BREAKPOINT = 640;

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const { data: schedules, isLoading: isLoadingSchedules } = useListSchedules();
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [mobileDay, setMobileDay] = useState(1);
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
    {
      query: {
        enabled: !!selectedScheduleId,
        queryKey: getGetScheduleQueryKey(selectedScheduleId ?? 0),
      },
    }
  );

  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const autoAssign = useAutoAssign();

  const rowKey = (locationId: number, dayId: number) => `${locationId}-${dayId}`;

  const handleDragStart = (e: React.DragEvent, memberId: number) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", memberId.toString());
  };
  const handleDragEnd = () => {
    dragCounters.current = {};
    setDragOverRow(null);
  };
  const handleRowDragEnter = (e: React.DragEvent, locationId: number, dayId: number) => {
    e.preventDefault();
    const key = rowKey(locationId, dayId);
    dragCounters.current[key] = (dragCounters.current[key] ?? 0) + 1;
    setDragOverRow(key);
  };
  const handleRowDragLeave = (e: React.DragEvent, locationId: number, dayId: number) => {
    const key = rowKey(locationId, dayId);
    dragCounters.current[key] = Math.max(0, (dragCounters.current[key] ?? 1) - 1);
    if (dragCounters.current[key] === 0) {
      setDragOverRow((prev) => (prev === key ? null : prev));
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const handleDrop = (e: React.DragEvent, locationId: number, dayOfWeek: number) => {
    e.preventDefault();
    const key = rowKey(locationId, dayOfWeek);
    dragCounters.current[key] = 0;
    setDragOverRow(null);
    const raw = e.dataTransfer.getData("text/plain");
    const memberId = parseInt(raw, 10);
    if (!memberId || isNaN(memberId) || !selectedScheduleId) return;
    createAssignment.mutate(
      { scheduleId: selectedScheduleId, data: { memberId, locationId, dayOfWeek } },
      {
        onSuccess: () => {
          playDropSound();
          queryClient.invalidateQueries({ queryKey: getGetScheduleQueryKey(selectedScheduleId) });
        },
      }
    );
  };
  const handleRemove = (assignmentId: number) => {
    if (!selectedScheduleId) return;
    deleteAssignment.mutate(
      { scheduleId: selectedScheduleId, id: assignmentId },
      {
        onSuccess: () => {
          playRemoveSound();
          queryClient.invalidateQueries({ queryKey: getGetScheduleQueryKey(selectedScheduleId) });
        },
      }
    );
  };
  const handleAutoAssign = (locationId: number) => {
    if (!selectedScheduleId) return;
    autoAssign.mutate(
      { scheduleId: selectedScheduleId, data: { locationId } },
      {
        onSuccess: () => {
          playSuccessSound();
          queryClient.invalidateQueries({ queryKey: getGetScheduleQueryKey(selectedScheduleId) });
        },
      }
    );
  };

  // ── Loading / empty states ──────────────────────────────────────────────
  if (isLoadingSchedules) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground animate-pulse">
          <CalendarDays className="w-10 h-10" />
          <p className="text-sm">กำลังโหลดตารางเวร...</p>
        </div>
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <div className="flex flex-col h-full bg-muted/30 p-6 items-center justify-center">
        <div className="max-w-sm w-full text-center space-y-5 bg-background p-8 rounded-2xl shadow-sm border">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
            <CalendarDays className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold">ยังไม่มีตารางเวร</h2>
          <p className="text-sm text-muted-foreground">ไปที่หน้าตั้งค่าเพื่อสร้างตารางเวรแรก</p>
          <Link href="/settings">
            <Button size="lg" className="w-full font-medium">ไปที่หน้าตั้งค่า</Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId);

  return (
    <div className="flex flex-col h-full bg-muted/10">
      {/* ── Top Bar ── */}
      <header className="h-14 bg-background border-b px-4 flex items-center justify-between shrink-0 z-20 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-bold hidden sm:block whitespace-nowrap">ตารางเวร</h1>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                role="combobox"
                className="w-[180px] sm:w-[220px] justify-between font-medium text-xs sm:text-sm"
                data-testid="button-schedule-selector"
              >
                <span className="truncate">{selectedSchedule ? selectedSchedule.title : "เลือกตารางเวร..."}</span>
                <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="start">
              <Command>
                <CommandInput placeholder="ค้นหา..." className="h-8 text-sm" />
                <CommandList>
                  <CommandEmpty>ไม่พบตารางเวร</CommandEmpty>
                  <CommandGroup>
                    {schedules.map((s) => (
                      <CommandItem
                        key={s.id}
                        value={s.title}
                        onSelect={() => {
                          setSelectedScheduleId(s.id);
                          setPopoverOpen(false);
                        }}
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
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full hidden sm:inline">
              {selectedSchedule.weekLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? "ซ่อนสมาชิก" : "แสดงสมาชิก"}
            data-testid="button-toggle-sidebar"
          >
            {sidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </Button>
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground text-xs">
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ตั้งค่า</span>
            </Button>
          </Link>
        </div>
      </header>

      {/* ── Mobile day navigator ── */}
      <div className="sm:hidden flex items-center justify-between px-4 py-2 bg-background border-b shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setMobileDay((d) => Math.max(1, d - 1))}
          disabled={mobileDay === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex gap-1">
          {DAYS.map((d) => (
            <button
              key={d.id}
              onClick={() => setMobileDay(d.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                mobileDay === d.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {d.label.charAt(0)}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setMobileDay((d) => Math.min(5, d + 1))}
          disabled={mobileDay === 5}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Main Table ── */}
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          {isLoadingLocations ? (
            <div className="space-y-1">
              {Array(12).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div>
          ) : locations?.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground space-y-2">
                <p className="text-sm">ยังไม่ได้เพิ่มสถานที่</p>
                <Link href="/settings">
                  <Button variant="outline" size="sm">ไปที่ตั้งค่า</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
              {/* ── DESKTOP table (sm+) ── */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full border-collapse text-sm" style={{ minWidth: 600 }}>
                  <thead>
                    <tr className="bg-muted/40 border-b">
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground text-xs w-28 border-r">สถานที่</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground text-xs w-8 border-r"></th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground text-xs w-24 border-r">วัน</th>
                      {(() => {
                        const maxSlots = Math.max(...(locations?.map((l) => l.maxSlots) ?? [4]));
                        return Array.from({ length: maxSlots }, (_, i) => (
                          <th key={i} className="text-center px-2 py-2.5 font-semibold text-muted-foreground text-xs border-r last:border-r-0 min-w-[100px]">
                            คนที่ {i + 1}
                          </th>
                        ));
                      })()}
                    </tr>
                  </thead>
                  <tbody>
                    {locations?.map((location, locIndex) => {
                      const maxSlots = location.maxSlots;
                      return DAYS.map((day, dayIndex) => {
                        const key = rowKey(location.id, day.id);
                        const isOver = dragOverRow === key;
                        const rowAssignments =
                          scheduleDetail?.assignments?.filter(
                            (a) => a.locationId === location.id && a.dayOfWeek === day.id
                          ) ?? [];
                        const isFirstDay = dayIndex === 0;
                        const isLastDay = dayIndex === DAYS.length - 1;
                        const isLastLoc = locIndex === (locations?.length ?? 0) - 1;

                        return (
                          <tr
                            key={key}
                            data-testid={`row-${key}`}
                            className={`transition-colors duration-100 ${
                              isLastDay && !isLastLoc ? "border-b-2 border-border" : "border-b border-border/50"
                            } ${isOver ? "bg-primary/8" : dayIndex % 2 === 0 ? "bg-background" : "bg-muted/15"}`}
                            onDragEnter={(e) => handleRowDragEnter(e, location.id, day.id)}
                            onDragLeave={(e) => handleRowDragLeave(e, location.id, day.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, location.id, day.id)}
                          >
                            {isFirstDay && (
                              <td rowSpan={5} className="px-3 py-2 border-r align-middle border-b-2 border-b-border">
                                <div
                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap"
                                  style={{ backgroundColor: "hsl(var(--primary))" }}
                                >
                                  {location.name}
                                </div>
                              </td>
                            )}
                            {/* Auto-assign button — only on first day */}
                            {isFirstDay && (
                              <td rowSpan={5} className="px-1 py-2 border-r align-middle border-b-2 border-b-border w-8">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  title="จัดเวรอัตโนมัติ"
                                  disabled={autoAssign.isPending}
                                  onClick={() => handleAutoAssign(location.id)}
                                  data-testid={`button-auto-assign-${location.id}`}
                                >
                                  <Wand2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            )}
                            <td className={`px-3 py-2 border-r text-xs whitespace-nowrap font-medium ${isOver ? "text-primary" : "text-foreground/75"}`}>
                              {day.label}
                            </td>
                            {Array.from({ length: maxSlots }, (_, slotIndex) => {
                              const assignment = rowAssignments[slotIndex];
                              return (
                                <td
                                  key={slotIndex}
                                  className={`px-1.5 py-1.5 border-r last:border-r-0 h-9 ${isOver && !assignment ? "bg-primary/10" : ""}`}
                                >
                                  <AnimatePresence>
                                    {assignment && (
                                      <motion.div
                                        key={assignment.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="inline-flex items-center gap-1 pl-1.5 pr-0.5 py-0.5 rounded text-xs font-medium border max-w-full"
                                        style={{
                                          backgroundColor: assignment.memberColor ? `${assignment.memberColor}18` : "hsl(var(--muted))",
                                          borderColor: assignment.memberColor ? `${assignment.memberColor}50` : "hsl(var(--border))",
                                        }}
                                        data-testid={`chip-${assignment.id}`}
                                      >
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: assignment.memberColor ?? "#888" }} />
                                        <span className="truncate max-w-[80px]">{assignment.memberName}</span>
                                        <button
                                          onClick={() => handleRemove(assignment.id)}
                                          className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 opacity-40 hover:opacity-100 transition-opacity shrink-0"
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

              {/* ── MOBILE layout (< sm) — cards per location, one day at a time ── */}
              <div className="sm:hidden divide-y">
                {locations?.map((location) => {
                  const rowAssignments =
                    scheduleDetail?.assignments?.filter(
                      (a) => a.locationId === location.id && a.dayOfWeek === mobileDay
                    ) ?? [];

                  return (
                    <div key={location.id} className="px-3 py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-white"
                          style={{ backgroundColor: "hsl(var(--primary))" }}
                        >
                          {location.name}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-muted-foreground hover:text-primary px-2"
                          disabled={autoAssign.isPending}
                          onClick={() => handleAutoAssign(location.id)}
                          data-testid={`button-auto-mobile-${location.id}`}
                        >
                          <Wand2 className="w-3 h-3" />
                          อัตโนมัติ
                        </Button>
                      </div>
                      {/* Drop zone for mobile */}
                      <div
                        className={`min-h-[44px] rounded-lg border-2 border-dashed px-2 py-2 flex flex-wrap gap-1.5 transition-colors ${
                          dragOverRow === rowKey(location.id, mobileDay)
                            ? "border-primary/60 bg-primary/8"
                            : "border-border/40 bg-muted/10"
                        }`}
                        onDragEnter={(e) => handleRowDragEnter(e, location.id, mobileDay)}
                        onDragLeave={(e) => handleRowDragLeave(e, location.id, mobileDay)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, location.id, mobileDay)}
                        data-testid={`drop-mobile-${location.id}-${mobileDay}`}
                      >
                        {rowAssignments.length === 0 && (
                          <p className="text-xs text-muted-foreground/60 self-center mx-auto">ว่าง — ลากชื่อมาวาง</p>
                        )}
                        <AnimatePresence>
                          {rowAssignments.map((a) => (
                            <motion.div
                              key={a.id}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded text-xs font-medium border"
                              style={{
                                backgroundColor: a.memberColor ? `${a.memberColor}18` : "hsl(var(--muted))",
                                borderColor: a.memberColor ? `${a.memberColor}50` : "hsl(var(--border))",
                              }}
                            >
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: a.memberColor ?? "#888" }} />
                              <span>{a.memberName}</span>
                              <button onClick={() => handleRemove(a.id)} className="p-0.5 rounded-full hover:bg-black/10 opacity-40 hover:opacity-100">
                                <X className="w-3 h-3" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
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
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="bg-background border-l shrink-0 flex flex-col overflow-hidden"
              style={{ minWidth: sidebarOpen ? 176 : 0 }}
            >
              <div className="w-44 sm:w-52 flex flex-col flex-1 overflow-hidden">
                <div className="px-3 py-2.5 border-b bg-muted/20 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-xs sm:text-sm whitespace-nowrap">สมาชิก</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">ลากชื่อไปวางในแถว</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {isLoadingMembers ? (
                    Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)
                  ) : members?.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center p-3 border-2 border-dashed rounded-lg mt-2">
                      ยังไม่มีสมาชิก
                    </p>
                  ) : (
                    members?.map((member) => (
                      <div
                        key={member.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, member.id)}
                        onDragEnd={handleDragEnd}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg border bg-card shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/60 transition-all select-none"
                        data-testid={`chip-member-${member.id}`}
                      >
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: member.color ?? "#888" }} />
                        <span className="text-xs font-medium truncate">{member.name}</span>
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
