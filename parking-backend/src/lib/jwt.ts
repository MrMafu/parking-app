import { SignJWT, jwtVerify } from "jose";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export type AuthPayload = {
  sub: string;
  username: string;
  roleId: number;
  roleName: string;
};

export async function signAccessToken(payload: AuthPayload) {
  return await new SignJWT({
    username: payload.username,
    roleId: payload.roleId,
    roleName: payload.roleName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, secret);

  return {
    userId: payload.sub as string,
    username: payload.username as string,
    roleId: payload.roleId as number,
    roleName: payload.roleName as string,
  };
}