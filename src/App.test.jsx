import { render, screen, fireEvent, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

// A small in-memory copy of the backend API, so the screens can be tested without a server.
function fakeServer() {
  const db = { user: null, session: false, progress: [], attempts: [], papers: [], nextQ: 100, nextA: 1 };
  const subs = [
    { id: 1, name: "General Aptitude", topics: [{ id: 10, name: "Verbal", questions: 1 }] },
    { id: 2, name: "Control Systems", topics: [{ id: 20, name: "Stability", questions: 1 }] },
  ];
  const bank = [
    { id: 1, subject_id: 1, subject: "General Aptitude", topic_id: 10, topic: "Verbal", type: "MCQ", marks: 1, text: "Pick the synonym of brief", options: ["long", "short"], answer: "B", solution: "Brief means short.", difficulty: "easy" },
    { id: 2, subject_id: 2, subject: "Control Systems", topic_id: 20, topic: "Stability", type: "NAT", marks: 2, text: "Stable for K below?", options: null, answer: "6", solution: "Routh gives K below 6.", difficulty: "medium" },
  ];
  const pub = (q) => ({ id: q.id, subject: q.subject, topic: q.topic, type: q.type, marks: q.marks, text: q.text, options: q.options });
  const res = (status, body) => Promise.resolve({ status, ok: status < 400, json: async () => body });
  const idx = (q) => (q.type === "NAT" ? Number(q.answer) : q.answer.split(",").map((l) => "ABCDEF".indexOf(l)));
  const exam = { title: "GATE 2027 important dates", organiser: "IIT Madras", source: "brochure", website: "https://gate2027.iitm.ac.in", highlights: [], dates: [], fees: { regular: { reserved: 1, general: 2 }, late: { reserved: 3, general: 4 }, note: "n" }, pattern_title: "Pattern", pattern: [], exam_day: [], links: [], links_note: "" };

  const fetch = (url, opt = {}) => {
    const m = opt.method || "GET";
    const b = opt.body ? JSON.parse(opt.body) : {};
    if (url === "/api/auth/me") return db.session ? res(200, db.user) : res(401, { error: "Not logged in" });
    if (url === "/api/auth/register") { db.user = { id: 1, name: b.name, email: b.email, role: "ADMIN", pw: b.password }; db.session = true; return res(201, db.user); }
    if (url === "/api/auth/login") {
      if (!db.user || db.user.email !== b.email || db.user.pw !== b.password) return res(401, { error: "Incorrect email or password" });
      db.session = true; return res(200, db.user);
    }
    if (url === "/api/auth/logout") { db.session = false; return res(200, { ok: true }); }
    if (url === "/api/subjects") return res(200, subs);
    if (!db.session) return res(401, { error: "Please log in" });
    if (url === "/api/progress") return res(200, db.progress);
    if (url.startsWith("/api/progress/")) { const id = Number(url.split("/").pop()); db.progress = db.progress.filter((x) => x !== id); if (b.done) db.progress.push(id); return res(200, { done: b.done }); }
    if (url === "/api/exam-info") return res(200, exam);
    if (url === "/api/attempts") return res(200, db.attempts.map((a) => ({ id: a.id, submitted_at: "2026-10-04T10:00:00Z", score: a.score, total_marks: a.total_marks })).reverse());
    if (url === "/api/tests/start") { const a = { id: db.nextA++, questions: bank.map(pub), total_marks: 3 }; db.attempts.push({ ...a, pending: true }); return res(201, { attempt_id: a.id, duration_sec: 600, total_marks: 3, questions: a.questions }); }
    if (/^\/api\/tests\/\d+\/submit$/.test(url)) {
      const a = db.attempts.find((x) => x.id === Number(url.split("/")[3]));
      const results = bank.map((q) => { const r = b.responses[q.id]; const ok = r !== undefined && JSON.stringify(q.type === "NAT" ? Number(r) : r) === JSON.stringify(idx(q)); return { ...pub(q), response: r ?? null, correct_answer: idx(q), awarded: ok ? q.marks : 0, solution: q.solution }; });
      a.score = results.reduce((s, r) => s + r.awarded, 0); a.pending = false;
      return res(200, { attempt_id: a.id, score: a.score, total_marks: 3, late: false, results });
    }
    if (url === "/api/papers" && m === "GET") return res(200, db.papers);
    if (url === "/api/papers" && m === "POST") {
      const p = { id: db.papers.length + 1, name: b.name || "Full GATE paper", created_at: "2026-10-04T10:00:00Z", total_questions: 2, total_marks: 3, duration_sec: 600, fully_built: false };
      db.papers.unshift(p);
      return res(201, { paper_id: p.id, name: p.name, fully_built: false, total_questions: 2, total_marks: 3, duration_sec: 600, counts: { ga_1_mark: 1, ga_2_mark: 0, core_1_mark: 0, core_2_mark: 1, math_marks: 0 }, subjects: {}, shortfall: { "Core 1-mark": 25 } });
    }
    if (/^\/api\/papers\/\d+\/start$/.test(url)) return res(201, { attempt_id: 9, duration_sec: 600, total_marks: 3, questions: bank.map(pub) });
    if (/^\/api\/papers\/\d+$/.test(url)) {
      const id = Number(url.split("/").pop());
      if (m === "PUT") { db.papers.find((p) => p.id === id).name = b.name; return res(200, { id, name: b.name }); }
      db.papers = db.papers.filter((p) => p.id !== id); return res(200, { ok: true });
    }
    if (url.startsWith("/api/admin/questions")) {
      const id = Number(url.split("?")[0].split("/")[4]);
      const subjectOf = (tid) => subs.find((s) => s.topics.some((t) => t.id === tid));
      const build = (q0) => { const s = subjectOf(b.topic_id); const t = s.topics.find((x) => x.id === b.topic_id);
        return { ...q0, subject_id: s.id, subject: s.name, topic_id: t.id, topic: t.name, type: b.type, marks: b.marks, text: b.text, options: b.type === "NAT" ? null : b.options, answer: b.answer, solution: b.solution, difficulty: b.difficulty }; };
      if (m === "GET") { const needle = (url.split("search=")[1] || "").toLowerCase(); return res(200, bank.filter((q) => q.text.toLowerCase().includes(decodeURIComponent(needle))).slice().reverse()); }
      if (m === "POST") { const q = build({ id: db.nextQ++ }); bank.push(q); return res(201, q); }
      if (m === "PUT") { const i = bank.findIndex((q) => q.id === id); bank[i] = build(bank[i]); return res(200, bank[i]); }
      if (m === "DELETE") { bank.splice(bank.findIndex((q) => q.id === id), 1); return res(200, { deleted: true, archived: false }); }
    }
    return res(404, { error: "not found: " + url });
  };
  return { fetch, db, bank };
}

let server;
beforeEach(() => { server = fakeServer(); vi.stubGlobal("fetch", (u, o) => server.fetch(u, o)); });

async function register() {
  render(<App />);
  fireEvent.click(await screen.findByText("Create an account"));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Rudhra" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "r@x.co" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "longenough1" } });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  await screen.findByText("Welcome, Rudhra");
}
const tab = (name) => fireEvent.click(screen.getByRole("button", { name }));

describe("ECE GATE Prep", () => {
  it("shows the login screen when logged out, and rejects a wrong password", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Log in" });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "nobody@x.co" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrongpass1" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Incorrect email or password");
  });

  it("registers, and the first account is the administrator who can open the Question bank", async () => {
    await register();
    expect(screen.getByRole("button", { name: "Question bank" })).toBeTruthy();
  });

  it("CRUD: creates, reads, updates and deletes a question", async () => {
    await register();
    tab("Question bank");
    await screen.findByText("Pick the synonym of brief");                                   // Read
    fireEvent.click(screen.getByRole("button", { name: "Add question" }));                  // Create
    fireEvent.change(screen.getByLabelText(/Question text/), { target: { value: "New question about gain" } });
    fireEvent.change(screen.getByLabelText("Option A"), { target: { value: "ten" } });
    fireEvent.change(screen.getByLabelText("Option B"), { target: { value: "twenty" } });
    fireEvent.click(screen.getByLabelText("Correct option B"));
    fireEvent.click(screen.getByRole("button", { name: "Add question" }));
    expect((await screen.findByRole("status")).textContent).toBe("Question added.");
    const created = server.bank.find((q) => q.text === "New question about gain");
    expect(created.answer).toBe("B");
    expect(created.options).toEqual(["ten", "twenty"]);

    const row = () => screen.getByText("New question about gain").closest("tr");
    fireEvent.click(within(row()).getByText("Edit"));                                       // Update
    fireEvent.change(screen.getByLabelText(/Question text/), { target: { value: "Edited question about gain" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Question updated.");
    expect(server.bank.some((q) => q.text === "Edited question about gain")).toBe(true);
    expect(server.bank.some((q) => q.text === "New question about gain")).toBe(false);

    const row2 = () => screen.getByText("Edited question about gain").closest("tr");
    fireEvent.click(within(row2()).getByText("Delete"));                                    // Delete
    fireEvent.click(within(row2()).getByText("Yes"));
    await screen.findByText("Question deleted.");
    expect(screen.queryByText("Edited question about gain")).toBeNull();
    expect(server.bank.length).toBe(2);
  });

  it("mock test: starts, takes answers, submits, shows the result and the history", async () => {
    await register();
    tab("Mock test");
    fireEvent.click(await screen.findByText("I am ready to begin"));
    await screen.findByText("Question 1");
    fireEvent.click(screen.getByText("short"));
    fireEvent.click(screen.getByText("Save & Next"));
    await screen.findByText("Question 2");
    fireEvent.click(screen.getByRole("button", { name: "6" }));
    fireEvent.click(screen.getByText("Submit test"));
    fireEvent.click(screen.getByText("Yes, submit test"));
    await screen.findByRole("heading", { name: "Result" });
    expect(screen.getByText("3.00 / 3")).toBeTruthy();
    expect(screen.getAllByText("Solution.").length).toBe(2);
    tab("History");
    expect(await screen.findByText("3 / 3")).toBeTruthy();
  });

  it("paper builder: builds a paper, reports the shortfall, and starts it", async () => {
    await register();
    tab("Mock test");
    fireEvent.click(await screen.findByText("Build full GATE paper"));
    expect(await screen.findByText(/Core 1-mark \(25 missing\)/)).toBeTruthy();
    fireEvent.click(screen.getByText("Start this paper"));
    await screen.findByText("Question 1");
  });

  it("syllabus ticks are saved on the server", async () => {
    await register();
    tab("Syllabus");
    fireEvent.click((await screen.findAllByRole("checkbox"))[0]);
    await vi.waitFor(() => expect(server.db.progress).toEqual([10]));
  });

  it("log out returns to the login screen", async () => {
    await register();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    await screen.findByRole("heading", { name: "Log in" });
  });
});
