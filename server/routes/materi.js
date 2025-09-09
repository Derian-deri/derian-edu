import express from "express";
import { db } from "../server.js";
import multer from "multer";
import path from "path";

// === konfigurasi upload lokal ===
const uploadDir = path.resolve("./uploads");
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});
const upload = multer({ storage });

const router = express.Router();

/* ---------- BAB ---------- */
router.get("/bab", (req, res) => {
  const { kelas } = req.query;
  const sql = kelas ? "SELECT * FROM bab WHERE kelas = ?" : "SELECT * FROM bab";
  const params = kelas ? [kelas] : [];
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error bab" });
    res.json(rows || []);
  });
});

router.post("/bab", (req, res) => {
  const { kelas, nama } = req.body;
  db.run(
    "INSERT INTO bab (kelas, nama) VALUES (?,?)",
    [kelas, nama],
    function (err) {
      if (err) return res.status(500).json({ message: "Gagal tambah bab" });
      res.json({ id: this.lastID });
    }
  );
});

/* ---------- MATERI ---------- */
// daftar materi per kelas/bab
router.get("/", (req, res) => {
  const { kelas, babId } = req.query;
  let sql = "SELECT * FROM materi WHERE 1=1";
  const params = [];
  if (kelas) { sql += " AND kelas = ?"; params.push(kelas); }
  if (babId) { sql += " AND babId = ?"; params.push(babId); }
  db.all(sql + " ORDER BY createdAt DESC", params, (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error materi" });
    res.json(rows || []);
  });
});

// detail materi
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM materi WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (!row) return res.status(404).json({ message: "Materi tidak ditemukan" });

    // ambil lampiran
    db.all("SELECT * FROM materi_files WHERE materiId = ?", [id], (err2, files) => {
      if (err2) return res.status(500).json({ message: "DB error file" });
      res.json({ ...row, files: files || [] });
    });
  });
});

// tambah/ubah/hapus materi
router.post("/", (req, res) => {
  const { kelas, babId, judul, konten, coverImage, authorId } = req.body;
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO materi (kelas, babId, judul, konten, coverImage, authorId, createdAt, updatedAt)
     VALUES (?,?,?,?,?,?,?,?)`,
    [kelas, babId || null, judul, konten || "", coverImage || "", authorId || null, now, now],
    function (err) {
      if (err) return res.status(500).json({ message: "Gagal insert materi" });
      res.json({ id: this.lastID });
    }
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { kelas, babId, judul, konten, coverImage } = req.body;
  const now = new Date().toISOString();
  db.run(
    `UPDATE materi SET kelas=?, babId=?, judul=?, konten=?, coverImage=?, updatedAt=?
     WHERE id = ?`,
    [kelas, babId || null, judul, konten || "", coverImage || "", now, id],
    function (err) {
      if (err) return res.status(500).json({ message: "Gagal update materi" });
      res.json({ changed: this.changes });
    }
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM materi WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ message: "Gagal hapus materi" });
    res.json({ deleted: this.changes });
  });
});

/* ---------- UPLOAD LAMPIRAN ---------- */
// upload file → kembalikan URL untuk disimpan
router.post("/upload", upload.single("file"), (req, res) => {
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// simpan relasi file ke materi
router.post("/:id/files", (req, res) => {
  const { id } = req.params;
  const { type, url, title } = req.body;
  db.run(
    "INSERT INTO materi_files (materiId, type, url, title) VALUES (?,?,?,?)",
    [id, type, url, title || ""],
    function (err) {
      if (err) return res.status(500).json({ message: "Gagal simpan file" });
      res.json({ id: this.lastID });
    }
  );
});

export default router;