import { has } from "../util";

// Score, marks by subject, and every question with its answer and solution.
export default function Result({ data, onBack, backLabel }) {
  const R = data.results;
  const attempted = R.filter((r) => has(r.response)).length;
  const correct = R.filter((r) => r.awarded > 0).length;
  const by = {};
  R.forEach((r) => { const v = (by[r.subject] = by[r.subject] || [0, 0]); v[0] += r.awarded || 0; v[1] += r.marks; });
  return (
    <>
      <div className="panel">
        <h2>Result</h2>
        <p className="timer">{Number(data.score).toFixed(2)} / {data.total_marks}</p>
        <p className="mute">{R.length} questions · {attempted} attempted · {correct} correct · {attempted - correct} wrong · {R.length - attempted} not attempted{data.late ? " · submitted after time" : ""}</p>
        <h3>By subject</h3>
        <table><tbody>{Object.entries(by).map(([n, v]) => <tr key={n}><td>{n}</td><td>{v[0].toFixed(2)} / {v[1]}</td></tr>)}</tbody></table>
      </div>
      <div className="panel">
        <h2>Answers and solutions</h2>
        {R.map((r, i) => {
          const sel = Array.isArray(r.response) ? r.response : [];
          const g = r.awarded ?? 0;
          return (
            <div key={r.id} style={{ borderTop: "1px solid var(--line)", padding: "14px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <h3>Question {i + 1}</h3><span className="tag">{r.subject} · {r.type} · {g > 0 ? "+" : ""}{g.toFixed(2)} marks</span>
              </div>
              <p>{r.text}</p>
              {r.type === "NAT"
                ? <p>Your answer: <b>{has(r.response) ? r.response : "Not answered"}</b> · Correct answer: <b>{r.correct_answer}</b></p>
                : r.options.map((o, k) => (
                  <div key={k} className={"opt " + (r.correct_answer.includes(k) ? "right" : sel.includes(k) ? "wrong" : "")} style={{ cursor: "default" }}>
                    <b>{"ABCDEF"[k]}.</b><span>{o}{r.correct_answer.includes(k) ? " ✓ correct" : ""}{sel.includes(k) ? " (your choice)" : ""}</span>
                  </div>
                ))}
              <p style={{ marginBottom: 0 }}><b>Solution.</b> {r.solution || "No solution added yet."}</p>
            </div>
          );
        })}
      </div>
      <button className="btn" onClick={onBack}>{backLabel}</button>
    </>
  );
}
