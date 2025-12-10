import React, { useEffect, useRef, useState } from "react";
import { API_BASE } from "./apiConfig";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function LoadBalanceDashboard() {
  const [servers, setServers] = useState({});
  const [logs, setLogs] = useState([]);
  const [trafficData, setTrafficData] = useState([]);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const [summary, setSummary] = useState({
    total_visits: 0,
    unique_visitors: 0,
    current_servers: 0,
    image_count: 0,
  });

  const [images, setImages] = useState([]);
  const [memoInput, setMemoInput] = useState("");
  const [memoList, setMemoList] = useState([]);

  // ---- 요약 카드 ----
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const res = await fetch(`${API_BASE}/stats/summary`);
        if (!res.ok) return;
        const data = await res.json();
        setSummary(data);
      } catch (e) {
        console.error("summary 조회 실패:", e);
      }
    };

    loadSummary();
    const id = setInterval(loadSummary, 5000);
    return () => clearInterval(id);
  }, []);

  // ---- 서버별 트래픽 그래프 ----
  useEffect(() => {
    const loadTraffic = async () => {
      try {
        const res = await fetch(`${API_BASE}/stats/traffic`);
        if (!res.ok) return;
        const rows = await res.json();

        const byMinute = {};
        for (const row of rows) {
          const key = row.minute;
          if (!byMinute[key]) byMinute[key] = { minute: key };
          byMinute[key][row.server_hostname] = row.cnt;
        }
        setTrafficData(Object.values(byMinute));
      } catch (e) {
        console.error("traffic 조회 실패:", e);
      }
    };

    loadTraffic();
    const id = setInterval(loadTraffic, 5000);
    return () => clearInterval(id);
  }, []);

  const trafficServerKeys = Array.from(
    new Set(
      trafficData.flatMap((row) =>
        Object.keys(row).filter((k) => k !== "minute")
      )
    )
  );

  // ---- 이미지 ----
  useEffect(() => {
  const loadImages = async () => {
    try {
      const res = await fetch(`${API_BASE}/images`);
      if (!res.ok) return;
      const data = await res.json();
      setImages(data);
    } catch (e) {
      console.error("이미지 리스트 조회 실패:", e);
    }
  };
  loadImages();
}, []);

  // ---- /visit 부하 발생 ----
  const startLoad = () => {
    if (intervalRef.current) return;
    setRunning(true);
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/visit`);
        const data = await res.json();
        const { server, visit_count, time } = data;

        setServers((prev) => {
          const prevInfo = prev[server] || {
            hits: 0,
            lastVisitCount: 0,
            lastTime: null,
          };
          return {
            ...prev,
            [server]: {
              hits: prevInfo.hits + 1,
              lastVisitCount: visit_count,
              lastTime: time,
            },
          };
        });
      } catch (e) {
        console.error("visit 호출 실패:", e);
      }
    }, 500);
  };

  const stopLoad = () => {
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // ---- 최근 요청 로그 ----
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/recent-requests`);
        const data = await res.json();
        setLogs(data);
      } catch (e) {
        console.error("recent-requests 조회 실패:", e);
      }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const serverList = Object.entries(servers);

  const loadMemo = async () => {
    try {
        const res = await fetch(`${API_BASE}/memo`);
        const data = await res.json();
        setMemoList(data);
    } catch (e) {
        console.error("메모 조회 실패:", e);
    }
    };

    const saveMemo = async () => {
    if (!memoInput.trim()) return;

    try {
        await fetch(`${API_BASE}/memo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: memoInput }),
        });
        setMemoInput("");
        loadMemo();
    } catch (e) {
        console.error("메모 저장 실패:", e);
    }
    };

    // 첫 로드시 메모 목록 불러오기
    useEffect(() => {
    loadMemo();
    }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f5fb",
        padding: "24px 0",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 16px 40px",
        }}
      >
        <header style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>
            기록장 대시보드
          </h1>
          <p style={{ color: "#666", fontSize: "14px" }}>
            메모 및 이미지 업로드가 가능합니다.
          </p>
        </header>

        {/* 요약 카드 */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <SummaryCard title="전체 방문 수" value={summary.total_visits} />
          <SummaryCard title="유니크 방문자 수" value={summary.unique_visitors} />
          <SummaryCard
            title="현재 감지된 서버 수 (최근 10분)"
            value={summary.current_servers}
          />
          <SummaryCard title="업로드된 이미지 수" value={summary.image_count} />
        </section>

        {/* 메모 기록 */}
    <section style={sectionStyle}>
    <h2 style={sectionTitleStyle}>메모 기록</h2>

    <div
        style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        marginBottom: "12px",
        }}
    >
        <input
        value={memoInput}
        onChange={(e) => setMemoInput(e.target.value)}
        placeholder="메모 입력..."
        style={inputStyle}
        />
        <button
        onClick={saveMemo}
        style={{ ...buttonStyle, background: "#4c6fff", color: "white" }}
        >
        저장
        </button>
    </div>

    <StyledTable headers={["ID", "내용", "작성 시간"]}>
        {memoList.map((memo) => (
        <tr key={memo.id}>
            <td>{memo.id}</td>
            <td>{memo.content}</td>
            <td>{memo.created_at}</td>
        </tr>
        ))}
    </StyledTable>
    </section>

        {/* 이미지 메타데이터 */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>이미지 기록 (S3) </h2>
          
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("image", file);

            try {
              const res = await fetch(`${API_BASE}/uploadPhoto`, {
                method: "POST",
                body: formData,
              });

              // ✅ 응답 상태 / 본문 먼저 확인
              const text = await res.text(); // 일단 문자열로 통째로 읽음
              if (!res.ok) {
                console.error(
                  "[업로드 실패]",
                  "status:", res.status,
                  "statusText:", res.statusText,
                  "response body:", text
                );
                // 필요하면 alert도
                // alert(`업로드 실패: ${res.status} ${res.statusText}\n${text}`);
                return;
              }

              // 여기까지 왔으면 성공 응답이므로 JSON으로 파싱
              let data = {};
              try {
                data = JSON.parse(text);
              } catch (parseErr) {
                console.error("JSON 파싱 실패:", parseErr, "raw text:", text);
                return;
              }

              console.log("업로드 성공 응답:", data);

              // 업로드 후 DB 새로 불러오기
              const list = await fetch(`${API_BASE}/images`);
              const arr = await list.json();
              setImages(arr);

            } catch (err) {
              console.error("이미지 업로드 요청 자체 실패(fetch error):", err);
            }
          }}
            style={{ marginBottom: "12px" }}
          />

          {/* 이미지 갤러리 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "10px",
            }}
          >
            {images.map((img) => (
              <div
                key={img.id}
                style={{
                  padding: "6px",
                  background: "#fafafa",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                <img
                  src={img.file_name}
                  alt="uploaded"
                  style={{
                    width: "100%",
                    height: "100px",
                    objectFit: "fit",
                    borderRadius: "6px",
                  }}
                />
                <div style={{ fontSize: "11px", marginTop: "5px", color: "#555" }}>
                  {img.uploaded_at}
                </div>
              </div>
            ))}
          </div>

          <StyledTable headers={["ID", "설명", "업로드 시각"]}>
            {images.map((img) => (
              <tr key={img.id}>
                <td>{img.id}</td>
                <td>
                  {img.description}
                </td>
                <td>{img.uploaded_at}</td>
              </tr>
            ))}
          </StyledTable>

        </section>

        <header style={{ marginBottom: "24px", marginTop: "50px" }}>
          <h1 style={{ fontSize: "28px", marginBottom: "8px"}}>
            Auto Scaling &amp; Load Balancing 모니터
          </h1>
          <p style={{ color: "#666", fontSize: "14px" }}>
            AWS ALB + Auto Scaling Group 동작을 실시간 대시보드로 시각화합니다.
          </p>
        </header>


        {/* 트래픽 발생 컨트롤 + 그래프 */}
        <section style={sectionStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <h2 style={sectionTitleStyle}>서버별 트래픽 (최근 10분)</h2>
            <div>
              <button
                onClick={startLoad}
                disabled={running}
                style={{
                  ...buttonStyle,
                  background: running ? "#d0d0e0" : "#4c6fff",
                  color: "white",
                }}
              >
                🔄 트래픽 발생 시작
              </button>
              <button
                onClick={stopLoad}
                disabled={!running}
                style={{
                  ...buttonStyle,
                  marginLeft: "8px",
                  background: !running ? "#d0d0e0" : "#ff5c5c",
                  color: "white",
                }}
              >
                ⏹ 중지
              </button>
            </div>
          </div>

          {trafficData.length === 0 ? (
            <p style={{ color: "#777", fontSize: "14px" }}>
              아직 수집된 트래픽 데이터가 없습니다. 상단의 &lt;트래픽 발생 시작&gt; 버튼을
              눌러 요청을 발생시켜 보세요.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <LineChart
                width={820}
                height={280}
                data={trafficData}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="minute" />
                <YAxis />
                <Tooltip />
                <Legend />
                {trafficServerKeys.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={key}
                    dot={false}
                  />
                ))}
              </LineChart>
            </div>
          )}
        </section>

        {/* 서버별 상태 테이블 */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>
            현재 감지된 서버 수: {serverList.length}개
          </h2>
          <StyledTable
            headers={[
              "서버(hostname)",
              "이 서버로 간 요청 수",
              "서버 내부 visitCount",
              "마지막 응답 시간",
            ]}
          >
            {serverList.map(([host, info]) => (
              <tr key={host}>
                <td>{host}</td>
                <td>{info.hits}</td>
                <td>{info.lastVisitCount}</td>
                <td>{info.lastTime}</td>
              </tr>
            ))}
          </StyledTable>
        </section>

        {/* 최근 요청 로그 */}
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>최근 요청 로그 (/recent-requests)</h2>
          <StyledTable
            headers={["시간", "서버", "경로", "당시 visitCount"]}
          >
            {logs.map((log, idx) => (
              <tr key={idx}>
                <td>{log.time}</td>
                <td>{log.server}</td>
                <td>{log.path}</td>
                <td>{log.visitCount}</td>
              </tr>
            ))}
          </StyledTable>
        </section>
      </div>
    </div>
  );
}

/* --- 공용 컴포넌트 & 스타일 --- */

function SummaryCard({ title, value }) {
  return (
    <div
      style={{
        borderRadius: "12px",
        background: "white",
        padding: "12px 14px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        border: "1px solid #e4e4f0",
      }}
    >
      <div style={{ fontSize: "13px", color: "#777", marginBottom: "6px" }}>
        {title}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function StyledTable({ headers, children }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
        }}
      >
        <thead>
          <tr style={{ background: "#f0f1ff" }}>
            {headers.map((h) => (
              <th
                key={h}
                style={{
                  padding: "8px",
                  borderBottom: "1px solid #d4d7f0",
                  textAlign: "left",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children && React.Children.count(children) > 0 ? (
            children
          ) : (
            <tr>
              <td colSpan={headers.length} style={{ padding: "8px" }}>
                데이터가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const sectionStyle = {
  background: "white",
  borderRadius: "12px",
  padding: "16px 18px",
  marginBottom: "20px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  border: "1px solid #e4e4f0",
};

const sectionTitleStyle = {
  fontSize: "18px",
  marginBottom: "12px",
};

const buttonStyle = {
  border: "none",
  padding: "8px 14px",
  borderRadius: "999px",
  fontSize: "13px",
  cursor: "pointer",
};

const inputStyle = {
  padding: "8px 10px",
  borderRadius: "8px",
  border: "1px solid #d0d0e0",
  fontSize: "13px",
  minWidth: "180px",
};