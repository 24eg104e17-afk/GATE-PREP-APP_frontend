import { useEffect, useState } from "react";
import { api } from "../api";
import { yt, gg } from "../util";
import { Loading, Problem, Ext } from "./Bits.jsx";

export default function Syllabus({ progress, setProgress }) {
  const [subs, setSubs] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/api/subjects").then(setSubs).catch((e) => !e.auth && setErr(e.message)); }, []);
  if (err) return <Problem msg={err} />;
  if (!subs) return <Loading />;
  const pct = (s) => (s.topics.length ? Math.round((s.topics.filter((t) => progress[t.id]).length / s.topics.length) * 100) : 0);

  // The tick is shown at once and saved on the server. If saving fails, it goes back.
  const toggle = async (t, checked) => {
    setProgress((p) => ({ ...p, [t.id]: checked }));
    try { await api(`/api/progress/${t.id}`, { done: checked }, "PUT"); }
    catch (e) { setProgress((p) => ({ ...p, [t.id]: !checked })); }
  };

  return (
    <div className="panel">
      <h2>Syllabus and resources</h2>
      <p className="mute">Tick topics as you finish them. Each topic links to lectures and notes.</p>
      <p className="note">Source: <Ext href="https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/EC_GATE2027_Syllabus.pdf">official GATE 2027 EC syllabus</Ext> (IIT Madras). Video and note links open a search for now.</p>
      {subs.map((s) => (
        <details key={s.id}>
          <summary><span>{s.name}</span><span className="tag">{pct(s)}%</span></summary>
          {s.topics.map((t) => (
            <div className="topic" key={t.id}>
              <input type="checkbox" id={"t" + t.id} checked={!!progress[t.id]} onChange={(e) => toggle(t, e.target.checked)} />
              <label htmlFor={"t" + t.id}>{t.name} <span className="mute">({t.questions} Q)</span></label>
              <span><Ext href={yt(s.name + " " + t.name)}>Videos</Ext>{" "}<Ext href={gg(s.name + " " + t.name)}>Notes</Ext></span>
            </div>
          ))}
        </details>
      ))}
    </div>
  );
}
