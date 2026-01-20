export type RiskLevel = "low" | "medium" | "high";

export function getRiskLevel(score: number, hasFlaggedUrl: boolean): RiskLevel {
  if (hasFlaggedUrl) return "high";
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function getGuidance(level: RiskLevel) {
  switch (level) {
    case "high":
      return {
        title: "What to do next",
        bullets: [
          "Don’t click links or open attachments in this message.",
          "Verify through an official channel (type the official website yourself or call the official number).",
          "Block the sender and delete the message.",
          "Report the message with evidence (screenshots, URL, timestamp).",
        ],
      };
    case "medium":
      return {
        title: "What to do next",
        bullets: [
          "Be cautious: avoid clicking links until verified.",
          "Verify the sender independently (official site/app or official contact).",
          "Never share OTP/password/PIN or payment details via message.",
          "If unsure, report or ask the organization using an official channel.",
        ],
      };
    default:
      return {
        title: "What to do next",
        bullets: [
          "No obvious risk found, but stay cautious.",
          "If you weren’t expecting this message, verify via official channels.",
          "Avoid sharing OTP/password/PIN or payment details via message.",
        ],
      };
  }
}
