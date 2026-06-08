import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Users, MapPin, CalendarDays, Minus } from "lucide-react";
import { playSuccessSound, playRemoveSound } from "@/lib/audio";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full bg-muted/30 overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">การตั้งค่า</h1>
          <p className="text-sm text-muted-foreground mt-1">จัดการสมาชิก สถานที่ และตารางเวร</p>
        </div>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members" className="gap-1.5 text-xs sm:text-sm">
              <Users className="w-3.5 h-3.5" /> สมาชิก
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-1.5 text-xs sm:text-sm">
              <MapPin className="w-3.5 h-3.5" /> สถานที่
            </TabsTrigger>
            <TabsTrigger value="schedules" className="gap-1.5 text-xs sm:text-sm">
              <CalendarDays className="w-3.5 h-3.5" /> ตารางเวร
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-4">
            <MembersSettings />
          </TabsContent>
          <TabsContent value="locations" className="mt-4">
            <LocationsSettings />
          </TabsContent>
          <TabsContent value="schedules" className="mt-4">
            <SchedulesSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MembersSettings() {
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useListMembers();
  const createMember = useCreateMember();
  const deleteMember = useDeleteMember();

  const [name, setName] = useState("");
  const [color, setColor] = useState("#2dd4bf");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMember.mutate(
      { data: { name: name.trim(), color } },
      {
        onSuccess: () => {
          playSuccessSound();
          setName("");
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMember.mutate(
      { id },
      {
        onSuccess: () => {
          playRemoveSound();
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        },
      }
    );
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">รายชื่อสมาชิก</CardTitle>
        <CardDescription className="text-sm">เพิ่มหรือลบรายชื่อสมาชิกที่ต้องการจัดเข้าตารางเวร</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="member-name" className="text-xs font-medium">ชื่อสมาชิก</Label>
            <Input
              id="member-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สมชาย..."
              data-testid="input-member-name"
            />
          </div>
          <div className="space-y-1.5 w-full sm:w-20">
            <Label htmlFor="member-color" className="text-xs font-medium">สีป้าย</Label>
            <Input
              type="color"
              id="member-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="p-1 h-9 cursor-pointer"
              data-testid="input-member-color"
            />
          </div>
          <Button
            type="submit"
            disabled={createMember.isPending || !name.trim()}
            className="w-full sm:w-auto shrink-0"
            data-testid="button-add-member"
          >
            <Plus className="w-4 h-4 mr-1.5" /> เพิ่ม
          </Button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
          ) : members?.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-xl">
              ยังไม่มีรายชื่อสมาชิก — เพิ่มด้านบนเลย
            </div>
          ) : (
            <AnimatePresence>
              {members?.map((member) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between px-4 py-3 bg-background border rounded-xl shadow-sm"
                  data-testid={`item-member-${member.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: member.color ?? "#ccc" }} />
                    <span className="font-medium text-sm">{member.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(member.id)}
                    data-testid={`button-delete-member-${member.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LocationsSettings() {
  const queryClient = useQueryClient();
  const { data: locations, isLoading } = useListLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const [name, setName] = useState("");
  const [maxSlots, setMaxSlots] = useState(4);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createLocation.mutate(
      { data: { name: name.trim(), maxSlots } },
      {
        onSuccess: () => {
          playSuccessSound();
          setName("");
          setMaxSlots(4);
          queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        },
      }
    );
  };

  const handleUpdateSlots = (id: number, newSlots: number) => {
    if (newSlots < 1 || newSlots > 20) return;
    updateLocation.mutate(
      { id, data: { maxSlots: newSlots } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteLocation.mutate(
      { id },
      {
        onSuccess: () => {
          playRemoveSound();
          queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        },
      }
    );
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">สถานที่</CardTitle>
        <CardDescription className="text-sm">
          จัดการสถานที่และตั้งจำนวน Slot สูงสุดต่อวัน
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="loc-name" className="text-xs font-medium">ชื่อสถานที่</Label>
            <Input
              id="loc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น ER, OPD, ห้องยา..."
              data-testid="input-location-name"
            />
          </div>
          <div className="space-y-1.5 w-full sm:w-36">
            <Label className="text-xs font-medium">คนสูงสุด/วัน</Label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setMaxSlots((v) => Math.max(1, v - 1))}
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <div className="flex-1 text-center font-semibold text-sm border rounded-md h-9 flex items-center justify-center bg-background">
                {maxSlots}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setMaxSlots((v) => Math.min(20, v + 1))}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <Button
            type="submit"
            disabled={createLocation.isPending || !name.trim()}
            className="w-full sm:w-auto shrink-0"
            data-testid="button-add-location"
          >
            <Plus className="w-4 h-4 mr-1.5" /> เพิ่ม
          </Button>
        </form>

        <div className="space-y-2">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
          ) : locations?.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-xl">
              ยังไม่มีสถานที่
            </div>
          ) : (
            <AnimatePresence>
              {locations?.map((location) => (
                <motion.div
                  key={location.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  className="flex items-center justify-between px-4 py-3 bg-background border rounded-xl shadow-sm gap-3"
                  data-testid={`item-location-${location.id}`}
                >
                  <span className="font-medium text-sm flex-1 truncate">{location.name}</span>

                  {/* Slot counter */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground mr-1">คน/วัน</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleUpdateSlots(location.id, location.maxSlots - 1)}
                      disabled={location.maxSlots <= 1 || updateLocation.isPending}
                      data-testid={`button-slot-minus-${location.id}`}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <div className="w-8 text-center font-semibold text-sm">{location.maxSlots}</div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleUpdateSlots(location.id, location.maxSlots + 1)}
                      disabled={location.maxSlots >= 20 || updateLocation.isPending}
                      data-testid={`button-slot-plus-${location.id}`}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDelete(location.id)}
                    data-testid={`button-delete-location-${location.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SchedulesSettings() {
  const queryClient = useQueryClient();
  const { data: schedules, isLoading } = useListSchedules();
  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const [title, setTitle] = useState("");
  const [weekLabel, setWeekLabel] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createSchedule.mutate(
      { data: { title: title.trim(), weekLabel: weekLabel.trim() || undefined } },
      {
        onSuccess: () => {
          playSuccessSound();
          setTitle("");
          setWeekLabel("");
          queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteSchedule.mutate(
      { id },
      {
        onSuccess: () => {
          playRemoveSound();
          queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
        },
      }
    );
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">ตารางเวร</CardTitle>
        <CardDescription className="text-sm">สร้างแผ่นตารางเวรใหม่สำหรับแต่ละสัปดาห์</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="sched-title" className="text-xs font-medium">ชื่อตารางเวร</Label>
            <Input
              id="sched-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น สัปดาห์แรกของเดือน..."
              data-testid="input-schedule-title"
            />
          </div>
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="sched-week" className="text-xs font-medium">ช่วงเวลา (ไม่บังคับ)</Label>
            <Input
              id="sched-week"
              value={weekLabel}
              onChange={(e) => setWeekLabel(e.target.value)}
              placeholder="เช่น 1-5 พ.ย."
              data-testid="input-schedule-week"
            />
          </div>
          <Button
            type="submit"
            disabled={createSchedule.isPending || !title.trim()}
            className="w-full sm:w-auto shrink-0"
            data-testid="button-create-schedule"
          >
            <Plus className="w-4 h-4 mr-1.5" /> สร้าง
          </Button>
        </form>

        <div className="space-y-2">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
          ) : schedules?.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground border-2 border-dashed rounded-xl">
              ยังไม่มีตารางเวร
            </div>
          ) : (
            <AnimatePresence>
              {schedules?.map((schedule) => (
                <motion.div
                  key={schedule.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between px-4 py-3 bg-background border rounded-xl shadow-sm"
                  data-testid={`item-schedule-${schedule.id}`}
                >
                  <div>
                    <p className="font-semibold text-sm">{schedule.title}</p>
                    {schedule.weekLabel && (
                      <p className="text-xs text-muted-foreground mt-0.5">{schedule.weekLabel}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDelete(schedule.id)}
                    data-testid={`button-delete-schedule-${schedule.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
