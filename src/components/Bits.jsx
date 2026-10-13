export const Loading = () => <div className="panel mute">Loading…</div>;
export const Problem = ({ msg }) => (
  <div className="panel"><h3>Could not load</h3><p className="mute">{msg}. Check that the backend is running and try again.</p></div>
);
export const Ext = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontWeight: 600 }}>{children}</a>
);
