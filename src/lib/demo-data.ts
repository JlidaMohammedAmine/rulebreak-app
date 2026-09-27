// Demo mode: pre-seeded analysis of Walmart's Return & Coupon Policies
// Source: https://corporate.walmart.com/policies

export const DEMO_POLICY_TEXT = `Walmart Return Policy & Coupon Policy

RETURN POLICY
Most items sold at Walmart can be returned within 90 days of purchase for a full refund or exchange.
Electronics and entertainment items must be returned within 30 days of purchase.
Opened software, music, movies, and video games may only be exchanged for the same title.
Items marked as Final Sale are non-returnable and non-refundable.
Walmart MoneyCard purchases and prepaid cards are non-refundable.
Without a receipt, Walmart may provide a refund on a Walmart shopping card (gift card) for the item's current selling price.
Walmart reserves the right to limit or refuse a return at any time and for any reason.
All returns require a valid government-issued photo ID.
Items purchased on Walmart.com can be returned to any Walmart store or shipped back within 90 days.
Online purchases of Final Sale items follow the same non-returnable policy as in-store.

COUPON POLICY
Walmart accepts one manufacturer coupon and one Walmart coupon per item.
Coupons must be presented at the time of purchase.
Walmart will accept a printed internet coupon only if it has a valid barcode.
Coupons cannot be used to purchase alcohol, tobacco, or firearms.
If a coupon value exceeds the item price, the excess may not be refunded as cash.
Customers may use coupons on Final Sale items.
Coupons cannot be used on Walmart.com purchases unless specified on the coupon.
Digital coupons applied through the Walmart app automatically reduce the item price at checkout.
Digital coupons and physical manufacturer coupons may both be applied to a single item simultaneously.`;

export const DEMO_RULES = [
  { id: "R01", statement: "Most items can be returned within 90 days for a full refund or exchange.", category: "time_limit", sourceId: "SRC-01", conditions: null, exceptions: null, action: null, precedence: null, confidence: "high" },
  { id: "R02", statement: "Items marked as Final Sale are non-returnable and non-refundable.", category: "restriction", sourceId: "SRC-02", conditions: null, exceptions: null, action: null, precedence: null, confidence: "high" },
  { id: "R03", statement: "Customers may use coupons on Final Sale items.", category: "action", sourceId: "SRC-03", conditions: null, exceptions: null, action: null, precedence: null, confidence: "high" },
  { id: "R04", statement: "If a coupon value exceeds the item price, the excess may not be refunded as cash.", category: "restriction", sourceId: "SRC-04", conditions: null, exceptions: null, action: null, precedence: null, confidence: "high" },
  { id: "R05", statement: "Items purchased on Walmart.com can be returned to any Walmart store within 90 days.", category: "action", sourceId: "SRC-05", conditions: null, exceptions: null, action: null, precedence: null, confidence: "high" },
  { id: "R06", statement: "Online purchases of Final Sale items follow the same non-returnable policy.", category: "restriction", sourceId: "SRC-06", conditions: null, exceptions: null, action: null, precedence: null, confidence: "high" },
  { id: "R07", statement: "Walmart reserves the right to limit or refuse a return at any time and for any reason.", category: "restriction", sourceId: "SRC-07", conditions: null, exceptions: null, action: null, precedence: null, confidence: "high" },
  { id: "R08", statement: "Digital coupons and physical manufacturer coupons may both be applied to a single item simultaneously.", category: "action", sourceId: "SRC-08", conditions: null, exceptions: null, action: null, precedence: null, confidence: "high" },
  { id: "R09", statement: "Coupons cannot be used on Walmart.com purchases unless specified on the coupon.", category: "restriction", sourceId: "SRC-09", conditions: null, exceptions: null, action: null, precedence: null, confidence: "high" },
];

export const DEMO_SCENARIOS = [
  { id: "S01", type: "CONTRADICTION" as const, title: "Final Sale item + Coupon = Negative refund?", narrative: "A customer uses a $20 coupon on a $15 Final Sale item. The policy allows coupons on Final Sale items (R03), but Final Sale items are non-refundable (R02). The coupon overage of $5 cannot be refunded as cash (R04). The customer has effectively paid -$5 but receives no goods and no refund, creating a financial trap.", targetRules: ["R02", "R03", "R04"] },
  { id: "S02", type: "AMBIGUOUS" as const, title: "Walmart.com Final Sale — store return loophole", narrative: "A customer purchases a Final Sale item on Walmart.com. R05 says online items can be returned to any store within 90 days. R06 says Final Sale online items follow the same non-returnable policy. However, R07 says Walmart 'may' refuse — implying it's discretionary. A store associate could interpret R05 as allowing the return.", targetRules: ["R05", "R06", "R07"] },
  { id: "S03", type: "CONTRADICTION" as const, title: "Double coupon on Walmart.com vs. digital coupon policy", narrative: "R09 says coupons cannot be used on Walmart.com purchases. R08 says digital coupons via the Walmart app automatically apply at checkout. A customer checks out on Walmart.com through the app — the digital coupon fires automatically. This directly contradicts R09, which prohibits coupon usage on Walmart.com.", targetRules: ["R08", "R09"] },
  { id: "S04", type: "MISSING_INFORMATION" as const, title: "Receipt-less return of a Final Sale item", narrative: "Without a receipt, Walmart may issue a gift card refund at the current selling price (per the no-receipt rule). But R02 says Final Sale items are non-returnable. The policy never explicitly addresses what happens when a Final Sale item is returned without a receipt — a complete gap in the rule set.", targetRules: ["R02", "R07"] },
];

export const DEMO_EVALUATIONS = [
  { scenarioId: "S01", status: "CONTRADICTION" as const, summary: "R02 prohibits any refund on Final Sale items. R03 explicitly permits coupons on Final Sale items. R04 blocks excess coupon value from being paid back as cash. Together these three rules create an impossible state where a customer applies a higher-value coupon to a Final Sale item and has no remedy — no goods returned, no cash back.", applicableRules: ["R02", "R03", "R04"], reasoning: "Direct logical contradiction between rules." },
  { scenarioId: "S02", status: "AMBIGUOUS" as const, summary: "R05 grants a right to return online items in-store. R06 restricts Final Sale online items. R07's 'any reason' phrasing makes R06 seem discretionary. The hierarchy between these three rules is undefined, creating an exploitable ambiguity.", applicableRules: ["R05", "R06", "R07"], reasoning: "Ambiguous precedence — no override rule defined." },
  { scenarioId: "S03", status: "CONTRADICTION" as const, summary: "R09 forbids coupon usage on Walmart.com. R08 states digital coupons auto-apply via the Walmart app — which is the primary interface for Walmart.com shopping. These two rules are mutually exclusive for any app-based online purchase.", applicableRules: ["R08", "R09"], reasoning: "Direct conflict — auto-apply mechanism violates explicit prohibition." },
  { scenarioId: "S04", status: "AMBIGUOUS" as const, summary: "The policy defines a no-receipt path (gift card at current price) but never carves out an exception for Final Sale items in that path. A store associate has no written guidance on whether to apply R02 or fall back to the general no-receipt policy.", applicableRules: ["R02", "R07"], reasoning: "Missing rule — policy gap." },
];

export const DEMO_FINDINGS = [
  {
    id: "F01",
    type: "CONTRADICTION" as const,
    severity: "HIGH" as const,
    ruleIds: ["R02", "R03", "R04"],
    description: "Coupon on Final Sale Creates Irresolvable Financial State",
    evidence: "R02: 'Final Sale items are non-returnable and non-refundable.' R03: 'Customers may use coupons on Final Sale items.' R04: 'If a coupon value exceeds the item price, the excess may not be refunded as cash.' A coupon worth more than the Final Sale item price leaves the customer with no goods and no refund — a financial deadlock.",
    scenarioIds: ["S01"],
  },
  {
    id: "F02",
    type: "CONTRADICTION" as const,
    severity: "HIGH" as const,
    ruleIds: ["R08", "R09"],
    description: "Digital Coupon Auto-Apply Contradicts Walmart.com Coupon Ban",
    evidence: "R09 explicitly bans coupon usage on Walmart.com. R08 states digital coupons through the Walmart app 'automatically reduce the item price at checkout.' Since the Walmart app IS the Walmart.com checkout interface, R08 and R09 are directly irreconcilable for any app-based purchase.",
    scenarioIds: ["S03"],
  },
  {
    id: "F03",
    type: "AMBIGUITY" as const,
    severity: "MEDIUM" as const,
    ruleIds: ["R05", "R06", "R07"],
    description: "Discretionary Override Clause Undermines Final Sale Online Return Prohibition",
    evidence: "R07 grants Walmart the right to 'limit OR refuse' a return 'for any reason' — but this sword cuts both ways. A store associate could interpret this as permission to ALLOW a Final Sale online return, circumventing R06's explicit prohibition.",
    scenarioIds: ["S02"],
  },
  {
    id: "F04",
    type: "MISSING_RULE" as const,
    severity: "MEDIUM" as const,
    ruleIds: ["R02", "R07"],
    description: "No-Receipt Return Path Undefined for Final Sale Items",
    evidence: "The policy defines a specific no-receipt return path (gift card at current price) but contains zero language excluding Final Sale items from it. Associates have no authoritative rule to resolve a no-receipt return attempt on a Final Sale item.",
    scenarioIds: ["S04"],
  },
];
