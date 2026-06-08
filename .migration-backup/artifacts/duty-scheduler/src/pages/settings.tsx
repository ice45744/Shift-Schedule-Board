import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMembers, useCreateMember, useDeleteMember,
  useListLocations, useCreateLocation, useUpdateLocation, useDeleteLocation,
  useListSchedules, useCreateSchedule, useDeleteSchedule,
  getListMembersQueryKey, getListLocationsQueryKey, getListSchedulesQueryKey,
} from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Users, MapPin, CalendarDays, Minus } from "lucide-react";
import { playSuccessSound, playRemoveSound } from "@/lib/audio";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

const fieldStyle: React.CSSProperties = {
  background: "hsl(222 47% 9%)",
  border: "1px solid hsl(217 33% 18%)",
  color: "hsl(210 40% 90%)",
  borderRadius: "0.5rem",
};

const cardStyle: React.CSSProperties = {
  background: "linear-gradient(145deg, hsl(222 47% 9%), hsl(222 47% 7%))",
  border: "1px solid hsl(217 33% 14%)",
  borderRadius: "0.875rem",
  boxShadow: "0 8px 32px hsl(0 0% 0% / 0.4), inset 0 1px 0 hsl(210 40% 94% / 0.04)",
};

const itemStyle: React.CSSProperties = {
  background: "linear-gradient(145deg, hsl(222 47% 10%), hsl(222 47% 8%))",
  border: "1px solid hsl(217 33% 15%)",
  borderRadius: "0.625rem",
  boxShadow: "0 2px 8px hsl(0 0% 0% / 0.3), inset 0 1px 0 hsl(210 40% 94% / 0.03)",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div
        className="px-4 py-5 shrink-0"
        style={{
          background: "linear-gradient(180deg, hsl(222 47% 8%) 0%, hsl(222 47% 7%) 100%)",
          borderBottom: "1px solid hsl(217 33% 13%)",
          boxShadow: "0 4px 24px hsl(0 0% 0% / 0.3)",
        }}
      >
        <h1
          className="text-xl font-extrabold tracking-tight"
          style={{ color: "hsl(186 100% 65%)", textShadow: "0 0 20px hsl(186 100% 50% / 0.4)" }}
        >
          การตั้งค่า
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "hsl(215 20% 40%)" }}>
          จัดการสมาชิก สถานที่ และตารางเวร
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto px-4 py-6">
          <Tabs defaultValue="members" className="w-full">
            <TabsList
              className="grid w-full grid-cols-3 mb-6 p-1 rounded-xl"
              style={{
                background: "hsl(222 47% 8%)",
                border: "1px solid hsl(217 33% 14%)",
                boxShadow: "inset 0 2px 8px hsl(0 0% 0% / 0.3)",
              }}
            >
              {[
                { value: "members", icon: <Users className="w-3.5 h-3.5" />, label: "สมาชิก" },
                { value: "locations", icon: <MapPin className="w-3.5 h-3.5" />, label: "สถานที่" },
                { value: "schedules", icon: <CalendarDays className="w-3.5 h-3.5" />, label: "ตารางเวร" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-1.5 text-xs sm:text-sm rounded-lg transition-all"
                  style={{ color: "hsl(215 20% 48%)" }}
                >
                  {tab.icon} {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="members"><MembersSection /></TabsContent>
            <TabsContent value="locations"><LocationsSection /></TabsContent>
            <TabsContent value="schedules"><SchedulesSection /></TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div style={cardStyle} className="p-5 space-y-5">
      <div>
        <h2 className="font-bold text-base" style={{ color: "hsl(210 40% 92%)" }}>{title}</h2>
        <p className="text-xs mt-0.5" style={{ color: "hsl(215 20% 42%)" }}>{description}</p>
      </div>
      {children}
    </div>
  );
}

function NeonButton({ children, disabled, onClick, type = "button", className = "" }: {
  children: React.ReactNode; disabled?: boolean; onClick?: () => void; type?: "button" | "submit"; className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{
        background: disabled ? "hsl(222 47% 14%)" : "linear-gradient(135deg, hsl(186 100% 50%) 0%, hsl(186 100% 38%) 100%)",
        color: disabled ? "hsl(215 20% 45%)" : "hsl(222 84% 5%)",
        boxShadow: disabled ? "none" : "0 0 16px hsl(186 100% 50% / 0.25), 0 4px 12px hsl(0 0% 0% / 0.4), inset 0 1px 0 hsl(186 100% 80% / 0.2)",
        border: "none",
      }}
    >
      {children}
    </button>
  );
}

function MembersSection() {
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useListMembers();
  const createMember = useCreateMember();
  const deleteMember = useDeleteMember();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#00e5ff");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMember.mutate({ data: { name: name.trim(), color } }, {
      onSuccess: () => { playSuccessSound(); setName(""); queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }); },
    });
  };

  return (
    <SectionCard title="รายชื่อสมาชิก" description="เพิ่มหรือลบรายชื่อสมาชิกที่ต้องการจัดเข้าตารางเวร">
      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2.5 items-end">
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs font-medium" style={{ color: "hsl(215 20% 55%)" }}>ชื่อสมาชิก</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สมชาย..." style={fieldStyle} data-testid="input-member-name" />
        </div>
        <div className="space-y-1.5 w-full sm:w-16">
          <Label className="text-xs font-medium" style={{ color: "hsl(215 20% 55%)" }}>สี</Label>
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="p-1 h-9 cursor-pointer" style={{ ...fieldStyle, padding: "2px" }} data-testid="input-member-color" />
        </div>
        <NeonButton type="submit" disabled={createMember.isPending || !name.trim()} className="w-full sm:w-auto shrink-0">
          <Plus className="w-3.5 h-3.5" /> เพิ่ม
        </NeonButton>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {isLoading ? Array(4).fill(0).map((_, i) => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "hsl(222 47% 10%)" }} />)
          : members?.length === 0 ? (
            <div className="col-span-full py-8 text-center text-sm rounded-xl" style={{ color: "hsl(215 20% 38%)", border: "1px dashed hsl(217 33% 18%)" }}>
              ยังไม่มีรายชื่อสมาชิก
            </div>
          ) : (
            <AnimatePresence>
              {members?.map((member) => (
                <motion.div key={member.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between px-3.5 py-2.5" style={itemStyle} data-testid={`item-member-${member.id}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: member.color ?? "#4dd", boxShadow: member.color ? `0 0 8px ${member.color}88` : "none" }} />
                    <span className="font-medium text-sm" style={{ color: "hsl(210 40% 88%)" }}>{member.name}</span>
                  </div>
                  <button className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity" style={{ color: "hsl(0 72% 60%)" }}
                    onClick={() => { deleteMember.mutate({ id: member.id }, { onSuccess: () => { playRemoveSound(); queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() }); } }); }}
                    data-testid={`button-delete-member-${member.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
      </div>
    </SectionCard>
  );
}

function LocationsSection() {
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
    createLocation.mutate({ data: { name: name.trim(), maxSlots } }, {
      onSuccess: () => { playSuccessSound(); setName(""); setMaxSlots(4); queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() }); },
    });
  };

  const handleSlots = (id: number, val: number) => {
    if (val < 1 || val > 20) return;
    updateLocation.mutate({ id, data: { maxSlots: val } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() }) });
  };

  const counterBtnStyle: React.CSSProperties = {
    width: 26, height: 26, borderRadius: "0.375rem",
    background: "hsl(222 47% 12%)", border: "1px solid hsl(217 33% 20%)", color: "hsl(210 40% 70%)",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  };

  return (
    <SectionCard title="สถานที่" description="จัดการสถานที่และตั้งจำนวน Slot สูงสุดต่อวัน">
      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2.5 items-end">
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs font-medium" style={{ color: "hsl(215 20% 55%)" }}>ชื่อสถานที่</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ER, OPD..." style={fieldStyle} data-testid="input-location-name" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium" style={{ color: "hsl(215 20% 55%)" }}>คน/วัน</Label>
          <div className="flex items-center gap-1">
            <button type="button" style={counterBtnStyle} onClick={() => setMaxSlots((v) => Math.max(1, v - 1))}><Minus className="w-3 h-3" /></button>
            <div className="w-8 text-center text-sm font-bold" style={{ color: "hsl(186 100% 65%)" }}>{maxSlots}</div>
            <button type="button" style={counterBtnStyle} onClick={() => setMaxSlots((v) => Math.min(20, v + 1))}><Plus className="w-3 h-3" /></button>
          </div>
        </div>
        <NeonButton type="submit" disabled={createLocation.isPending || !name.trim()} className="w-full sm:w-auto shrink-0">
          <Plus className="w-3.5 h-3.5" /> เพิ่ม
        </NeonButton>
      </form>

      <div className="space-y-2">
        {isLoading ? Array(3).fill(0).map((_, i) => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "hsl(222 47% 10%)" }} />)
          : locations?.length === 0 ? (
            <div className="py-8 text-center text-sm rounded-xl" style={{ color: "hsl(215 20% 38%)", border: "1px dashed hsl(217 33% 18%)" }}>
              ยังไม่มีสถานที่
            </div>
          ) : (
            <AnimatePresence>
              {locations?.map((location) => (
                <motion.div key={location.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                  className="flex items-center justify-between px-3.5 py-2.5 gap-3" style={itemStyle} data-testid={`item-location-${location.id}`}>
                  <span className="font-medium text-sm flex-1 truncate" style={{ color: "hsl(210 40% 88%)" }}>{location.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs mr-0.5" style={{ color: "hsl(215 20% 42%)" }}>คน/วัน</span>
                    <button style={counterBtnStyle} onClick={() => handleSlots(location.id, location.maxSlots - 1)} disabled={location.maxSlots <= 1} data-testid={`button-slot-minus-${location.id}`}><Minus className="w-3 h-3" /></button>
                    <div className="w-7 text-center text-sm font-bold" style={{ color: "hsl(186 100% 65%)" }}>{location.maxSlots}</div>
                    <button style={counterBtnStyle} onClick={() => handleSlots(location.id, location.maxSlots + 1)} disabled={location.maxSlots >= 20} data-testid={`button-slot-plus-${location.id}`}><Plus className="w-3 h-3" /></button>
                  </div>
                  <button className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity" style={{ color: "hsl(0 72% 60%)" }}
                    onClick={() => { deleteLocation.mutate({ id: location.id }, { onSuccess: () => { playRemoveSound(); queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() }); } }); }}
                    data-testid={`button-delete-location-${location.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
      </div>
    </SectionCard>
  );
}

function SchedulesSection() {
  const queryClient = useQueryClient();
  const { data: schedules, isLoading } = useListSchedules();
  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();
  const [title, setTitle] = useState("");
  const [weekLabel, setWeekLabel] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createSchedule.mutate({ data: { title: title.trim(), weekLabel: weekLabel.trim() || undefined } }, {
      onSuccess: () => { playSuccessSound(); setTitle(""); setWeekLabel(""); queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() }); },
    });
  };

  return (
    <SectionCard title="ตารางเวร" description="สร้างแผ่นตารางเวรใหม่สำหรับแต่ละสัปดาห์">
      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2.5 items-end">
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs font-medium" style={{ color: "hsl(215 20% 55%)" }}>ชื่อตารางเวร</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น สัปดาห์แรกของเดือน..." style={fieldStyle} data-testid="input-schedule-title" />
        </div>
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs font-medium" style={{ color: "hsl(215 20% 55%)" }}>ช่วงเวลา (ไม่บังคับ)</Label>
          <Input value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} placeholder="เช่น 1-5 พ.ย." style={fieldStyle} data-testid="input-schedule-week" />
        </div>
        <NeonButton type="submit" disabled={createSchedule.isPending || !title.trim()} className="w-full sm:w-auto shrink-0">
          <Plus className="w-3.5 h-3.5" /> สร้าง
        </NeonButton>
      </form>

      <div className="space-y-2">
        {isLoading ? Array(2).fill(0).map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "hsl(222 47% 10%)" }} />)
          : schedules?.length === 0 ? (
            <div className="py-8 text-center text-sm rounded-xl" style={{ color: "hsl(215 20% 38%)", border: "1px dashed hsl(217 33% 18%)" }}>
              ยังไม่มีตารางเวร
            </div>
          ) : (
            <AnimatePresence>
              {schedules?.map((schedule) => (
                <motion.div key={schedule.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between px-3.5 py-3" style={itemStyle} data-testid={`item-schedule-${schedule.id}`}>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "hsl(210 40% 90%)" }}>{schedule.title}</p>
                    {schedule.weekLabel && <p className="text-xs mt-0.5" style={{ color: "hsl(186 100% 55%)" }}>{schedule.weekLabel}</p>}
                  </div>
                  <button className="p-1.5 rounded-lg opacity-40 hover:opacity-100 transition-opacity" style={{ color: "hsl(0 72% 60%)" }}
                    onClick={() => { deleteSchedule.mutate({ id: schedule.id }, { onSuccess: () => { playRemoveSound(); queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey() }); } }); }}
                    data-testid={`button-delete-schedule-${schedule.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
      </div>
    </SectionCard>
  );
}
