import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import Database from "better-sqlite3";
import cors from "cors";

const __dirname = path.resolve();
const UPLOADS_DIR = path.join(__dirname, "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Initialize Database
const db = new Database("gallery.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mimetype TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  
  // Serve uploads statically
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Multer configuration
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only images are allowed"));
      }
    }
  });

  // API Routes
  app.get("/api/photos", (req, res) => {
    try {
      const photos = db.prepare("SELECT * FROM photos ORDER BY created_at DESC").all();
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  app.post("/api/photos", upload.single("photo"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { filename, originalname, mimetype, size } = req.file;
      const info = db.prepare(
        "INSERT INTO photos (filename, original_name, mimetype, size) VALUES (?, ?, ?, ?)"
      ).run(filename, originalname, mimetype, size);

      const newPhoto = db.prepare("SELECT * FROM photos WHERE id = ?").get(info.lastInsertRowid);
      res.status(201).json(newPhoto);
    } catch (error) {
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.delete("/api/photos/:id", (req, res) => {
    try {
      const { id } = req.params;
      const photo = db.prepare("SELECT * FROM photos WHERE id = ?").get(id) as any;

      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      // Delete file
      const filePath = path.join(UPLOADS_DIR, photo.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from DB
      db.prepare("DELETE FROM photos WHERE id = ?").run(id);
      res.json({ message: "Photo deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
