import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { Loading, Problem } from "./Bits.jsx";

const blank = (subs) => ({ id: null, subjectId: subs[0]?.id ?? "", topicId: subs[0]?.topics[0]?.id ?? "", type: "MCQ", marks: 1, text: "",
  opts: ["", "", "", ""], sel: [], nat: "", solution: "", difficulty: "medium" });

// Turns a question from the server into the form's state.
const toForm = (q) => ({ id: q.id, subjectId: q.subject_id, topicId: q.topic_id, type: q.type, marks: q.marks, text: q.text,
  opts: [...(q.options || []), "", "", "", ""].slice(0, Math.max(4, (q.options || []).length)),
  sel: q.type === "NAT" ? [] : q.answer.split(",").map((l) => "ABCDEF".indexOf(l)), nat: q.type === "NAT" ? q.answer : "",
  solution: q.solution, difficulty: q.difficulty });

function QuestionForm({ subs, initial, onSaved, onCancel }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState("");
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const topics = subs.find((s) => String(s.id) === String(f.subjectId))?.topics || [];

  const save = async (e) => {
    e.preventDefault();
    setErr("");
    // Blank options are dropped, so the answer letters are counted over the options that are left.
    const filled = f.opts.map((o, k) => (o.trim() ? k : -1)).filter((k) => k >= 0);
    const letters = f.sel.filter((k) => filled.includes(k)).map((k) => "ABCDEF"[filled.indexOf(k)]).join(",");
    const body = { topic_id: Number(f.topicId), type: f.type, marks: Number(f.marks), text: f.text, solution: f.solution, difficulty: f.difficulty,
      options: f.type === "NAT" ? [] : filled.map((k) => f.opts[k].trim()), answer: f.type === "NAT" ? f.nat : letters };
    try {
      if (f.id) await api("/api/admin/questions/" + f.id, body, "PUT"); else await api("/api/admin/questions", body);
      await onSaved(f.id ? "Question updated." : "Question added.");
    } catch (x) { if (!x.auth) setErr(x.message); }
  };
  const toggle = (k) => set("sel", f.type === "MSQ" ? (f.sel.includes(k) ? f.sel.filter((x) => x !== k) : [...f.sel, k]) : [k]);

  return (
    <form className="panel" onSubmit={save} aria-label="Question form">
      <h3>{f.id ? "Edit question " + f.id : "Add a question"}</h3>
      <div className="row">
        <label className="field">Subject<select value={f.subjectId} onChange={(e) => { const s = subs.find((x) => String(x.id) === e.target.value); setF({ ...f, subjectId: e.target.value, topicId: s?.topics[0]?.id ?? "" }); }}>
          {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="field">Topic<select value={f.topicId} onChange={(e) => set("topicId", e.target.value)} style={{ maxWidth: 360 }}>
          {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label className="field">Type<select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, sel: [] })}>
          <option>MCQ</option><option>MSQ</option><option>NAT</option></select></label>
        <label className="field">Marks<select value={f.marks} onChange={(e) => set("marks", e.target.value)}><option>1</option><option>2</option></select></label>
        <label className="field">Difficulty<select value={f.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
          <option>easy</option><option>medium</option><option>hard</option></select></label>
      </div>
      <label className="field">Question text<textarea rows={3} value={f.text} onChange={(e) => set("text", e.target.value)} required maxLength={2000} /></label>
      {f.type === "NAT" ? (
        <label className="field">Correct answer (a number)<input type="text" inputMode="decimal" value={f.nat} onChange={(e) => set("nat", e.target.value)} style={{ width: 160 }} /></label>
      ) : (
        <>
          <div className="opts">
            {f.opts.map((o, k) => (
              <label className="field" key={k}>Option {"ABCDEF"[k]}
                <input type="text" value={o} maxLength={300} onChange={(e) => set("opts", f.opts.map((x, j) => (j === k ? e.target.value : x)))} /></label>
            ))}
            {f.opts.length < 6 && <button type="button" className="btn ghost" onClick={() => set("opts", [...f.opts, ""])}>Add option</button>}
          </div>
          <p className="mute" style={{ margin: "10px 0 0" }}>{f.type === "MSQ" ? "Tick every correct option:" : "Choose the correct option:"}</p>
          <div className="ansrow">
            {f.opts.map((o, k) => o.trim() && (
              <label key={k}><input type={f.type === "MSQ" ? "checkbox" : "radio"} name="correct" aria-label={"Correct option " + "ABCDEF"[k]} checked={f.sel.includes(k)} onChange={() => toggle(k)} /> {"ABCDEF"[k]}</label>
            ))}
          </div>
        </>
      )}
      <label className="field">Worked solution<textarea rows={3} value={f.solution} onChange={(e) => set("solution", e.target.value)} maxLength={4000} /></label>
      {err && <p className="note" role="alert">{err}</p>}
      <button className="btn" type="submit">{f.id ? "Save changes" : "Add question"}</button>{" "}
      <button className="btn ghost" type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}

// Create, read, update and delete for the question bank. Only administrators can open it.
export default function QuestionBank() {
  const [subs, setSubs] = useState(null);
  const [rows, setRows] = useState(null);
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const reload = useCallback(async () => {
    const qs = new URLSearchParams();
    if (subject) qs.set("subject_id", subject);
    if (search.trim()) qs.set("search", search.trim());
    setRows(await api("/api/admin/questions" + (qs.toString() ? "?" + qs : "")));
  }, [subject, search]);
  useEffect(() => { api("/api/subjects").then(setSubs).catch((e) => !e.auth && setErr(e.message)); }, []);
  useEffect(() => { reload().catch((e) => !e.auth && setErr(e.message)); }, [reload]);

  const saved = async (m) => { setForm(null); setMsg(m); await reload(); };
  const remove = async (id) => {
    try {
      const r = await api("/api/admin/questions/" + id, {}, "DELETE");
      setConfirm(null);
      setMsg(r.archived ? "Archived. A past test or saved paper uses it, so it is hidden from new tests and papers." : "Question deleted.");
      await reload();
    } catch (e) { if (!e.auth) setErr(e.message); }
  };

  if (err) return <Problem msg={err} />;
  if (!subs || !rows) return <Loading />;
  if (form) return <QuestionForm subs={subs} initial={form} onSaved={saved} onCancel={() => setForm(null)} />;

  return (
    <div className="panel">
      <h2>Question bank</h2>
      <p className="mute">{rows.length} question{rows.length === 1 ? "" : "s"}. Add, edit or delete questions here. New tests and papers use these questions.</p>
      <div className="row" style={{ alignItems: "end", marginBottom: 12 }}>
        <label>Subject<br /><select value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="">All subjects</option>{subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Search<br /><input type="text" value={search} placeholder="Words in the question" onChange={(e) => setSearch(e.target.value)} /></label>
        <button className="btn" onClick={() => { setMsg(""); setForm(blank(subs)); }}>Add question</button>
      </div>
      {msg && <p className="note ok" role="status">{msg}</p>}
      {rows.length === 0 ? <p className="mute">No questions match.</p> : (
        <div className="scroll"><table><tbody>
          <tr><th>#</th><th>Subject and topic</th><th>Type</th><th>Marks</th><th>Question</th><th></th></tr>
          {rows.map((q) => (
            <tr key={q.id}>
              <td>{q.id}</td>
              <td>{q.subject}<br /><span className="mute" style={{ fontSize: 13 }}>{q.topic}</span></td>
              <td>{q.type}</td><td>{q.marks}</td>
              <td style={{ minWidth: 220 }}>{q.text.length > 110 ? q.text.slice(0, 110) + "…" : q.text}</td>
              <td className="actions">
                {confirm === q.id ? (
                  <><span>Delete?</span> <button className="btn" onClick={() => remove(q.id)}>Yes</button><button className="btn ghost" onClick={() => setConfirm(null)}>No</button></>
                ) : (
                  <><button className="btn ghost" onClick={() => { setMsg(""); setForm(toForm(q)); }}>Edit</button>
                    <button className="btn ghost" onClick={() => setConfirm(q.id)}>Delete</button></>
                )}
              </td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  );
}
