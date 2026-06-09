import { type NextFunction, type Request, type Response } from "express";
import { verifyAuthToken } from "../lib/auth-token";

export function attachBearerAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }

  const payload = verifyAuthToken(header.slice("Bearer ".length));
  if (!payload) {
    next();
    return;
  }

  if (payload.role === "admin") {
    req.session.adminId = payload.id;
    req.session.adminUsername = payload.username;
  } else {
    req.session.memberId = payload.id;
    req.session.memberPhone = payload.phone ?? undefined;
  }

  next();
}
