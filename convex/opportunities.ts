import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

const listing = v.object({ title: v.string(), source: v.string(), prize: v.optional(v.string()), deadline: v.optional(v.string()), link: v.string() });

export const list = query({ args: {}, handler: async (ctx) => ctx.db.query("opportunities").withIndex("by_lastSeen").order("desc").take(250) });
export const status = query({ args: {}, handler: async (ctx) => (await ctx.db.query("scans").withIndex("by_startedAt").order("desc").first()) ?? null });
export const getSettings = query({ args: {}, handler: async (ctx) => (await ctx.db.query("settings").first()) ?? { digestEmail: undefined } });
export const saveEmail = mutation({ args: { email: v.string() }, handler: async (ctx, { email }) => { const setting = await ctx.db.query("settings").first(); if (setting) await ctx.db.patch(setting._id, { digestEmail: email.trim() }); else await ctx.db.insert("settings", { digestEmail: email.trim() }); } });
export const beginScan = internalMutation({ args: {}, handler: async (ctx) => ctx.db.insert("scans", { status: "running", startedAt: Date.now() }) });
export const failScan = internalMutation({ args: { scanId: v.id("scans"), error: v.string() }, handler: async (ctx, args) => ctx.db.patch(args.scanId, { status: "failed", error: args.error.slice(0, 500), completedAt: Date.now() }) });
export const finishScan = internalMutation({ args: { scanId: v.id("scans"), listings: v.array(listing) }, handler: async (ctx, args) => {
  const prior = await ctx.db.query("scans").withIndex("by_startedAt").order("desc").take(2);
  const priorScan = prior.find((scan) => scan._id !== args.scanId && scan.status === "completed");
  const priorRows = priorScan ? await ctx.db.query("scanListings").withIndex("by_scan", (q) => q.eq("scanId", priorScan._id)).take(1000) : [];
  const previousIds = new Set(priorRows.map((row) => row.opportunityId));
  for (const old of await ctx.db.query("opportunities").withIndex("by_isNew", (q) => q.eq("isNew", true)).take(500)) await ctx.db.patch(old._id, { isNew: false });
  const inserted = [];
  for (const item of args.listings.slice(0, 500)) {
    const existing = await ctx.db.query("opportunities").withIndex("by_title_link", (q) => q.eq("title", item.title).eq("link", item.link)).first();
    const id = existing ? existing._id : await ctx.db.insert("opportunities", { ...item, firstSeen: Date.now(), lastSeen: Date.now(), isNew: true });
    const isNew = !previousIds.has(id);
    await ctx.db.patch(id, { ...item, lastSeen: Date.now(), isNew });
    await ctx.db.insert("scanListings", { scanId: args.scanId, opportunityId: id, seenAt: Date.now() });
    if (isNew) inserted.push({ ...item, opportunityId: id });
  }
  await ctx.db.patch(args.scanId, { status: "completed", completedAt: Date.now(), newCount: inserted.length });
  return inserted;
} });
