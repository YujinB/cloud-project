require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const app = express();
const PORT = 3000;

app.use(express.json());

// RDS 연결
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

db.connect((err) => {
  if (err) {
    console.error("RDS 연결 실패:", err);
  } else {
    console.log("RDS(MySQL) 연결 성공");
  }
});

let visitCount = 0;

app.get("/", (req, res) => {
  res.send("Cloud project backend server is running!");
});

app.get("/visit", (req, res) => {
  visitCount += 1;
  console.log("visit 호출, 현재 카운트:", visitCount);
  res.json({ visit_count: visitCount });
});


app.post("/memo", (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: "content가 비어 있음" });
  }

  db.query(
    "INSERT INTO memo (content, created_at) VALUES (?, NOW())",
    [content],
    (err, result) => {
      if (err) {
        console.error("메모 저장 실패:", err);
        return res.status(500).json({ error: "DB insert error" });
      }
      console.log("메모 저장 완료, id =", result.insertId);
      res.json({ ok: true, id: result.insertId });
    }
  );
});

app.get("/memo", (req, res) => {
  db.query("SELECT * FROM memo ORDER BY id DESC", (err, rows) => {
    if (err) {
      console.error("메모 조회 실패:", err);
      return res.status(500).json({ error: "DB select error" });
    }
    res.json(rows);
  });
});

app.use((err, req, res, next) => {
  console.error("서버 내부 에러:", err);
  res.status(500).json({ error: "server error" });
});

app.post("/uploadPhoto", (req, res) => {
  res.json({ message: "사진 업로드는 추후 S3 연결" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});