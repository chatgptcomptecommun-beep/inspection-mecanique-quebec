import type { Inspection, MechanicProfile } from "../types";
const request = async <T>(path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("nf_jwt");
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
};
