import { useEffect, useState } from "react";
import { api } from "../api";
import { LEG } from "../util";
import { Loading, Problem } from "./Bits.jsx";
import PaperBuilder from "./PaperBuilder.jsx";

export default function MockTest({ onStart }) {
  const [subs, setSubs] = useState(null);
  const [subject, setSubject] = useState("");
  const [count, setCount] = useState("10");
  const [err, setErr] = useState("");
  const [loadErr, setLoadErr] = useState("");
  useEffect(() => { api("/api/subjects").then(setSubs).catch((e) => !e.auth && setLoadErr(e.message)); }, []);
  if (loadErr) return <Problem msg={loadErr} />;
  if (!subs) return <Loading />;

  const start = async () => {
    setErr("");
    try {
      const body = { count: +count };
      if (subject) body.subject_id = +subject;
      onStart(await api("/api/tests/start", body));
    } catch (e) { if (!e.auth) setErr(e.message); }
  };

  return (
    <>
      <div className="panel">
        <h2>GATE ECE mock test</h2>
        <p className="mute">Same rules and screen as the real computer-based test. The server picks the questions and does the marking.</p>
        <div className="row" style={{ margin: "12px 0" }}>
          <label>Subject<br /><select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">All subjects</option>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
          <label>Questions<br /><select value={count} onChange={(e) => setCount(e.target.value)}>
            <option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="65">Full length (up to 65)</option>
          </select></label>
        </div>
        <p className="mute">Time is set at the real exam pace of about 2 min 45 s per question.</p>
        <h3>Instructions</h3>
        <ul>
          <li>MCQ: one correct option. A wrong answer costs 1/3 mark (1-mark) or 2/3 mark (2-mark).</li>
          <li>MSQ: choose all correct options. No negative or partial marks.</li>
          <li>NAT: type the number with the on-screen keypad. No negative marks.</li>
          <li>Use the section tabs and palette to move around. The test submits itself when the timer ends.</li>
        </ul>
        <div className="leg" style={{ marginBottom: 16 }}>{LEG.map(([n, k]) => <div key={k}><span className={"chip s" + k} />{n}</div>)}</div>
        {err && <p className="note" role="alert">{err}</p>}
        <button className="btn" onClick={start}>I am ready to begin</button>
      </div>
      <PaperBuilder subjects={subs} onStart={onStart} />
    </>
  );
}
