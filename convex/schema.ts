import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  scans: defineTable({ status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")), startedAt: v.number(), completedAt: v.optional(v.number()), newCount: v.optional(v.number()), error: v.optional(v.string()) }).index("by_startedAt", ["startedAt"]),
  opportunities: defineTable({ title: v.string(), source: v.string(), prize: v.optional(v.string()), deadline: v.optional(v.string()), link: v.string(), firstSeen: v.number(), lastSeen: v.number(), isNew: v.boolean() }).index("by_title_link", ["title", "link"]).index("by_lastSeen", ["lastSeen"]).index("by_isNew", ["isNew"]),
  scanListings: defineTable({ scanId: v.id("scans"), opportunityId: v.id("opportunities"), seenAt: v.number() }).index("by_scan", ["scanId"]).index("by_scan_opportunity", ["scanId", "opportunityId"]),
  settings: defineTable({ digestEmail: v.optional(v.string()) }),
});
