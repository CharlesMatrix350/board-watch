import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient, useAction, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
type Opportunity = { _id: string; title: string; source: string; prize?: string; deadline?: string; link: string; isNew: boolean };
import { ExternalLink, Mail, Radar, RefreshCw } from "lucide-react";
import "./styles.css";

function App() {
  const items = (useQuery(api.opportunities.list) ?? []) as Opportunity[];
  const scan = useAction(api.scan.run); const status = useQuery(api.opportunities.status);
  const settings = useQuery(api.opportunities.getSettings); const saveEmail = useMutation(api.opportunities.saveEmail);
  const [email, setEmail] = useState(""); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  const running = status?.status === "running";
  async function scanNow() { setMessage(""); try { const result = await scan({}); setMessage(`Scan complete — ${result.newCount} new opportunity${result.newCount === 1 ? "" : "ies"}.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Scan failed. Please try again."); } }
  async function submitEmail(e: React.FormEvent) { e.preventDefault(); if (!email.trim()) return; setSaving(true); await saveEmail({ email }); setSaving(false); setMessage("Digest email saved."); }
  return <main><header><div className="brand"><span className="brand-mark"><Radar size={22}/></span><span>Board Watch</span></div><button className="scan" onClick={scanNow} disabled={running}>{running ? <RefreshCw className="spin" size={18}/> : <RefreshCw size={18}/>} {running ? "Scanning boards…" : "Scan now"}</button></header>
    <section className="hero"><p className="eyebrow">Web3 opportunity radar</p><h1>Fresh opportunities,<br/><em>without the tab overload.</em></h1><p className="intro">Scan six official community boards at once. New listings rise to the top, and your digest arrives when there’s something worth seeing.</p><div className="stats"><span><b>{items.length}</b> tracked listings</span><span><b>{items.filter((item) => item.isNew).length}</b> new this scan</span><span>{status?.completedAt ? `Updated ${new Date(status.completedAt).toLocaleString()}` : "Ready for your first scan"}</span></div></section>
    <section className="digest"><div><Mail size={20}/><div><strong>Get the digest</strong><p>One email only when fresh opportunities appear.</p></div></div><form onSubmit={submitEmail}><input aria-label="Digest email" type="email" placeholder={settings?.digestEmail ?? "you@example.com"} value={email} onChange={(e) => setEmail(e.target.value)} /><button disabled={saving}>{saving ? "Saving…" : "Save email"}</button></form></section>
    {message && <p className="message" role="status">{message}</p>}
    <section className="list-heading"><div><p className="eyebrow">Live listings</p><h2>Opportunity feed</h2></div><span>{running ? "Fetching from boards" : `${items.length} listings`}</span></section>
    <section className="grid">{items.length ? items.map((item) => <article className={item.isNew ? "card new" : "card"} key={item._id}><div className="card-top"><span className="board">{item.source}</span>{item.isNew && <span className="badge">NEW</span>}</div><h3>{item.title}</h3><div className="metadata"><span>{item.prize ?? "Reward not listed"}</span><span>{item.deadline ? `Deadline: ${item.deadline}` : "Deadline not listed"}</span></div><a href={item.link} target="_blank" rel="noreferrer">Open listing <ExternalLink size={15}/></a></article>) : <div className="empty"><Radar size={28}/><h3>No listings yet</h3><p>Press <strong>Scan now</strong> to check Superteam, HUB, Scribble, cre8core, Gitcoin, and gib.work.</p></div>}</section>
  </main>;
}
const url = import.meta.env.VITE_CONVEX_URL;
createRoot(document.getElementById("root")!).render(<StrictMode>{url ? <ConvexProvider client={new ConvexReactClient(url)}><App/></ConvexProvider> : <div className="config">Add <code>VITE_CONVEX_URL</code> after running Convex setup.</div>}</StrictMode>);
