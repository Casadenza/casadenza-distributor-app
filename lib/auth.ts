import jwt from "jsonwebtoken";

export type SessionUser = {
  userId: string;
  role: "DISTRIBUTOR" | "ADMIN";
  distributorId?: string;
};

export function signToken(payload: SessionUser) {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as SessionUser;
  } catch {
    return null;
  }
}
