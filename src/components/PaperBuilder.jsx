import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { mins } from "../util";

// Build, read, rename and delete saved question papers. The server does the picking.
export default function PaperBuilder({ subjects, onStart }) {
  const [list, setList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [custom, setCustom] = useState(false);
  const [f, setF] = useState({ name: "", g1: 5, g2: 5, c1: 10, c2: 10, mm: 0 });
  const [picked, setPicked] = useState([]);
  const [renaming, setRenaming] = useState(null);
  const [err, setErr] = useState("");
  const core = subjects.filter((s) => s.name !== "General Aptitude");

  const reload = useCallback(() => api("/api/papers").then(setList).catch((e) => !e.auth && setErr(e.message)), []);
  useEffect(() => { reload(); }, [reload]);
  const guard = (fn) => async () => { setErr(""); try { await fn(); } catch (e) { if (!e.auth) setErr(e.message); } };

  const build = (body) => guard(async () => { setSummary(await api("/api/papers", body)); await reload(); });
  const buildCustom = build({ mode: "custom", name: f.name, ga_1: +f.g1, ga_2: +f.g2, core_1: +f.c1, core_2: +f.c2, math_marks: +f.mm, subject_ids: picked });
  const start = (id) => guard(async () => onStart(await api(`/api/papers/${id}/start`, {})));
  const remove = (id) => guard(async () => { await api(`/api/papers/${id}`, {}, "DELETE"); if (summary && summary.paper_id === id) setSummary(null); await reload(); });
  const rename = guard(async () => { await api(`/api/papers/${renaming.id}`, { name: renaming.name }, "PUT"); setRenaming(null); await reload(); });
  const num = (k, label) => (
    <label style={{ fontSize: 14 }}>{label}<br /><input type="number" min="0" max="65" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} style={{ width: 110 }} /></label>
  );

  return (
    <div className="panel">
      <h2>Paper builder</h2>
      <p className="mute">The server builds a paper from the question bank and saves it, so you can sit the same paper again later. The full GATE paper is 10 General Aptitude and 55 core questions (100 marks, 3 hours).</p>
      <div className="acts" style={{ marginTop: 0 }}>
        <button className="btn" onClick={build({ mode: "full" })}>Build full GATE paper</button>
        <button className="btn ghost" onClick={() => setCustom(!custom)}>Build custom paper</button>
      </div>
      {custom && (
        <div style={{ marginTop: 14 }}>
          <label>Paper name<br /><input type="text" maxLength={120} placeholder="Custom paper" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={{ width: "100%", maxWidth: 320 }} /></label>
          <div className="row" style={{ margin: "12px 0" }}>
            {num("g1", "General Aptitude, 1-mark")}{num("g2", "General Aptitude, 2-mark")}{num("c1", "Core, 1-mark")}{num("c2", "Core, 2-mark")}{num("mm", "Engineering Maths marks")}
          </div>
          <p className="mute" style={{ margin: "0 0 6px" }}>Subjects for the core questions (leave all unticked for every subject):</p>
          <div className="row" style={{ gap: "6px 16px" }}>
            {core.map((s) => (
              <label key={s.id} style={{ fontSize: 14 }}>
                <input type="checkbox" checked={picked.includes(s.id)} onChange={() => setPicked(picked.includes(s.id) ? picked.filter((x) => x !== s.id) : [...picked, s.id])} /> {s.name}
              </label>
            ))}
          </div>
          <button className="btn" style={{ marginTop: 12 }} onClick={buildCustom}>Build paper</button>
        </div>
      )}
      {err && <p className="note" role="alert" style={{ marginTop: 14 }}>{err}</p>}
      {summary && (
        <div className={"note " + (summary.fully_built ? "ok" : "")} style={{ marginTop: 14 }}>
          <b>{summary.name}</b> is saved: {summary.total_questions} questions, {summary.total_marks} marks, {mins(summary.duration_sec)} minutes.<br />
          General Aptitude {summary.counts.ga_1_mark} × 1-mark + {summary.counts.ga_2_mark} × 2-mark · Core {summary.counts.core_1_mark} × 1-mark + {summary.counts.core_2_mark} × 2-mark · Engineering Mathematics {summary.counts.math_marks} marks
          {Object.keys(summary.shortfall).length > 0 && (
            <><br /><b>The question bank is short:</b> {Object.entries(summary.shortfall).map(([k, v]) => `${k} (${v} missing)`).join(", ")}. Add more questions to build the full pattern.</>
          )}
          <br /><button className="btn" style={{ marginTop: 8 }} onClick={start(summary.paper_id)}>Start this paper</button>
        </div>
      )}
      <h3 style={{ marginTop: 18 }}>Saved papers</h3>
      {list.length === 0 ? <p className="mute">No saved papers yet.</p> : (
        <div className="scroll"><table><tbody>
          <tr><th>Name</th><th>Questions</th><th>Marks</th><th>Time</th><th></th></tr>
          {list.map((p) => (
            <tr key={p.id}>
              <td>
                {renaming && renaming.id === p.id ? (
                  <><input type="text" aria-label="New paper name" value={renaming.name} maxLength={120} onChange={(e) => setRenaming({ ...renaming, name: e.target.value })} style={{ width: 180 }} />{" "}
                    <button className="btn" onClick={rename}>Save</button> <button className="btn ghost" onClick={() => setRenaming(null)}>Cancel</button></>
                ) : <>{p.name}{!p.fully_built && <> <span className="tag">short</span></>}</>}
              </td>
              <td>{p.total_questions}</td><td>{p.total_marks}</td><td>{mins(p.duration_sec)} min</td>
              <td className="actions">
                <button className="btn" onClick={start(p.id)}>Start</button>
                <button className="btn ghost" onClick={() => setRenaming({ id: p.id, name: p.name })}>Rename</button>
                <button className="btn ghost" onClick={remove(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  );
}
