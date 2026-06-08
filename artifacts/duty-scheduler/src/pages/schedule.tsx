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
import { X, CalendarDays, ChevronDown, Check, Plus } from "lucide-react";
import { playDropSound, playRemoveSound } from "@/lib/audio";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Link } from "wouter";

const DAYS = [
  { id: 1, name: "จันทร์", short: "จ" },
  { id: 2, name: "อังคาร", short: "อ" },
  { id: 3, name: "พุธ", short: "พ" },
  { id: 4, name: "พฤหัส", short: "พฤ" },
  { id: 5, name: "ศุกร์", short: "ศ" },
];

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const { data: schedules, isLoading: isLoadingSchedules } = useListSchedules();
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // drag state: which cell is being dragged over
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
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

  const handleDragStart = (e: React.DragEvent, memberId: number) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", memberId.toString());
  };

  const cellKey = (locationId: number, dayId: number) => `${locationId}-${dayId}`;

  const handleDragEnter = (e: React.DragEvent, locationId: number, dayId: number) => {
    e.preventDefault();
    const key = cellKey(locationId, dayId);
    dragCounters.current[key] = (dragCounters.current[key] || 0) + 1;
    setDragOverCell(key);
  };

  const handleDragLeave = (e: React.DragEvent, locationId: number, dayId: number) => {
    const key = cellKey(locationId, dayId);
    dragCounters.current[key] = (dragCounters.current[key] || 1) - 1;
    if (dragCounters.current[key] <= 0) {
      dragCounters.current[key] = 0;
      setDragOverCell((prev) => (prev === key ? null : prev));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent, locationId: number, dayOfWeek: number) => {
    e.preventDefault();
    const key = cellKey(locationId, dayOfWeek);
    dragCounters.current[key] = 0;
    setDragOverCell(null);

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

  const handleDragEnd = () => {
    dragCounters.current = {};
    setDragOverCell(null);
  };

  const handleRemoveAssignment = (assignmentId: number) => {
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

  if (isLoadingSchedules) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4 text-muted-foreground animate-pulse">
          <CalendarDays className="w-12 h-12" />
          <p>กำลังโหลดตารางเวร...</p>
        </div>
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <div className="flex flex-col h-full bg-muted/30 p-8 items-center justify-center">
        <div className="max-w-md text-center space-y-6 bg-background p-12 rounded-2xl shadow-sm border border-border">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
            <CalendarDays className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold">ยังไม่มีตารางเวร</h2>
          <p className="text-muted-foreground">เริ่มใช้งานโดยการไปที่หน้าตั้งค่าและสร้างตารางเวรแรกของคุณ</p>
          <Link href="/settings">
            <Button size="lg" className="w-full mt-4 font-medium">ไปที่หน้าตั้งค่า</Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId);

  return (
    <div className="flex flex-col h-full bg-muted/20">
      {/* Top Bar */}
      <header className="h-16 bg-background border-b px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">ตารางเวร</h1>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-[280px] justify-between font-medium"
                data-testid="button-schedule-selector"
              >
                {selectedSchedule ? selectedSchedule.title : "เลือกตารางเวร..."}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <Command>
                <CommandInput placeholder="ค้นหาตารางเวร..." />
                <CommandList>
                  <CommandEmpty>ไม่พบตารางเวร</CommandEmpty>
                  <CommandGroup>
                    {schedules.map((schedule) => (
                      <CommandItem
                        key={schedule.id}
                        value={schedule.title}
                        onSelect={() => {
                          setSelectedScheduleId(schedule.id);
                          setPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedScheduleId === schedule.id ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        {schedule.title}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedSchedule?.weekLabel && (
            <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {selectedSchedule.weekLabel}
            </span>
          )}
        </div>

        <Link href="/settings">
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            จัดการตาราง
          </Button>
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Schedule Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-background border rounded-2xl shadow-sm overflow-hidden" style={{ minWidth: 700 }}>
            {/* Header Row */}
            <div className="flex border-b bg-muted/30">
              <div className="w-44 shrink-0 p-4 border-r flex items-center justify-center font-bold text-muted-foreground text-sm">
                สถานที่
              </div>
              <div className="flex-1 grid grid-cols-5 divide-x">
                {DAYS.map((day) => (
                  <div key={day.id} className="p-4 text-center">
                    <div className="font-bold text-lg">{day.short}</div>
                    <div className="text-xs text-muted-foreground">{day.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Rows */}
            <div className="flex flex-col divide-y bg-background">
              {isLoadingLocations ? (
                Array(4)
                  .fill(0)
                  .map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : locations?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  ยังไม่ได้เพิ่มสถานที่ —{" "}
                  <Link href="/settings" className="underline text-primary">
                    ไปที่ตั้งค่า
                  </Link>
                </div>
              ) : (
                locations?.map((location) => (
                  <div key={location.id} className="flex min-h-[90px] group">
                    <div className="w-44 shrink-0 p-4 border-r flex items-center font-medium bg-muted/10 group-hover:bg-muted/20 transition-colors text-sm">
                      {location.name}
                    </div>
                    <div className="flex-1 grid grid-cols-5 divide-x">
                      {DAYS.map((day) => {
                        const key = cellKey(location.id, day.id);
                        const isOver = dragOverCell === key;
                        const cellAssignments =
                          scheduleDetail?.assignments?.filter(
                            (a) => a.locationId === location.id && a.dayOfWeek === day.id
                          ) ?? [];

                        return (
                          <div
                            key={day.id}
                            data-testid={`cell-${location.id}-${day.id}`}
                            className={`p-2 transition-all duration-150 min-h-[90px] relative ${
                              isOver
                                ? "bg-primary/10 ring-2 ring-inset ring-primary/50"
                                : "hover:bg-accent/20"
                            }`}
                            onDragEnter={(e) => handleDragEnter(e, location.id, day.id)}
                            onDragLeave={(e) => handleDragLeave(e, location.id, day.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, location.id, day.id)}
                          >
                            {isOver && cellAssignments.length === 0 && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                  <Plus className="w-4 h-4 text-primary" />
                                </div>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1.5">
                              <AnimatePresence>
                                {isLoadingScheduleDetail
                                  ? null
                                  : cellAssignments.map((assignment) => (
                                      <motion.div
                                        key={assignment.id}
                                        initial={{ opacity: 0, scale: 0.75 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.75 }}
                                        layout
                                        className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-md text-xs font-medium border shadow-sm"
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
                                          className="w-2 h-2 rounded-full shrink-0"
                                          style={{
                                            backgroundColor: assignment.memberColor ?? "#888",
                                          }}
                                        />
                                        <span>{assignment.memberName}</span>
                                        <button
                                          onClick={() => handleRemoveAssignment(assignment.id)}
                                          className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors opacity-50 hover:opacity-100"
                                          data-testid={`button-remove-${assignment.id}`}
                                        >
                                          <X className="w-2.5 h-2.5" />
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
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Members Panel */}
        <aside className="w-64 bg-background border-l shrink-0 flex flex-col z-10">
          <div className="p-4 border-b bg-muted/20">
            <h3 className="font-bold">สมาชิก</h3>
            <p className="text-xs text-muted-foreground mt-0.5">ลากชื่อไปวางในตาราง</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {isLoadingMembers ? (
              Array(6)
                .fill(0)
                .map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
            ) : members?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                ยังไม่ได้เพิ่มสมาชิก
              </div>
            ) : (
              members?.map((member) => (
                <div
                  key={member.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, member.id)}
                  onDragEnd={handleDragEnd}
                  className="p-2.5 border rounded-lg bg-card shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/60 hover:shadow-md transition-all flex items-center gap-2.5 select-none"
                  data-testid={`chip-member-${member.id}`}
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: member.color ?? "#888" }}
                  />
                  <span className="font-medium text-sm truncate">{member.name}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
