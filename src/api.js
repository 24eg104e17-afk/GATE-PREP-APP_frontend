// One place for all calls to the backend. api(url) reads, api(url, body) posts, api(url, body, "PUT" or "DELETE") changes data.
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (f) => { onUnauthorized = f; };

export async function api(url, body, method) {
  const opt = body === undefined ? {}
    : { method: method || "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const r = await fetch(url, opt);
  let j = {};
  try { j = await r.json(); } catch (e) { /* empty body */ }
  if (r.status === 401 && url !== "/api/auth/login") {
    onUnauthorized();
    const err = new Error("Please log in");
    err.auth = true;
    throw err;
  }
  if (!r.ok) throw new Error(j.error || "Request failed");
  return j;
}
