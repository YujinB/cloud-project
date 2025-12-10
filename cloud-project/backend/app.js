require("dotenv").config();
const express = require("express");
const AWS = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const mysql = require("mysql2");
const os = require("os");  
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

// 1) region만 설정
AWS.config.update({
  region: "ap-northeast-2",
});

// 2) credentials는 EC2 IAM Role에서 자동으로 가져오게 둠
const s3 = new AWS.S3();

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    acl: "public-read",
    key: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname);
    }
  })
});

let visitCount = 0;
const recentRequests = []; // 최근 요청 기록

function pushRequestLog(path) {
  recentRequests.unshift({
    path,
    server: os.hostname(),
    time: new Date().toISOString(),
    visitCount,
  });
  if (recentRequests.length > 20) recentRequests.pop(); // 20개만 보관
}

// 기본 라우트: 서버 식별 정보
app.get("/", (req, res) => {
  pushRequestLog("/");
  res.json({
    message: "Cloud project backend server is running!",
    server: os.hostname(),
    visitCount,
    time: new Date().toISOString(),
  });
});

// ALB Health Check용 심플 엔드포인트
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// visit 카운트 (인스턴스별)
app.get("/visit", (req, res) => {
  visitCount += 1;
  pushRequestLog("/visit");

  const server = os.hostname();
  const time = new Date().toISOString();
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  // DB에 방문 로그 저장
  db.query(
    "INSERT INTO visit_log (server_hostname, client_ip, visited_at, visit_count) VALUES (?, ?, NOW(), ?)",
    [server, clientIp, visitCount],
    (err) => {
      if (err) {
        console.error("visit_log insert 실패:", err);
      }
    }
  );

  console.log("visit 호출, 현재 카운트:", visitCount);
  res.json({
    visit_count: visitCount,
    server,
    time,
  });
});

// 전체 요약 정보 조회
app.get("/stats/summary", (req, res) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM visit_log) AS total_visits,
      (SELECT COUNT(DISTINCT client_ip) FROM visit_log) AS unique_visitors,
      (SELECT COUNT(DISTINCT server_hostname) FROM visit_log WHERE visited_at >= NOW() - INTERVAL 10 MINUTE) AS current_servers,
      (SELECT COUNT(*) FROM uploaded_image) AS image_count
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("summary 조회 실패:", err);
      return res.status(500).json({ error: "DB error" });
    }
    res.json(rows[0]);
  });
});

// 서버별 트래픽 통계 (최근 10분, 1분 단위)
app.get("/stats/traffic", (req, res) => {
  const sql = `
    SELECT 
      DATE_FORMAT(visited_at, '%Y-%m-%d %H:%i:00') AS minute,
      server_hostname,
      COUNT(*) AS cnt
    FROM visit_log
    WHERE visited_at >= NOW() - INTERVAL 10 MINUTE
    GROUP BY minute, server_hostname
    ORDER BY minute ASC, server_hostname ASC
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error("traffic 조회 실패:", err);
      return res.status(500).json({ error: "DB error" });
    }
    res.json(rows);
  });
});

// 메모 저장
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
      pushRequestLog("/memo(POST)");
      res.json({ ok: true, id: result.insertId });
    }
  );
});

// 메모 조회
app.get("/memo", (req, res) => {
  db.query("SELECT * FROM memo ORDER BY id DESC", (err, rows) => {
    if (err) {
      console.error("메모 조회 실패:", err);
      return res.status(500).json({ error: "DB select error" });
    }
    pushRequestLog("/memo(GET)");
    res.json(rows);
  });
});

// 최근 요청 리스트 (시각화)
app.get("/recent-requests", (req, res) => {
  res.json(recentRequests);
});

app.post("/uploadPhoto", upload.single("image"), (req, res) => {
  console.log("📌 /uploadPhoto 요청 도착, req.file =", req.file);

  // 1) 파일이 아예 안 온 경우 방어
  if (!req.file) {
    console.error("⚠ 업로드된 파일이 없음");
    return res.status(400).json({ error: "파일(image)이 없습니다" });
  }

  const imageUrl = req.file.location;  // 여기서부터는 req.file 존재 보장

  db.query(
    "INSERT INTO uploaded_image (image_url, uploaded_at) VALUES (?, NOW())",
    [imageUrl],
    (err) => {
      if (err) {
        console.error("이미지 DB 저장 실패:", err);
        return res.status(500).json({ error: "DB insert error" });
      }

      console.log("✅ 이미지 업로드 성공:", imageUrl);
      return res.json({ imageUrl }); 
    }
  );
});

app.get("/images", (req, res) => {
  db.query("SELECT * FROM uploaded_image ORDER BY id DESC", (err, rows) => {
    if (err) {
      console.error("이미지 목록 조회 실패:", err);
      return res.status(500).json({ error: "DB select error" });
    }
    res.json(rows);
  });
});

app.use((err, req, res, next) => {
  console.error("서버 내부 에러:", err);
  res.status(500).json({ error: "server error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});