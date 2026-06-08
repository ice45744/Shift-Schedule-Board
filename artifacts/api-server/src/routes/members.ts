import { Router } from "express";
import { db } from "@workspace/db";
import { membersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateMemberBody,
  DeleteMemberParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/members", async (req, res) => {
  const members = await db.select().from(membersTable).orderBy(membersTable.createdAt);
  res.json(members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

router.post("/members", async (req, res) => {
  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const [member] = await db.insert(membersTable).values(parsed.data).returning();
  res.status(201).json({ ...member, createdAt: member.createdAt.toISOString() });
});

router.delete("/members/:id", async (req, res) => {
  const parsed = DeleteMemberParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid id" });
  }
  await db.delete(membersTable).where(eq(membersTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
