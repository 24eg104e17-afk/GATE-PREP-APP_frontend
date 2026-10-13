import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { has, fmt, negTxt, secOf, SECN, LEG } from "../util";

// The exam screen. It stays mounted while the test runs, so switching tabs does not stop the timer.
export default function TestRunner({ data, onDone }) {
  const Q = data.questions;
  const [i, setI] = useState(0);
  const [ans, setAns] = useState({});
  const [mk, setMk] = useState({});
  const [vis, setVis] = useState({ 0: true });
  const [left, setLeft] = useState(data.duration_sec);
  const [conf, setConf] = useState(false);
  const [err, setErr] = useState("");
  const busy = useRef(false);
  const latest = useRef(ans);
  latest.current = ans;

  const submit = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const responses = {};
    Q.forEach((q, k) => { if (has(latest.current[k])) responses[q.id] = latest.current[k]; });
    try { onDone(await api(`/api/tests/${data.attempt_id}/submit`, { responses })); }
    catch (e) { busy.current = false; if (!e.auth) setErr(e.message); }
  }, [Q, data.attempt_id, onDone]);

  useEffect(() => { const t = setInterval(() => setLeft((l) => l - 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (left <= 0) submit(); }, [left, submit]);
  useEffect(() => { setVis((v) => ({ ...v, [i]: true })); }, [i]);

  const stat = (k) => (has(ans[k]) ? (mk[k] ? 4 : 2) : mk[k] ? 3 : vis[k] ? 1 : 0);
  const q = Q[i];
  const sec = secOf(q);
  const secs = [...new Set(Q.map(secOf))];
  const idx = Q.map((_, k) => k).filter((k) => secOf(Q[k]) === sec);
  const cnt = [0, 1, 2, 3, 4].map((s) => idx.filter((k) => stat(k) === s).length);
  const all = [0, 1, 2, 3, 4].map((s) => Q.filter((_, k) => stat(k) === s).length);
  const a = ans[i];
  const move = (d) => setI(Math.max(0, Math.min(Q.length - 1, i + d)));
  const pick = (k) => {
    const cur = a || [];
    setAns({ ...ans, [i]: q.type === "MSQ" ? (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]) : [k] });
  };
  const key = (k) => { const c = String(a ?? ""); setAns({ ...ans, [i]: k === "b" ? c.slice(0, -1) : k === "c" ? "" : c + k }); };
  const clear = () => { const x = { ...ans }; delete x[i]; setAns(x); const m = { ...mk }; delete m[i]; setMk(m); };

  return (
    <div className="test">
      <div className="panel">
        <div className="tabs">
          {secs.map((c) => <button key={c} className={c === sec ? "on" : ""} onClick={() => setI(Q.findIndex((x) => secOf(x) === c))}>{SECN[c]}</button>)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <h3>Question {i + 1}</h3><span className="tag">{q.type} · +{q.marks} / −{negTxt(q)}</span>
        </div>
        <p className="mute" style={{ margin: "4px 0" }}>{q.subject}</p>
        <p>{q.text}</p>
        {q.type === "NAT" ? (
          <>
            <input type="text" readOnly aria-label="Your answer" value={a ?? ""} placeholder="Use the keypad" />
            <div className="kg">
              {"7894561230.-".split("").map((k) => <button className="kb" key={k} onClick={() => key(k)}>{k}</button>)}
              <button className="kb" aria-label="Backspace" onClick={() => key("b")}>⌫</button><button className="kb" onClick={() => key("c")}>Clear</button>
            </div>
          </>
        ) : q.options.map((o, k) => {
          const on = (a || []).includes(k);
          return (
            <div key={k} className={"opt" + (on ? " sel" : "")} role={q.type === "MSQ" ? "checkbox" : "radio"} aria-checked={on} tabIndex={0}
              onClick={() => pick(k)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); pick(k); } }}>
              <b>{"ABCDEF"[k]}.</b><span>{o}</span>
            </div>
          );
        })}
        <div className="acts">
          <button className="btn" onClick={() => move(1)}>Save &amp; Next</button>
          <button className="btn ghost" onClick={() => { setMk({ ...mk, [i]: true }); move(1); }}>Save &amp; Mark for Review</button>
          <button className="btn ghost" onClick={clear}>Clear Response</button>
          <span className="nav-spacer" />
          <button className="btn ghost" disabled={i === 0} onClick={() => move(-1)}>Back</button>
          <button className="btn ghost" disabled={i === Q.length - 1} onClick={() => move(1)}>Next</button>
        </div>
      </div>
      <div className="panel">
        <div className="mute">Time left</div><div className="timer" aria-label="Time left">{fmt(left)}</div>
        <div className="leg">{LEG.map(([n, k]) => <div key={k}><span className={"chip s" + k} />{cnt[k]} {n}</div>)}</div>
        <div className="pal" style={{ margin: "12px 0" }}>
          {idx.map((k) => <button key={k} className={"s" + stat(k) + (k === i ? " cur" : "")} onClick={() => setI(k)}>{k + 1}</button>)}
        </div>
        {err && <p className="note" role="alert">{err}</p>}
        {conf ? (
          <>
            <p className="note">Whole paper: {all[2] + all[4]} answered, {all[1]} not answered, {all[3]} marked only, {all[0]} not visited. Submit now?</p>
            <button className="btn" style={{ width: "100%" }} onClick={submit}>Yes, submit test</button>
            <button className="btn ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setConf(false)}>Keep working</button>
          </>
        ) : <button className="btn" style={{ width: "100%" }} onClick={() => setConf(true)}>Submit test</button>}
      </div>
    </div>
  );
}
