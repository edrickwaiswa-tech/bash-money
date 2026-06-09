import crypto from "node:crypto";

type TokenSubject =
  | { role: "admin"; id: number; username: string }
  | { role: "member"; id: number; phone: string | null };

type TokenPayload = TokenSubject & {
  exp: number;
};

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function secret(): string {
  return process.env.SESSION_SECRET ?? "sacco-dev-fallback-secret";
}

function signPayload(encodedPayload: string): string {
  return crypto.createHmac("sha256", secret()).update(encodedPayload).digest("base64url");
}

export function issueAuthToken(subject: TokenSubject): string {
  const payload: TokenPayload = {
    ...subject,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyAuthToken(token: string): TokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signPayload(encodedPayload);
  const given = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as TokenPayload;
    if (payload.exp < Date.now()) return null;
    if (payload.role !== "admin" && payload.role !== "member") return null;
    return payload;
  } catch {
    return null;
  }
}
