import express from "express";
import sqlite3 from "sqlite3";

const router = express.Router();
const db = new sqlite3.Database("./database.db");

// Tambah subject baru
router.post("/", (req, res) => {
  const { name, description } = req.body;
  const createdAt = new Date().toISOString();
  db.run(
    `INSERT INTO subjects (name, description, createdAt) VALUES (?, ?, ?)`,
    [name, description, createdAt],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, description, createdAt });
    }
  );
});

// Ambil semua subjects
router.get("/", (req, res) => {
  db.all(`SELECT * FROM subjects`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Ambil subject by ID
router.get("/:id", (req, res) => {
  db.get(`SELECT * FROM subjects WHERE id = ?`, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Subject not found" });
    res.json(row);
  });
});

// Update subject
router.put("/:id", (req, res) => {
  const { name, description } = req.body;
  db.run(
    `UPDATE subjects SET name = ?, description = ? WHERE id = ?`,
    [name, description, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
    }
  );
});

// Hapus subject
router.delete("/:id", (req, res) => {
  db.run(`DELETE FROM subjects WHERE id = ?`, [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

export default router;