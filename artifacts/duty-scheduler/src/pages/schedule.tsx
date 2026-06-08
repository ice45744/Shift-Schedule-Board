import { useState, useMemo } from "react";
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
import { X, CalendarDays, ChevronDown, Check } from "lucide-react";
import { playDropSound, playRemoveSound, playSuccessSound } from "@/lib/audio";
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

  // Auto-select first schedule if none selected
  useMemo(() => {
    if (!selectedScheduleId && schedules && schedules.length > 0) {
      setSelectedScheduleId(schedules[0].id);
    }
  }, [schedules, selectedScheduleId]);

  const { data: members, isLoading: isLoadingMembers } = useListMembers();
  const { data: locations, isLoading: isLoadingLocations } = useListLocations();
  
  const { data: scheduleDetail, isLoading: isLoadingScheduleDetail } = useGetSchedule(
    selectedScheduleId as number,
    { query: { enabled: !!selectedScheduleId, queryKey: selectedScheduleId ? getGetScheduleQueryKey(selectedScheduleId) : undefined } }
  );

  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, memberId: number) => {
    e.dataTransfer.setData("memberId", memberId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent, locationId: number, dayOfWeek: number) => {
    e.preventDefault();
    const memberId = parseInt(e.dataTransfer.getData("memberId"), 10);
    
    if (!memberId || !selectedScheduleId) return;

    createAssignment.mutate({
      scheduleId: selectedScheduleId,
      data: { memberId, locationId, dayOfWeek }
    }, {
      onSuccess: () => {
        playDropSound();
        queryClient.invalidateQueries({ queryKey: getGetScheduleQueryKey(selectedScheduleId) });
      }
    });
  };

  const handleRemoveAssignment = (assignmentId: number) => {
    if (!selectedScheduleId) return;
    deleteAssignment.mutate({ scheduleId: selectedScheduleId, id: assignmentId }, {
      onSuccess: () => {
        playRemoveSound();
        queryClient.invalidateQueries({ queryKey: getGetScheduleQueryKey(selectedScheduleId) });
      }
    });
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

  const selectedSchedule = schedules.find(s => s.id === selectedScheduleId);

  return (
    <div className="flex flex-col h-full bg-muted/20">
      {/* Top Bar */}
      <header className="h-16 bg-background border-b px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">ตารางเวร</h1>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-[280px] justify-between font-medium">
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
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Schedule Area */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-background border rounded-2xl shadow-sm overflow-hidden flex flex-col min-w-[800px]">
            {/* Header Row */}
            <div className="flex border-b bg-muted/30">
              <div className="w-48 shrink-0 p-4 border-r flex items-center justify-center font-bold text-muted-foreground">
                สถานที่
              </div>
              <div className="flex-1 grid grid-cols-5 divide-x">
                {DAYS.map(day => (
                  <div key={day.id} className="p-4 text-center">
                    <div className="font-bold text-lg">{day.short}</div>
                    <div className="text-xs text-muted-foreground">{day.name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Rows */}
            <div className="flex-1 flex flex-col divide-y bg-background">
              {isLoadingLocations ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : locations?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">ยังไม่ได้เพิ่มสถานที่</div>
              ) : (
                locations?.map(location => (
                  <div key={location.id} className="flex min-h-[100px] group">
                    <div className="w-48 shrink-0 p-4 border-r flex items-center font-medium bg-muted/10 group-hover:bg-muted/20 transition-colors">
                      {location.name}
                    </div>
                    <div className="flex-1 grid grid-cols-5 divide-x">
                      {DAYS.map(day => {
                        const cellAssignments = scheduleDetail?.assignments?.filter(
                          a => a.locationId === location.id && a.dayOfWeek === day.id
                        ) || [];

                        return (
                          <div
                            key={day.id}
                            className="p-2 transition-colors hover:bg-accent/30 focus-visible:bg-accent/30"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, location.id, day.id)}
                          >
                            <div className="flex flex-wrap gap-2 h-full content-start items-start">
                              <AnimatePresence>
                                {cellAssignments.map(assignment => (
                                  <motion.div
                                    key={assignment.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    layout
                                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-md text-sm font-medium border shadow-sm"
                                    style={{
                                      backgroundColor: assignment.memberColor ? `${assignment.memberColor}15` : 'var(--muted)',
                                      borderColor: assignment.memberColor ? `${assignment.memberColor}40` : 'var(--border)',
                                      color: 'var(--foreground)'
                                    }}
                                  >
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: assignment.memberColor || 'gray' }} />
                                    <span>{assignment.memberName}</span>
                                    <button
                                      onClick={() => handleRemoveAssignment(assignment.id)}
                                      className="ml-1 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors opacity-60 hover:opacity-100"
                                    >
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
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Members Panel */}
        <aside className="w-72 bg-background border-l shrink-0 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
          <div className="p-4 border-b bg-muted/20">
            <h3 className="font-bold text-lg">สมาชิก</h3>
            <p className="text-xs text-muted-foreground mt-1">ลากรายชื่อไปวางในตาราง</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isLoadingMembers ? (
              Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
            ) : members?.length === 0 ? (
               <div className="p-4 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                 ยังไม่ได้เพิ่มสมาชิก
               </div>
            ) : (
              members?.map(member => (
                <div
                  key={member.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, member.id)}
                  className="p-3 border rounded-lg bg-card shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors flex items-center gap-3 hover:shadow-md"
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: member.color || 'gray' }} />
                  <span className="font-medium truncate">{member.name}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
