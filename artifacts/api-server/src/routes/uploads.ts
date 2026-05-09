import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { db, membersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, "..", "..", "uploads");

function diskStorage(subfolder: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(uploadsRoot, subfolder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".png";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
}

const picUpload = multer({
  storage: diskStorage("profile-pictures"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\//.test(file.mimetype));
  },
});

const sigUpload = multer({
  storage: diskStorage("signatures"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\//.test(file.mimetype));
  },
});

const router = Router();

// POST /members/:memberId/upload/profile-picture
router.post(
  "/members/:memberId/upload/profile-picture",
  requireAdmin,
  picUpload.single("file"),
  async (req: any, res: any): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      const memberId = Number(req.params.memberId);
      const url = `/api/uploads/profile-pictures/${req.file.filename}`;
      await db
        .update(membersTable)
        .set({ profilePictureUrl: url })
        .where(eq(membersTable.id, memberId));
      res.json({ url });
    } catch (err: any) {
      req.log.error({ err }, "uploadProfilePicture error");
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

// POST /members/:memberId/upload/signature
router.post(
  "/members/:memberId/upload/signature",
  requireAdmin,
  sigUpload.single("file"),
  async (req: any, res: any): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      const memberId = Number(req.params.memberId);
      const url = `/api/uploads/signatures/${req.file.filename}`;
      await db
        .update(membersTable)
        .set({ signatureUrl: url })
        .where(eq(membersTable.id, memberId));
      res.json({ url });
    } catch (err: any) {
      req.log.error({ err }, "uploadSignature error");
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

// POST /members/:memberId/upload/signature-data  (base64 data URL from canvas)
router.post(
  "/members/:memberId/upload/signature-data",
  requireAdmin,
  async (req: any, res: any): Promise<void> => {
    try {
      const { dataUrl } = req.body as { dataUrl: string };
      if (!dataUrl?.startsWith("data:image/")) {
        res.status(400).json({ error: "Invalid image data" });
        return;
      }
      const memberId = Number(req.params.memberId);
      const base64 = dataUrl.split(",")[1];
      const buf = Buffer.from(base64, "base64");
      const dir = path.join(uploadsRoot, "signatures");
      fs.mkdirSync(dir, { recursive: true });
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      fs.writeFileSync(path.join(dir, filename), buf);
      const url = `/api/uploads/signatures/${filename}`;
      await db
        .update(membersTable)
        .set({ signatureUrl: url })
        .where(eq(membersTable.id, memberId));
      res.json({ url });
    } catch (err: any) {
      req.log.error({ err }, "uploadSignatureData error");
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

// POST /members/:memberId/upload/profile-picture-data  (base64 for member self-service)
router.post(
  "/members/:memberId/upload/profile-picture-data",
  requireAdmin,
  async (req: any, res: any): Promise<void> => {
    try {
      const { dataUrl } = req.body as { dataUrl: string };
      if (!dataUrl?.startsWith("data:image/")) {
        res.status(400).json({ error: "Invalid image data" });
        return;
      }
      const memberId = Number(req.params.memberId);
      const base64 = dataUrl.split(",")[1];
      const buf = Buffer.from(base64, "base64");
      const dir = path.join(uploadsRoot, "profile-pictures");
      fs.mkdirSync(dir, { recursive: true });
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
      fs.writeFileSync(path.join(dir, filename), buf);
      const url = `/api/uploads/profile-pictures/${filename}`;
      await db
        .update(membersTable)
        .set({ profilePictureUrl: url })
        .where(eq(membersTable.id, memberId));
      res.json({ url });
    } catch (err: any) {
      req.log.error({ err }, "uploadProfilePictureData error");
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

export default router;
