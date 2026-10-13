import { useEffect, useState } from "react";
import { api } from "../api";
import { Loading, Problem } from "./Bits.jsx";
import Result from "./Result.jsx";

export default function History() {
  const [list, setList] = useState(null);
  const [detail, setDetail] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/api/attempts").then(setList).catch((e) => !e.auth && setErr(e.message)); }, []);
  const open = async (id) => { try { setDetail(await api("/api/attempts/" + id)); } catch (e) { if (!e.auth) setErr(e.message); } };
  if (detail) return <Result data={detail} backLabel="Back to history" onBack={() => setDetail(null)} />;
  if (err) return <Problem msg={err} />;
  if (!list) return <Loading />;
  return (
    <div className="panel">
      <h2>Test history</h2>
      {list.length === 0 ? <p className="mute">No submitted tests yet.</p> : (
        <div className="scroll"><table><tbody>
          <tr><th>#</th><th>Date</th><th>Score</th><th></th></tr>
          {list.map((a) => (
            <tr key={a.id}><td>{a.id}</td><td>{a.submitted_at.slice(0, 16).replace("T", " ")}</td><td>{a.score} / {a.total_marks}</td>
              <td><button className="btn ghost" onClick={() => open(a.id)}>Review</button></td></tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  );
}
