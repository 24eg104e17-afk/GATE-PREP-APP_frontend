import { useEffect, useState } from "react";
import { api } from "../api";
import { fd } from "../util";
import { Loading, Problem, Ext } from "./Bits.jsx";

export default function ExamInfo() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/api/exam-info").then(setD).catch((e) => !e.auth && setErr(e.message)); }, []);
  if (err) return <Problem msg={err} />;
  if (!d) return <Loading />;

  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const left = (i) => Math.round((new Date(i + "T00:00:00") - t0) / 864e5);
  const next = d.dates.findIndex((x) => x.date && left(x.date) >= 0);
  const countdown = (h) => { const n = left(h.date); return n > 0 ? n + " day" + (n > 1 ? "s" : "") + h.suffix : n === 0 ? "Today" : h.after; };

  return (
    <>
      <div className="panel">
        <h2>{d.title}</h2>
        <p className="mute">Organised by {d.organiser}. These dates come from the {d.source} and are liable to change, so check <Ext href={d.website}>{d.website.replace("https://", "")}</Ext> for updates.</p>
      </div>
      <div className="grid">
        {d.highlights.map((h) => (
          <div className="panel" key={h.label}><h3>{h.label}</h3><p className="timer">{countdown(h)}</p><p className="mute">{fd(h.date)}</p></div>
        ))}
      </div>
      <div className="panel"><h3>Timeline</h3>
        <div className="scroll"><table><tbody>
          <tr><th>Date</th><th>What happens</th><th></th></tr>
          {d.dates.map((x, i) => {
            const st = !x.date ? "TBA" : left(x.date) < 0 ? "Done" : i === next ? "Next" : "Upcoming";
            return (
              <tr key={i} style={st === "Next" ? { background: "var(--bg)" } : undefined}>
                <td style={{ whiteSpace: "nowrap" }}><b>{x.date ? fd(x.date) : "To be announced"}</b></td>
                <td>{x.title}<br /><span className="mute" style={{ fontSize: 14 }}>{x.note}</span></td>
                <td><span className="tag" style={st === "Next" ? { borderColor: "var(--accent)", color: "var(--accent)", fontWeight: 600 } : undefined}>{st}</span></td>
              </tr>
            );
          })}
        </tbody></table></div>
      </div>
      <div className="grid">
        <div className="panel"><h3>Application fee (per paper)</h3>
          <div className="scroll"><table><tbody>
            <tr><th></th><th>Regular</th><th>Late fee period</th></tr>
            <tr><td>Female / SC / ST / PwD</td><td>₹{d.fees.regular.reserved}</td><td>₹{d.fees.late.reserved}</td></tr>
            <tr><td>Other candidates</td><td>₹{d.fees.regular.general}</td><td>₹{d.fees.late.general}</td></tr>
          </tbody></table></div>
          <p className="mute" style={{ fontSize: 14 }}>{d.fees.note}</p>
        </div>
        <div className="panel"><h3>{d.pattern_title}</h3><ul style={{ margin: 0, paddingLeft: 20 }}>{d.pattern.map((x) => <li key={x}>{x}</li>)}</ul></div>
      </div>
      <div className="panel"><h3>On exam day</h3><ul style={{ margin: 0, paddingLeft: 20 }}>{d.exam_day.map((x) => <li key={x}>{x}</li>)}</ul></div>
      <div className="panel"><h3>Official links</h3>
        <p style={{ margin: 0 }}>{d.links.map((l, i) => <span key={l.url}>{i > 0 && " · "}<Ext href={l.url}>{l.title}</Ext></span>)}</p>
        <p className="mute" style={{ fontSize: 14, marginBottom: 0 }}>{d.links_note}</p>
      </div>
    </>
  );
}
