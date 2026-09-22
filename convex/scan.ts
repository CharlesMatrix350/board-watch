"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { AgentMailClient } from "agentmail";

const boards = [
  ["Superteam Earn", "https://earn.superteam.fun/"], ["HUB by AP Collective", "https://hub.apcollective.xyz/"],
  ["Scribble Network", "https://scribble.network/"], ["cre8core", "https://cre8core.xyz/"],
  ["Gitcoin", "https://gitcoin.co/grants/"], ["gib.work", "https://gib.work/"],
] as const;
type Listing = { title: string; source: string; prize?: string; deadline?: string; link: string };

function absolute(href: string, base: string) { try { return new URL(href, base).toString(); } catch { return base; } }
function extract(markdown: string, source: string, boardUrl: string): Listing[] {
  const seen = new Set<string>(); const results: Listing[] = [];
  for (const match of markdown.matchAll(/\[([^\]]{3,180})\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g)) {
    const title = match[1].replace(/\s+/g, " ").trim(); const link = absolute(match[2], boardUrl);
    if (/^(home|about|login|sign up|menu|privacy|terms)$/i.test(title) || seen.has(`${title}|${link}`)) continue;
    seen.add(`${title}|${link}`);
    const nearby = markdown.slice(Math.max(0, match.index! - 240), match.index! + match[0].length + 240);
    const prize = nearby.match(/(?:\$|USD\s?)\s?[\d,.]+(?:\s?(?:USDC|USD|SOL|ETH))?/i)?.[0];
    const deadline = nearby.match(/(?:deadline|due|ends?)\s*[:\-]?\s*([^\n|]{3,60})/i)?.[1]?.trim();
    results.push({ title, source, link, ...(prize ? { prize } : {}), ...(deadline ? { deadline } : {}) });
    if (results.length >= 100) break;
  }
  return results;
}
async function crawlBoard(source: string, url: string, apiKey: string): Promise<Listing[]> {
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ url, formats: ["markdown"] }) });
  if (!response.ok) throw new Error(`${source}: Firecrawl returned ${response.status}`);
  const payload = await response.json() as { data?: { markdown?: string } }; return extract(payload.data?.markdown ?? "", source, url);
}
function digest(items: Listing[]) { return items.map((item) => `• ${item.title} — ${item.source}${item.prize ? ` (${item.prize})` : ""}${item.deadline ? ` — deadline: ${item.deadline}` : ""}\n  ${item.link}`).join("\n\n"); }

export const run = action({ args: {}, handler: async (ctx) => {
  const scanId = await ctx.runMutation(internal.opportunities.beginScan, {});
  try {
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlKey) throw new Error("FIRECRAWL_API_KEY is not configured.");
    const settled = await Promise.allSettled(boards.map(([source, url]) => crawlBoard(source, url, firecrawlKey)));
    const listings = settled.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    if (!listings.length) throw new Error("No listings could be extracted. Check Firecrawl access or board availability.");
    const newListings = await ctx.runMutation(internal.opportunities.finishScan, { scanId, listings });
    const settings = await ctx.runQuery(api.opportunities.getSettings, {});
    if (newListings.length && settings.digestEmail && process.env.AGENTMAIL_API_KEY && process.env.AGENTMAIL_INBOX_ID) {
      const client = new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY });
      await client.inboxes.messages.send(process.env.AGENTMAIL_INBOX_ID, { to: [settings.digestEmail], subject: `Board Watch: ${newListings.length} new opportunities found`, text: digest(newListings) });
    }
    return { newCount: newListings.length, skippedBoards: settled.filter((result) => result.status === "rejected").length };
  } catch (error) { await ctx.runMutation(internal.opportunities.failScan, { scanId, error: error instanceof Error ? error.message : "Scan failed" }); throw error; }
} });
