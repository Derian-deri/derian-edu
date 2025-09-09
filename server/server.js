// server/server.js
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import sqlite3 from "sqlite3";
import materiRoutes from "./routes/materi.js";

const app = express();
const PORT = 5000;
const JWT_SECRET = "supersecret"; // ganti pakai .env untuk lebih aman

// === Middleware ===
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// === DB SQLite ===
const db = new sqlite3.Database("./quiz.db");

db.serialize(() => {
  // === Materi ===
  db.run(`
    CREATE TABLE IF NOT EXISTS materi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kelas TEXT,
      bab TEXT,
      title TEXT,
      content TEXT,
      media TEXT  -- simpan JSON string: {images:[], videos:[], audio:[]}
    )
  `);

  // === Quiz ===
  db.run(`
    CREATE TABLE IF NOT EXISTS quiz (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      materiId INTEGER,
      question TEXT,
      options TEXT,   -- array opsi (JSON string)
      answer TEXT,
      FOREIGN KEY (materiId) REFERENCES materi(id) ON DELETE CASCADE
    )
  `);

  // === Users ===
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      avatar TEXT
    )
  `);

  // === Progress ===
  db.run(`
    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      kelas INTEGER,
      module TEXT,
      progress INTEGER DEFAULT 0,
      updatedAt TEXT
    )
  `);

  // === Scores ===
  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      quizId TEXT,
      score INTEGER,
      takenAt TEXT
    )
  `);
});

// === Routes ===
app.use("/materi", materiRoutes);

// --- Helper: auth middleware ---
function auth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ message: "No token" });

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(401).json({ message: "Token invalid" });
    req.user = payload; // { id, email }
    next();
  });
}

// --- Auth: Register ---
app.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Data kurang" });

  const hash = await bcrypt.hash(password, 10);

  db.run(
    "INSERT INTO users(name, email, password) VALUES(?,?,?)",
    [name || "User", email, hash],
    function (err) {
      if (err) return res.status(400).json({ message: "Email sudah terdaftar?" });
      const user = { id: this.lastID, email };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
      res.json({ user, token });
    }
  );
});

// --- Auth: Login ---
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, row) => {
    if (err || !row) return res.status(401).json({ message: "Email tidak ditemukan" });
    const ok = await bcrypt.compare(password, row.password);
    if (!ok) return res.status(401).json({ message: "Password salah" });

    const user = { id: row.id, email: row.email, name: row.name, avatar: row.avatar };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
    res.json({ user, token });
  });
});

// --- Get profile user ---
app.get("/me", auth, (req, res) => {
  db.get(
    "SELECT id, name, email, avatar FROM users WHERE id = ?",
    [req.user.id],
    (err, row) => {
      if (err || !row) return res.status(404).json({ message: "User tidak ditemukan" });
      res.json(row);
    }
  );
});

// --- Progress: list ---
app.get("/progress", auth, (req, res) => {
  db.all("SELECT * FROM progress WHERE userId = ?", [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(rows || []);
  });
});

// --- Progress: upsert ---
app.post("/progress", auth, (req, res) => {
  const { kelas, module, progress } = req.body;
  const now = new Date().toISOString();

  db.get(
    "SELECT id FROM progress WHERE userId = ? AND kelas = ? AND module = ?",
    [req.user.id, kelas, module],
    (err, row) => {
      if (row) {
        db.run(
          "UPDATE progress SET progress = ?, updatedAt = ? WHERE id = ?",
          [progress, now, row.id],
          (err2) => {
            if (err2) return res.status(500).json({ message: "Update gagal" });
            res.json({ message: "updated" });
          }
        );
      } else {
        db.run(
          "INSERT INTO progress(userId, kelas, module, progress, updatedAt) VALUES (?,?,?,?,?)",
          [req.user.id, kelas, module, progress, now],
          function (err2) {
            if (err2) return res.status(500).json({ message: "Insert gagal" });
            res.json({ id: this.lastID });
          }
        );
      }
    }
  );
});

// --- Scores: list ---
app.get("/scores", auth, (req, res) => {
  db.all(
    "SELECT * FROM scores WHERE userId = ? ORDER BY takenAt DESC",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json(rows || []);
    }
  );
});

// --- Scores: insert ---
app.post("/scores", auth, (req, res) => {
  const { quizId, score } = req.body;
  const now = new Date().toISOString();
  db.run(
    "INSERT INTO scores (userId, quizId, score, takenAt) VALUES (?,?,?,?)",
    [req.user.id, quizId, score, now],
    function (err) {
      if (err) return res.status(500).json({ message: "Insert gagal" });
      res.json({ id: this.lastID });
    }
  );
});

app.listen(PORT, () => console.log(`✅ API running http://localhost:${PORT}`));

// Export supaya bisa dipakai di routes/materi.js
export { db, JWT_SECRET };