import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import authRoutes from "./routes/auth.js";
import materiRoutes from "./routes/materi.js";
import subjectsRoutes from "./routes/subjects.js"; // ✅ import baru

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./database.db");

// ==================
// DB setup
// ==================
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'siswa'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS materi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judul TEXT,
      konten TEXT,
      subjectId INTEGER,
      FOREIGN KEY(subjectId) REFERENCES subjects(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT
    )
  `);
});

// ==================
// Routes
// ==================
app.use("/auth", authRoutes);
app.use("/materi", materiRoutes);
app.use("/subjects", subjectsRoutes); // ✅ mounting route baru

// ==================
// Start server
// ==================
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});