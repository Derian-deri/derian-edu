// server/routes/subjects.js
import express from "express";
import { db } from "../server.js";
const router = express.Router();

// Ambil semua subject
router.get("/", (req, res) => {
  db.all("SELECT * FROM subjects ORDER BY id DESC", [], (err, rows) => {
    if (err) {
      console.error("DB error (subjects):", err);
      return res.status(500).json({ message: "Gagal mengambil subjects" });
    }
    res.json(rows || []);
  });
});

// Buat subject baru (protected) - kita akan gunakan auth middleware di server.js saat mounting route
router.post("/", (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: "Nama subject wajib diisi" });

  db.run(
    "INSERT INTO subjects (name, description, createdAt) VALUES (?,?,?)",
    [name, description || "", new Date().toISOString()],
    function (err) {
      if (err) {
        console.error("DB error insert subject:", err);
        return res.status(500).json({ message: "Gagal menyimpan subject" });
      }
      db.get("SELECT * FROM subjects WHERE id = ?", [this.lastID], (e, row) => {
        if (e) return res.status(500).json({ message: "Gagal mengambil subject" });
        res.json(row);
      });
    }
  );
});

export default router;