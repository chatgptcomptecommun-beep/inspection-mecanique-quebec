export interface IdentityUser{sub:string;email?:string}
export function requireUser(context:unknown):IdentityUser{const user=(context as {clientContext?:{user?:IdentityUser}})?.clientContext?.user;if(!user?.sub)throw Object.assign(new Error('Authentification requise.'),{status:401});return user}
export const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});

