import { Router } from "express";
import { db } from "@workspace/db";
import { locationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateLocationBody, DeleteLocationParams, UpdateLocationParams, UpdateLocationBody } from "@workspace/api-zod";

const router = Router();

router.get("/locations", async (_req, res) => {
  const locations = await db.select().from(locationsTable).orderBy(locationsTable.createdAt);
  res.json(locations.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })));
});

router.post("/locations", async (req, res) => {
  const parsed = CreateLocationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [location] = await db.insert(locationsTable).values(parsed.data).returning();
  res.status(201).json({ ...location, createdAt: location.createdAt.toISOString() });
});

router.patch("/locations/:id", async (req, res) => {
  const paramsParsed = UpdateLocationParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateLocationBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
  const [location] = await db
    .update(locationsTable)
    .set(bodyParsed.data)
    .where(eq(locationsTable.id, paramsParsed.data.id))
    .returning();
  if (!location) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...location, createdAt: location.createdAt.toISOString() });
});

router.delete("/locations/:id", async (req, res) => {
  const parsed = DeleteLocationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(locationsTable).where(eq(locationsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
