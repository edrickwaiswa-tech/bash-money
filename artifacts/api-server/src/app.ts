import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { attachBearerAuth } from "./middlewares/bearer-auth";
const PgStore = connectPgSimple(session);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// Trust Replit's reverse proxy so HTTPS cookies work correctly in production
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(
  session({
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: "admin_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET ?? "sacco-dev-fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);

app.use(attachBearerAuth);
app.use("/api", router);

// Serve uploaded files as static assets
const uploadsPath = path.resolve(__dirname, "..", "uploads");
app.use("/api/uploads", express.static(uploadsPath));

export default app;
