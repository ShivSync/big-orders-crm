export function maskPhone(phone: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\s/g, "");
  if (cleaned.length < 6) return "***";
  return cleaned.slice(0, 4) + "***" + cleaned.slice(-3);
}

export function maskEmail(email: string | null): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  if (!local || local.length === 0) return "***@" + domain;
  if (local.length <= 2) return local[0] + "***@" + domain;
  return local[0] + "***" + local[local.length - 1] + "@" + domain;
}
