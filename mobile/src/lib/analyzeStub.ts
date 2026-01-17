export type UrlVerdict = "unknown" | "flagged" | "clean";

export type Reason = {
  code: string;
  title: string;
  detail: string;
};

export type UrlCheck = {
  url: string;
  verdict: UrlVerdict;
};

export type AnalysisResult = {
  score: number; // 0–100 (higher = more authentic/safer)
  reasons: Reason[];
  urls: UrlCheck[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  // Trim common trailing punctuation from pasted messages
  return matches.map((u) => u.replace(/[),.?!:;"'’]+$/g, ""));
}

function containsAny(text: string, needles: string[]) {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n));
}

export function analyzeMessageStub(text: string): AnalysisResult {
  const urls = extractUrls(text).map((url) => ({ url, verdict: "unknown" as const }));

  const t = text.toLowerCase();

  const hasUrl = urls.length > 0;

  const hasUrgency = containsAny(t, [
    "urgent",
    "immediately",
    "now",
    "act fast",
    "limited time",
    "expires",
    "suspended",
    "locked",
    "final notice",
    "within 24",
    "within 12",
    "today",
  ]);

  const asksForOtpOrPassword = containsAny(t, [
    "otp",
    "one time password",
    "one-time password",
    "verification code",
    "passcode",
    "password",
    "pin",
  ]);

  const impersonationCues = containsAny(t, [
    "bank",
    "emirates",
    "police",
    "customs",
    "delivery",
    "dhl",
    "fedex",
    "aramex",
    "post",
    "support",
    "account team",
  ]);

  const asksToClick = containsAny(t, ["click", "tap", "open the link", "verify here", "confirm here"]);

  const shortenedLink = urls.some((u) =>
    /(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|is\.gd|rb\.gy)\b/i.test(u.url)
  );

  // Score starts high and we subtract risk signals
  let score = 100;
  const reasons: Reason[] = [];

  if (asksForOtpOrPassword) {
    score -= 45;
    reasons.push({
      code: "REQ_SENSITIVE",
      title: "Requests sensitive information",
      detail: "Message asks for OTP/password/PIN or a verification code.",
    });
  }

  if (hasUrgency) {
    score -= 20;
    reasons.push({
      code: "URGENCY",
      title: "Urgency / time pressure",
      detail: "Message uses urgency language to rush the user.",
    });
  }

  if (hasUrl && asksToClick) {
    score -= 20;
    reasons.push({
      code: "CLICK_LINK",
      title: "Pushes you to click a link",
      detail: "Message contains a URL and encourages clicking/tapping it.",
    });
  }

  if (shortenedLink) {
    score -= 15;
    reasons.push({
      code: "SHORT_URL",
      title: "Shortened URL",
      detail: "Short links can obscure the real destination.",
    });
  }

  if (impersonationCues) {
    score -= 10;
    reasons.push({
      code: "IMPERSONATION",
      title: "Possible impersonation cues",
      detail: "Message references an institution/service name that could be spoofed.",
    });
  }

  // Keep score in bounds
  score = clamp(score, 0, 100);

  // Ensure we always show at least one reason when risky
  if (reasons.length === 0 && hasUrl) {
    reasons.push({
      code: "URL_PRESENT",
      title: "Contains a URL",
      detail: "Links in unsolicited messages should be treated cautiously.",
    });
  }

  return { score, reasons: reasons.slice(0, 5), urls };
}