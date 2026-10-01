import { getUser } from "@netlify/identity";

export interface IdentityUser { sub: string; email?: string }

export async function requireUser(): Promise<IdentityUser> {
  const user = await getUser();
  if (!user?.id)
    throw Object.assign(new Error("Authentification requise."), { status: 401 });
  return { sub: user.id, email: user.email };
}
export const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});

