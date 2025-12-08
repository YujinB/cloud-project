const express = require("express");
const app = express();

app.use(express.json());

let visitCount = 0;
let memos = [];

app.get("/", (req, res) => {
  res.send("Cloud project backend server is running!");
});

app.get("/visit", (req, res) => {
  visitCount += 1;
  res.json({ visit_count: visitCount });
});

app.post("/memo", (req, res) => {
  const { content } = req.body;
  memos.push({ content, created_at: new Date() });
  res.json({ ok: true });
});

app.get("/memo", (req, res) => {
  res.json(memos);
});

app.post("/uploadPhoto", (req, res) => {
  res.json({ message: "사진 업로드는 추후 S3 연결" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});