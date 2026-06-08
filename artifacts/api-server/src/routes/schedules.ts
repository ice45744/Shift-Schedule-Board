import { Router } from "express";
import { db } from "@workspace/db";
import { schedulesTable, assignmentsTable, membersTable, locationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateScheduleBody,
  GetScheduleParams,
  DeleteScheduleParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/schedules", async (req, res) => {
  const schedules = await db.select().from(schedulesTable).orderBy(schedulesTable.createdAt);
  res.json(schedules.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.post("/schedules", async (req, res) => {
  const parsed = CreateScheduleBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const [schedule] = await db.insert(schedulesTable).values(parsed.data).returning();
  res.status(201).json({ ...schedule, createdAt: schedule.createdAt.toISOString() });
});

router.get("/schedules/:id", async (req, res) => {
  const parsed = GetScheduleParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const [schedule] = await db
    .select()
    .from(schedulesTable)
    .where(eq(schedulesTable.id, parsed.data.id));

  if (!schedule) {
    return res.status(404).json({ error: "Schedule not found" });
  }

  const assignments = await db
    .select({
      id: assignmentsTable.id,
      scheduleId: assignmentsTable.scheduleId,
      memberId: assignmentsTable.memberId,
      locationId: assignmentsTable.locationId,
      dayOfWeek: assignmentsTable.dayOfWeek,
      memberName: membersTable.name,
      memberColor: membersTable.color,
      locationName: locationsTable.name,
    })
    .from(assignmentsTable)
    .innerJoin(membersTable, eq(assignmentsTable.memberId, membersTable.id))
    .innerJoin(locationsTable, eq(assignmentsTable.locationId, locationsTable.id))
    .where(eq(assignmentsTable.scheduleId, parsed.data.id));

  res.json({
    ...schedule,
    createdAt: schedule.createdAt.toISOString(),
    assignments,
  });
});

router.delete("/schedules/:id", async (req, res) => {
  const parsed = DeleteScheduleParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid id" });
  }
  await db.delete(schedulesTable).where(eq(schedulesTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
