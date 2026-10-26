import { TIMEZONE } from "./config";

type Num = number | string | { toString(): string };

export function toNumber(v: Num): number {
  return typeof v === "number" ? v : Number(v.toString());
}

export function money(v: Num): string {
  return (
    "RD$ " +
    toNumber(v).toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  );
}

export function digitsFor(totalTickets: number): number {
  return String(totalTickets).length;
}

export function padTicket(n: number, totalTickets: number): string {
  return String(n).padStart(digitsFor(totalTickets), "0");
}

export function formatDate(d: Date | string, withTime = true): string {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(d));
}

/** Normaliza un teléfono dominicano a 10 dígitos (809/829/849 + 7). */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return /^(809|829|849)\d{7}$/.test(d) ? d : null;
}

export function maskName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w : w[0] + "."))
    .join(" ");
}

export function maskPhone(phone: string): string {
  return phone.slice(0, 3) + "-***-" + phone.slice(-4);
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
