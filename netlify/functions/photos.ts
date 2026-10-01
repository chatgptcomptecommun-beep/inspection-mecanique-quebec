import { getStore } from "@netlify/blobs";
import { json, requireUser } from "../lib/auth";
const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxSize = 5 * 1024 * 1024;
export default async (request: Request, context: unknown) => {
  try {
    const user = requireUser(context);
    const url = new URL(request.url);
    const inspectionId = url.searchParams.get("inspectionId");
    if (!inspectionId || !/^[0-9a-f-]{36}$/i.test(inspectionId))
      return json({ error: "Inspection invalide." }, 400);
    const store = getStore("inspection-photos");
    if (request.method === "POST") {
      const itemId = url.searchParams.get("itemId")?.trim();
      if (!itemId || itemId.length > 180)
        return json({ error: "Élément d’inspection invalide." }, 400);
      const file = await request.blob();
      const mime = request.headers.get("content-type") || "";
      if (!allowed.has(mime) || file.size > maxSize)
        return json({ error: "Image invalide ou supérieure à 5 Mo." }, 400);
      const id = crypto.randomUUID();
      const key = `${user.sub}/${inspectionId}/${id}`;
      await store.set(key, file, {
        metadata: { ownerId: user.sub, inspectionId, itemId, mime },
      });
      return json({ id, key: `${inspectionId}/${id}`, itemId, mimeType: mime }, 201);
    }
    if (request.method === "GET") {
      const id = url.searchParams.get("id");
      if (!id || !id.startsWith(`${inspectionId}/`))
        return json({ error: "Photo invalide." }, 400);
      const blob = await store.get(`${user.sub}/${id}`, { type: "blob" });
      if (!blob) return json({ error: "Photo introuvable." }, 404);
      return new Response(blob, {
        headers: {
          "Content-Type": blob.type || "application/octet-stream",
          "Cache-Control": "private, max-age=300",
        },
      });
    }
    if (request.method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id || !id.startsWith(`${inspectionId}/`))
        return json({ error: "Photo invalide." }, 400);
      await store.delete(`${user.sub}/${id}`);
      return json({ ok: true });
    }
    return json({ error: "Méthode interdite." }, 405);
  } catch (error) {
    const status = (error as { status?: number }).status ?? 500;
    return json(
      {
        error:
          status === 401
            ? "Authentification requise."
            : "Une erreur interne est survenue.",
      },
      status,
    );
  }
};
