import { Router } from "express";
import { db } from "@workspace/db";
import { locationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateLocationBody,
  DeleteLocationParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/locations", async (req, res) => {
  const locations = await db.select().from(locationsTable).orderBy(locationsTable.createdAt);
  res.json(locations.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })));
});

router.post("/locations", async (req, res) => {
  const parsed = CreateLocationBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }
  const [location] = await db.insert(locationsTable).values(parsed.data).returning();
  res.status(201).json({ ...location, createdAt: location.createdAt.toISOString() });
});

router.delete("/locations/:id", async (req, res) => {
  const parsed = DeleteLocationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid id" });
  }
  await db.delete(locationsTable).where(eq(locationsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
