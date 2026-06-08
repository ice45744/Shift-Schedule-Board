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
import { X, CalendarDays, ChevronDown, Check, Settings } from "lucide-react";
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

  // drag state: "locationId-dayId" of the row being dragged over
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

  // Compute max slots: highest number of assignments in any single (location, day) cell
  const maxSlots = (() => {
    if (!scheduleDetail?.assignments) return 4;
    const counts: Record<string, number> = {};
    for (const a of scheduleDetail.assignments) {
      const k = `${a.locationId}-${a.dayOfWeek}`;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return Math.max(4, ...Object.values(counts)) + 1; // +1 empty slot at end
  })();

  const rowKey = (locationId: number, dayId: number) => `${locationId}-${dayId}`;

  // Drag handlers
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

  // Loading / empty states
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
      <div className="flex flex-col h-full bg-muted/30 p-8 items-center justify-center">
        <div className="max-w-sm text-center space-y-5 bg-background p-10 rounded-2xl shadow-sm border">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
            <CalendarDays className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold">ยังไม่มีตารางเวร</h2>
          <p className="text-sm text-muted-foreground">ไปที่หน้าตั้งค่าเพื่อสร้างตารางเวรแรกของคุณ</p>
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
      {/* Top Bar */}
      <header className="h-14 bg-background border-b px-5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold">ตารางเวร</h1>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                role="combobox"
                className="w-[240px] justify-between font-medium text-sm"
                data-testid="button-schedule-selector"
              >
                <span className="truncate">{selectedSchedule ? selectedSchedule.title : "เลือกตารางเวร..."}</span>
                <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start">
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
                        <Check className={`mr-2 h-3.5 w-3.5 ${selectedScheduleId === s.id ? "opacity-100" : "opacity-0"}`} />
                        {s.title}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedSchedule?.weekLabel && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {selectedSchedule.weekLabel}
            </span>
          )}
        </div>

        <Link href="/settings">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <Settings className="w-3.5 h-3.5" />
            ตั้งค่า
          </Button>
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Table */}
        <div className="flex-1 overflow-auto p-4">
          {isLoadingLocations ? (
            <div className="space-y-1">
              {Array(12).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div>
          ) : locations?.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground space-y-2">
                <p>ยังไม่ได้เพิ่มสถานที่</p>
                <Link href="/settings">
                  <Button variant="outline" size="sm">ไปที่ตั้งค่า</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
              <table className="w-full border-collapse text-sm" style={{ minWidth: 600 }}>
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-32 border-r">
                      สถานที่
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-28 border-r">
                      วัน
                    </th>
                    {Array.from({ length: maxSlots }, (_, i) => (
                      <th key={i} className="text-center px-3 py-3 font-semibold text-muted-foreground border-r last:border-r-0 min-w-[110px]">
                        คนที่ {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {locations?.map((location, locIndex) =>
                    DAYS.map((day, dayIndex) => {
                      const key = rowKey(location.id, day.id);
                      const isOver = dragOverRow === key;
                      const rowAssignments =
                        scheduleDetail?.assignments?.filter(
                          (a) => a.locationId === location.id && a.dayOfWeek === day.id
                        ) ?? [];

                      const isFirstDayOfLocation = dayIndex === 0;
                      const isLastDayOfLocation = dayIndex === DAYS.length - 1;
                      const isLastLocation = locIndex === (locations?.length ?? 0) - 1;

                      return (
                        <tr
                          key={key}
                          data-testid={`row-${key}`}
                          className={`border-b transition-colors duration-100 ${
                            isLastDayOfLocation && !isLastLocation ? "border-b-2 border-b-border" : "border-b-border/60"
                          } ${isOver ? "bg-primary/8" : dayIndex % 2 === 0 ? "bg-background" : "bg-muted/20"}`}
                          onDragEnter={(e) => handleRowDragEnter(e, location.id, day.id)}
                          onDragLeave={(e) => handleRowDragLeave(e, location.id, day.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, location.id, day.id)}
                        >
                          {/* Location cell — spans 5 rows */}
                          {isFirstDayOfLocation && (
                            <td
                              rowSpan={5}
                              className="px-4 py-3 border-r align-middle font-semibold border-b-2 border-b-border"
                              style={{ verticalAlign: "middle" }}
                            >
                              <div
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold text-white"
                                style={{ backgroundColor: "hsl(var(--primary))" }}
                              >
                                {location.name}
                              </div>
                            </td>
                          )}

                          {/* Day cell */}
                          <td
                            className={`px-4 py-2.5 border-r text-sm font-medium whitespace-nowrap ${
                              isOver ? "text-primary font-semibold" : "text-foreground/80"
                            }`}
                          >
                            {day.label}
                            {isOver && (
                              <span className="ml-1.5 text-xs text-primary opacity-70">(วางที่นี่)</span>
                            )}
                          </td>

                          {/* Slot cells */}
                          {Array.from({ length: maxSlots }, (_, slotIndex) => {
                            const assignment = rowAssignments[slotIndex];
                            return (
                              <td
                                key={slotIndex}
                                className={`px-2 py-1.5 border-r last:border-r-0 h-10 ${
                                  isOver && !assignment ? "bg-primary/10" : ""
                                }`}
                              >
                                <AnimatePresence>
                                  {assignment && (
                                    <motion.div
                                      key={assignment.id}
                                      initial={{ opacity: 0, scale: 0.85 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.85 }}
                                      layout
                                      className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded text-xs font-medium border max-w-full"
                                      style={{
                                        backgroundColor: assignment.memberColor
                                          ? `${assignment.memberColor}18`
                                          : "hsl(var(--muted))",
                                        borderColor: assignment.memberColor
                                          ? `${assignment.memberColor}50`
                                          : "hsl(var(--border))",
                                      }}
                                      data-testid={`chip-assignment-${assignment.id}`}
                                    >
                                      <div
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{ backgroundColor: assignment.memberColor ?? "#888" }}
                                      />
                                      <span className="truncate">{assignment.memberName}</span>
                                      <button
                                        onClick={() => handleRemove(assignment.id)}
                                        className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-40 hover:opacity-100 shrink-0"
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Members Sidebar */}
        <aside className="w-56 bg-background border-l shrink-0 flex flex-col">
          <div className="px-4 py-3 border-b bg-muted/20">
            <p className="font-semibold text-sm">สมาชิก</p>
            <p className="text-xs text-muted-foreground mt-0.5">ลากชื่อไปวางในแถว</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {isLoadingMembers ? (
              Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)
            ) : members?.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center p-4 border-2 border-dashed rounded-lg">
                ยังไม่มีสมาชิก
              </p>
            ) : (
              members?.map((member) => (
                <div
                  key={member.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, member.id)}
                  onDragEnd={handleDragEnd}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-card shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/60 hover:shadow transition-all select-none"
                  data-testid={`chip-member-${member.id}`}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: member.color ?? "#888" }}
                  />
                  <span className="text-sm font-medium truncate">{member.name}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
