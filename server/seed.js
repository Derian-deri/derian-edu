// seed.js
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const db = new sqlite3.Database("./quiz.db");

async function seed() {
  const hash = await bcrypt.hash("123456", 10); // password default user

  db.serialize(() => {
    // --- Seed user ---
    db.run(
      "INSERT OR IGNORE INTO users(name, email, password) VALUES (?,?,?)",
      ["Derian", "derian@mail.com", hash],
      (err) => {
        if (err) console.log("Seed error (user):", err.message);
        else console.log("User seeded: derian@mail.com / 123456");
      }
    );

    // --- Seed materi ---
    db.run(
      `CREATE TABLE IF NOT EXISTS materi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        judul TEXT,
        konten TEXT
      )`
    );

    db.run(
      `INSERT OR IGNORE INTO materi (id, judul, konten) VALUES
        (1, 'Pengenalan HTML', 'HTML adalah bahasa dasar untuk membuat struktur halaman web.'),
        (2, 'CSS Dasar', 'CSS digunakan untuk mempercantik tampilan web.'),
        (3, 'JavaScript Dasar', 'JavaScript membuat web lebih interaktif.')`
    , (err) => {
      if (err) console.log("Seed error (materi):", err.message);
      else console.log("Materi seeded");
    });

    // --- Seed quiz ---
    db.run(
      `CREATE TABLE IF NOT EXISTS quiz (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pertanyaan TEXT,
        opsiA TEXT,
        opsiB TEXT,
        opsiC TEXT,
        jawaban TEXT
      )`
    );

    db.run(
      `INSERT OR IGNORE INTO quiz (id, pertanyaan, opsiA, opsiB, opsiC, jawaban) VALUES
        (1, 'Apa kepanjangan dari HTML?', 'Hyper Trainer Marking Language', 'Hyper Text Markup Language', 'High Text Machine Language', 'B'),
        (2, 'CSS digunakan untuk apa?', 'Struktur halaman', 'Gaya tampilan', 'Database', 'B'),
        (3, 'JavaScript digunakan untuk?', 'Memberi interaktivitas', 'Menyimpan data', 'Mendefinisikan server', 'A')`
    , (err) => {
      if (err) console.log("Seed error (quiz):", err.message);
      else console.log("Quiz seeded");
    });
  });

  db.close();
}

seed();