import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, membersTable, locationsTable, schedulesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateAssignmentParams,
  CreateAssignmentBody,
  DeleteAssignmentParams,
  AutoAssignParams,
  AutoAssignBody,
} from "@workspace/api-zod";

const router = Router();

router.post("/schedules/:scheduleId/auto-assign", async (req, res) => {
  const paramsParsed = AutoAssignParams.safeParse({ scheduleId: Number(req.params.scheduleId) });
  if (!paramsParsed.success) { res.status(400).json({ error: "Invalid scheduleId" }); return; }
  const bodyParsed = AutoAssignBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { scheduleId } = paramsParsed.data;
  const { locationId } = bodyParsed.data;

  const [location] = await db.select().from(locationsTable).where(eq(locationsTable.id, locationId));
  if (!location) { res.status(404).json({ error: "Location not found" }); return; }

  const allMembers = await db.select().from(membersTable).orderBy(membersTable.createdAt);
  if (allMembers.length === 0) { res.status(400).json({ error: "No members to assign" }); return; }

  // Delete existing assignments for this location in this schedule
  await db.delete(assignmentsTable).where(
    and(eq(assignmentsTable.scheduleId, scheduleId), eq(assignmentsTable.locationId, locationId))
  );

  // Shuffle members randomly (each member appears at most once per location/week)
  const shuffled = [...allMembers].sort(() => Math.random() - 0.5);
  const DAYS = [1, 2, 3, 4, 5];
  const maxSlots = location.maxSlots;
  const slots: Array<{ memberId: number; dayOfWeek: number }> = [];

  let memberIndex = 0;
  outer: for (let slot = 0; slot < maxSlots; slot++) {
    for (const day of DAYS) {
      if (memberIndex >= shuffled.length) break outer;
      slots.push({ memberId: shuffled[memberIndex].id, dayOfWeek: day });
      memberIndex++;
    }
  }

  if (slots.length > 0) {
    await db.insert(assignmentsTable).values(
      slots.map((s) => ({ scheduleId, locationId, memberId: s.memberId, dayOfWeek: s.dayOfWeek }))
    );
  }

  // Return full updated schedule detail
  const [schedule] = await db.select().from(schedulesTable).where(eq(schedulesTable.id, scheduleId));
  if (!schedule) { res.status(404).json({ error: "Schedule not found" }); return; }

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
    .where(eq(assignmentsTable.scheduleId, scheduleId));

  res.json({ ...schedule, createdAt: schedule.createdAt.toISOString(), assignments });
});

router.post("/schedules/:scheduleId/assignments", async (req, res) => {
  const paramsParsed = CreateAssignmentParams.safeParse({ scheduleId: Number(req.params.scheduleId) });
  if (!paramsParsed.success) { res.status(400).json({ error: "Invalid scheduleId" }); return; }
  const bodyParsed = CreateAssignmentBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const [assignment] = await db.insert(assignmentsTable).values({
    scheduleId: paramsParsed.data.scheduleId,
    memberId: bodyParsed.data.memberId,
    locationId: bodyParsed.data.locationId,
    dayOfWeek: bodyParsed.data.dayOfWeek,
  }).returning();

  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, assignment.memberId));
  const [location] = await db.select().from(locationsTable).where(eq(locationsTable.id, assignment.locationId));

  res.status(201).json({
    ...assignment,
    memberName: member.name,
    memberColor: member.color,
    locationName: location.name,
  });
});

router.delete("/schedules/:scheduleId/assignments/:id", async (req, res) => {
  const parsed = DeleteAssignmentParams.safeParse({
    scheduleId: Number(req.params.scheduleId),
    id: Number(req.params.id),
  });
  if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }
  await db.delete(assignmentsTable).where(
    and(eq(assignmentsTable.id, parsed.data.id), eq(assignmentsTable.scheduleId, parsed.data.scheduleId))
  );
  res.status(204).send();
});

export default router;
