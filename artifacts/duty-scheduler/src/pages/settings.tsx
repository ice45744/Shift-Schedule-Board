import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMembers,
  useCreateMember,
  useDeleteMember,
  useListLocations,
  useCreateLocation,
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
import { Trash2, Plus, Users, MapPin, CalendarDays } from "lucide-react";
import { playSuccessSound, playRemoveSound } from "@/lib/audio";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full bg-muted/30 p-8 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">การตั้งค่า</h1>
          <p className="text-muted-foreground mt-2">จัดการสมาชิก สถานที่ และตารางเวร</p>
        </div>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="w-4 h-4" /> ชื่อ (Members)
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" /> สถานที่ (Locations)
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> ตารางเวร (Schedules)
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="members">
            <MembersSettings />
          </TabsContent>
          <TabsContent value="locations">
            <LocationsSettings />
          </TabsContent>
          <TabsContent value="schedules">
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
  const [color, setColor] = useState("#2dd4bf"); // default teal

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    createMember.mutate({ data: { name, color } }, {
      onSuccess: () => {
        playSuccessSound();
        setName("");
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteMember.mutate({ id }, {
      onSuccess: () => {
        playRemoveSound();
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      }
    });
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle>รายชื่อสมาชิก</CardTitle>
        <CardDescription>เพิ่มหรือลบรายชื่อสมาชิกที่ต้องการจัดเข้าตารางเวร</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreate} className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label htmlFor="name">ชื่อสมาชิก</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สมชาย..." />
          </div>
          <div className="space-y-2 w-24">
            <Label htmlFor="color">สีป้าย</Label>
            <Input type="color" id="color" value={color} onChange={(e) => setColor(e.target.value)} className="p-1 h-9 cursor-pointer" />
          </div>
          <Button type="submit" disabled={createMember.isPending || !name.trim()}>
            <Plus className="w-4 h-4 mr-2" /> เพิ่ม
          </Button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
          ) : members?.length === 0 ? (
            <div className="col-span-full py-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              ยังไม่มีรายชื่อสมาชิก
            </div>
          ) : (
            <AnimatePresence>
              {members?.map(member => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-4 bg-background border rounded-xl shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: member.color || "#ccc" }} />
                    <span className="font-medium">{member.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(member.id)}>
                    <Trash2 className="w-4 h-4" />
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
  const deleteLocation = useDeleteLocation();
  
  const [name, setName] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    createLocation.mutate({ data: { name } }, {
      onSuccess: () => {
        playSuccessSound();
        setName("");
        queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteLocation.mutate({ id }, {
      onSuccess: () => {
        playRemoveSound();
        queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
      }
    });
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle>สถานที่</CardTitle>
        <CardDescription>จัดการรายชื่อสถานที่หรือจุดปฏิบัติงาน</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreate} className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label htmlFor="loc-name">ชื่อสถานที่</Label>
            <Input id="loc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ER, OPD..." />
          </div>
          <Button type="submit" disabled={createLocation.isPending || !name.trim()}>
            <Plus className="w-4 h-4 mr-2" /> เพิ่ม
          </Button>
        </form>

        <div className="space-y-2">
          {isLoading ? (
             Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
          ) : locations?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              ยังไม่มีสถานที่
            </div>
          ) : (
            <AnimatePresence>
              {locations?.map(location => (
                <motion.div
                  key={location.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center justify-between p-4 bg-background border rounded-xl shadow-sm"
                >
                  <span className="font-medium">{location.name}</span>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(location.id)}>
                    <Trash2 className="w-4 h-4" />
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
    
    createSchedule.mutate({ data: { title, weekLabel: weekLabel || undefined } }, {
      onSuccess: () => {
        playSuccessSound();
        setTitle("");
        setWeekLabel("");
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteSchedule.mutate({ id }, {
      onSuccess: () => {
        playRemoveSound();
        queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() });
      }
    });
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle>ตารางเวร</CardTitle>
        <CardDescription>สร้างแผ่นตารางเวรใหม่สำหรับแต่ละสัปดาห์หรือเดือน</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreate} className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label htmlFor="sched-title">ชื่อตารางเวร</Label>
            <Input id="sched-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น สัปดาห์แรกของเดือน..." />
          </div>
          <div className="space-y-2 flex-1">
            <Label htmlFor="sched-week">สัปดาห์/ช่วงเวลา (ไม่บังคับ)</Label>
            <Input id="sched-week" value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} placeholder="เช่น 1-5 พ.ย." />
          </div>
          <Button type="submit" disabled={createSchedule.isPending || !title.trim()}>
            <Plus className="w-4 h-4 mr-2" /> สร้าง
          </Button>
        </form>

        <div className="space-y-3">
          {isLoading ? (
             Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
          ) : schedules?.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              ยังไม่มีตารางเวร
            </div>
          ) : (
            <AnimatePresence>
              {schedules?.map(schedule => (
                <motion.div
                  key={schedule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-5 bg-background border rounded-xl shadow-sm"
                >
                  <div>
                    <h4 className="font-medium text-lg">{schedule.title}</h4>
                    {schedule.weekLabel && <p className="text-sm text-muted-foreground mt-1">{schedule.weekLabel}</p>}
                  </div>
                  <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDelete(schedule.id)}>
                    <Trash2 className="w-4 h-4" />
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
