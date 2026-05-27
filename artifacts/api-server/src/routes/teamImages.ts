import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const router = Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "team-images");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, _file, cb) => {
    const ext = _file.originalname.split(".").pop() ?? "jpg";
    cb(null, `${crypto.randomUUID()}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB per image
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

/* POST /api/teams/images — upload one image, returns { url, filename } */
router.post("/teams/images", upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file received" });
    return;
  }
  const filename = req.file.filename;
  const protocol = req.headers["x-forwarded-proto"] ?? req.protocol;
  const host = req.headers["x-forwarded-host"] ?? req.get("host") ?? "";
  const base = `${protocol}://${host}`;
  const url = `${base}/api/teams/images/${filename}`;
  res.json({ url, filename });
});

/* GET /api/teams/images/:filename — serve stored image */
router.get("/teams/images/:filename", (req, res) => {
  const filename = path.basename(req.params["filename"] ?? "");
  if (!filename) { res.status(400).end(); return; }

  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(filePath);
});

export default router;
