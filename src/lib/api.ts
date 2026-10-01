import type { Inspection, InspectionPhoto, MechanicProfile } from "../types";
import netlifyIdentity from "netlify-identity-widget";

const authHeaders = async (): Promise<Record<string, string>> => {
  if (!netlifyIdentity.currentUser()) return {};
  try {
    const token = await netlifyIdentity.refresh();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    const token = netlifyIdentity.currentUser()?.token?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};
const request = async <T>(path: string, options: RequestInit = {}) => {
  const authentication = await authHeaders();
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authentication,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ error: "Une erreur est survenue." }));
    throw new Error(body.error || "Une erreur est survenue.");
  }
  return response.json() as Promise<T>;
};
export const api = {
  profile: () => request<MechanicProfile>("profile"),
  saveProfile: (data: MechanicProfile) =>
    request<MechanicProfile>("profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  inspections: () => request<Inspection[]>("inspections"),
  saveInspection: (data: Inspection) =>
    request<Inspection>("inspections", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteInspection: (id: string) =>
    request<void>(`inspections/${id}`, { method: "DELETE" }),
  uploadPhoto: async (inspectionId: string, itemId: string, file: File) => {
    const authentication = await authHeaders();
    const response = await fetch(
      `/api/photos?inspectionId=${encodeURIComponent(inspectionId)}&itemId=${encodeURIComponent(itemId)}`,
      {
        method: "POST",
        headers: { ...authentication, "Content-Type": file.type },
        body: file,
      },
    );
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Envoi de la photo impossible.");
    return { ...body, itemId, mimeType: file.type, name: file.name } as InspectionPhoto;
  },
  photoBlob: async (inspectionId: string, key: string) => {
    const authentication = await authHeaders();
    const response = await fetch(
      `/api/photos?inspectionId=${encodeURIComponent(inspectionId)}&id=${encodeURIComponent(key)}`,
      { headers: authentication },
    );
    if (!response.ok) throw new Error("Photo inaccessible.");
    return response.blob();
  },
  deletePhoto: async (inspectionId: string, key: string) => {
    const authentication = await authHeaders();
    const response = await fetch(
      `/api/photos?inspectionId=${encodeURIComponent(inspectionId)}&id=${encodeURIComponent(key)}`,
      { method: "DELETE", headers: authentication },
    );
    if (!response.ok) throw new Error("Suppression de la photo impossible.");
  },
};
