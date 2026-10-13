import { useEffect, useState } from "react";
import { api } from "../api";
import { Loading, Problem } from "./Bits.jsx";

export default function Home({ me, progress, go }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    Promise.all([api("/api/subjects"), api("/api/attempts")]).then(([subs, hist]) => setD({ subs, hist })).catch((e) => !e.auth && setErr(e.message));
  }, []);
  if (err) return <Problem msg={err} />;
  if (!d) return <Loading />;
  const pct = (s) => (s.topics.length ? Math.round((s.topics.filter((t) => progress[t.id]).length / s.topics.length) * 100) : 0);
  const total = Math.round(d.subs.reduce((a, s) => a + pct(s), 0) / Math.max(1, d.subs.length));
  const nq = d.subs.reduce((a, s) => a + s.topics.reduce((b, t) => b + t.questions, 0), 0);
  const last = d.hist[0];
  return (
    <>
      <div className="panel">
        <h1>Welcome, {me.name}</h1>
        <p className="mute">Track the GATE 2027 ECE syllabus, find lectures and notes for every topic, and practise in a GATE-style timed test.</p>
        <button className="btn" onClick={() => go("test")}>Start mock test</button>{" "}
        <button className="btn ghost" onClick={() => go("syl")}>Open syllabus</button>
      </div>
      <div className="grid">
        <div className="panel"><h3>Syllabus covered</h3><p className="timer">{total}%</p><div className="bartrack"><i style={{ width: total + "%" }} /></div></div>
        <div className="panel"><h3>Last mock test</h3>
          {last ? <><p className="timer">{last.score} / {last.total_marks}</p><p className="mute">{last.submitted_at.slice(0, 10)}</p></> : <p className="mute">No test taken yet.</p>}
        </div>
        <div className="panel"><h3>Question bank</h3><p className="timer">{nq}</p><p className="mute">questions available</p></div>
      </div>
      <div className="panel"><h3>Subjects</h3>
        {d.subs.map((s) => (
          <div key={s.id} style={{ margin: "12px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>{s.name}</span><span className="mute">{pct(s)}%</span></div>
            <div className="bartrack"><i style={{ width: pct(s) + "%" }} /></div>
          </div>
        ))}
      </div>
    </>
  );
}
