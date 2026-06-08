import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, membersTable, locationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateAssignmentParams, CreateAssignmentBody, DeleteAssignmentParams } from "@workspace/api-zod";

const router = Router();

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

  res.status(201).json({ ...assignment, memberName: member.name, memberColor: member.color, locationName: location.name });
});

router.delete("/schedules/:scheduleId/assignments/:id", async (req, res) => {
  const parsed = DeleteAssignmentParams.safeParse({ scheduleId: Number(req.params.scheduleId), id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid params" }); return; }
  await db.delete(assignmentsTable).where(
    and(eq(assignmentsTable.id, parsed.data.id), eq(assignmentsTable.scheduleId, parsed.data.scheduleId))
  );
  res.status(204).send();
});

export default router;
