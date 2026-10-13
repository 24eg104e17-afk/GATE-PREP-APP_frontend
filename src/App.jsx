import { useCallback, useEffect, useState } from "react";
import { api, setUnauthorizedHandler } from "./api";
import Auth from "./components/Auth.jsx";
import Home from "./components/Home.jsx";
import Syllabus from "./components/Syllabus.jsx";
import ExamInfo from "./components/ExamInfo.jsx";
import MockTest from "./components/MockTest.jsx";
import TestRunner from "./components/TestRunner.jsx";
import Result from "./components/Result.jsx";
import History from "./components/History.jsx";
import QuestionBank from "./components/QuestionBank.jsx";

export default function App() {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("home");
  const [progress, setProgress] = useState({});
  const [test, setTest] = useState(null);     // the running test, as sent by the server
  const [result, setResult] = useState(null); // the result of the test just submitted

  const loadProgress = async () => {
    const p = {};
    (await api("/api/progress")).forEach((id) => { p[id] = true; });
    setProgress(p);
  };

  useEffect(() => {
    setUnauthorizedHandler(() => { setMe(null); setTest(null); setResult(null); });
    api("/api/auth/me").then(async (u) => { await loadProgress(); setMe(u); }).catch(() => {}).finally(() => setReady(true));
  }, []);

  const login = async (u) => { await loadProgress(); setView("home"); setMe(u); };
  const logout = async () => {
    try { await api("/api/auth/logout", {}); } catch (e) { /* already logged out */ }
    setMe(null); setTest(null); setResult(null); setProgress({});
  };
  const finish = useCallback((r) => { setResult(r); setTest(null); }, []);

  if (!ready) return <main><div className="panel mute">Loading…</div></main>;
  if (!me) {
    return (
      <>
        <header><div className="bar"><span className="logo">ECE GATE Prep</span></div></header>
        <main><Auth onLogin={login} /></main>
      </>
    );
  }
  const tabs = [["home", "Home"], ["syl", "Syllabus"], ["info", "Exam info"], ["test", "Mock test"], ["hist", "History"],
    ...(me.role === "ADMIN" ? [["bank", "Question bank"]] : [])];
  return (
    <>
      <header>
        <div className="bar">
          <span className="logo">ECE GATE Prep</span>
          <nav>{tabs.map(([k, l]) => <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>{l}</button>)}</nav>
          <span id="who">{me.name}</span>
          <button className="btn ghost" onClick={logout}>Log out</button>
        </div>
      </header>
      <main>
        {view === "home" && <Home me={me} progress={progress} go={setView} />}
        {view === "syl" && <Syllabus progress={progress} setProgress={setProgress} />}
        {view === "info" && <ExamInfo />}
        {view === "hist" && <History />}
        {view === "bank" && me.role === "ADMIN" && <QuestionBank />}
        {view === "test" && !test && !result && <MockTest onStart={setTest} />}
        {test && <div style={{ display: view === "test" ? "block" : "none" }}><TestRunner data={test} onDone={finish} /></div>}
        {view === "test" && result && !test && <Result data={result} backLabel="Take another test" onBack={() => setResult(null)} />}
      </main>
    </>
  );
}
