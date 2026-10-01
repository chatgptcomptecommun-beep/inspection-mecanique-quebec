import { drizzle } from "drizzle-orm/netlify-db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import * as schema from "../../db/schema";
import { json, requireUser } from "../lib/auth";
import { ensureSchema } from "../lib/ensure-schema";
const db = drizzle({ schema });
const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  company: z.string().trim().max(160).optional(),
  email: z.string().email(),
});
const inspectionSchema = z
  .object({
    id: z.string().uuid(),
    reportNumber: z.string().min(8).max(40),
    status: z.enum(["draft", "completed", "cancelled"]),
    date: z.string(),
    reason: z.string().min(1).max(2000),
    client: z
      .object({ firstName: z.string().min(1), lastName: z.string().min(1) })
      .passthrough(),
    vehicle: z
      .object({
        make: z.string(),
        model: z.string(),
        year: z.number().int(),
        plate: z.string(),
        province: z.string(),
        vin: z.string(),
        mileage: z.number().nonnegative(),
        type: z.string(),
      })
      .passthrough(),
    results: z.record(z.string(), z.unknown()),
    recommendations: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();
export default async (request: Request) => {
  try {
    const user = await requireUser();
    await ensureSchema();
    const url = new URL(request.url);
    const path = url.pathname
      .replace(/^.*\/api\/?/, "")
      .split("/")
      .filter(Boolean);
    if (path[0] === "profile") {
      if (request.method === "GET") {
        const [p] = await db
          .select()
          .from(schema.mechanicProfiles)
          .where(eq(schema.mechanicProfiles.ownerId, user.sub))
          .limit(1);
        return json(
          p
            ? {
                firstName: p.firstName,
                lastName: p.lastName,
                company: p.company ?? "",
                email: p.email,
              }
            : {
                firstName: "",
                lastName: "",
                company: "",
                email: user.email ?? "",
              },
        );
      }
      if (request.method === "PUT") {
        const data = profileSchema.parse(await request.json());
        const [record] = await db
          .insert(schema.mechanicProfiles)
          .values({ ownerId: user.sub, ...data })
          .onConflictDoUpdate({
            target: schema.mechanicProfiles.ownerId,
            set: { ...data, updatedAt: new Date() },
          })
          .returning();
        return json({
          firstName: record.firstName,
          lastName: record.lastName,
          company: record.company ?? "",
          email: record.email,
        });
      }
    }
    if (path[0] === "inspections") {
      if (request.method === "GET") {
        const rows = await db
          .select()
          .from(schema.inspections)
          .where(eq(schema.inspections.ownerId, user.sub))
          .orderBy(desc(schema.inspections.updatedAt));
        return json(rows.map((r) => r.payload));
      }
      if (request.method === "POST") {
        const data = inspectionSchema.parse(await request.json());
        const [record] = await db
          .insert(schema.inspections)
          .values({
            id: data.id,
            ownerId: user.sub,
            reportNumber: data.reportNumber,
            status: data.status,
            inspectionDate: new Date(data.date),
            payload: data,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: schema.inspections.id,
            set: {
              status: data.status,
              inspectionDate: new Date(data.date),
              payload: { ...data, updatedAt: new Date().toISOString() },
              updatedAt: new Date(),
            },
          })
          .returning();
        await db
          .insert(schema.auditEvents)
          .values({
            ownerId: user.sub,
            inspectionId: data.id,
            action:
              data.status === "completed"
                ? "inspection_completed"
                : "inspection_saved",
          });
        return json(record.payload);
      }
      if (request.method === "DELETE" && path[1]) {
        const deleted = await db
          .delete(schema.inspections)
          .where(
            and(
              eq(schema.inspections.id, path[1]),
              eq(schema.inspections.ownerId, user.sub),
            ),
          )
          .returning({ id: schema.inspections.id });
        if (!deleted.length)
          return json({ error: "Inspection introuvable." }, 404);
        return json({ ok: true });
      }
    }
    return json({ error: "Route introuvable." }, 404);
  } catch (error) {
    const e = error as { status?: number; issues?: unknown; message?: string };
    console.error(
      "API error",
      e.status ?? 500,
      e.issues ? "validation" : "internal",
    );
    return json(
      {
        error:
          e.status === 401
            ? "Authentification requise."
            : e.issues
              ? "Données invalides."
              : "Une erreur interne est survenue.",
      },
      e.status ?? (e.issues ? 400 : 500),
    );
  }
};
