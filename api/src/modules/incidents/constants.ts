// Pure constants (no SDK imports) so prompt/eval code and unit tests can load them cheaply.
export const INCIDENT_CATEGORIES = ["URGENT", "BULLYING", "MEDICAL", "UNSAFE", "RULE", "WELLBEING", "OTHER"] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_STATUSES = ["SUBMITTED", "ACKNOWLEDGED", "RESPONDING", "RESOLVED"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

/** Persisted priority: CRITICAL = immediate danger (red signal); URGENT = medical / time-sensitive; NORMAL otherwise. */
export const INCIDENT_SEVERITIES = ["CRITICAL", "URGENT", "NORMAL"] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const LOCATION_SOURCES = ["QR", "MANUAL"] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];

export const DESCRIPTION_MAX = 1000;

export const CATEGORY_LABEL_MN: Record<IncidentCategory, string> = {
  URGENT: "Яаралтай аюул / Зодоон",
  BULLYING: "Дээрэлхэлт",
  MEDICAL: "Эмнэлгийн тусламж",
  UNSAFE: "Аюултай орчин",
  RULE: "Дүрэм зөрчсөн / Vape",
  WELLBEING: "Ярилцах хэрэгтэй байна",
  OTHER: "Бусад",
};

export function severityFor(category: IncidentCategory, isImmediateDanger: boolean): IncidentSeverity {
  if (isImmediateDanger || category === "URGENT") return "CRITICAL";
  if (category === "MEDICAL") return "URGENT";
  return "NORMAL";
}

/**
 * Deterministic responder routing by category → staff capability.
 * Matched against membership `supportKind` and extra `roles`; if nobody matches, the incident
 * stays unassigned and the UI says so honestly (no fake named teacher).
 */
export const ROUTING: Record<IncidentCategory, string[]> = {
  URGENT: ["DUTY_TEACHER", "SAFEGUARDING_LEAD", "NURSE"],
  BULLYING: ["DUTY_TEACHER", "SAFEGUARDING_LEAD", "SOCIAL_WORKER"],
  MEDICAL: ["NURSE", "DUTY_TEACHER"],
  UNSAFE: ["DUTY_TEACHER"],
  RULE: ["DUTY_TEACHER"],
  WELLBEING: ["SOCIAL_WORKER", "PSYCHOLOGIST"],
  OTHER: ["DUTY_TEACHER"],
};
