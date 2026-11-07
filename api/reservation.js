import { Resend } from "resend";
import { validate, clean } from "./_lib/validate.js";
// NOTE: in-memory maps are per serverless instance, so this is best-effort only. Use Upstash Redis / Vercel KV for real rate limits.
const hits = new Map(), seen = new Map();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method_not_allowed" });
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed && req.headers.origin !== allowed) return res.status(403).json({ ok: false, error: "forbidden" });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown", now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 600000);
  if (recent.length >= 5) return res.status(429).json({ ok: false, error: "rate_limited" });
  hits.set(ip, [...recent, now]);
  const b = typeof req.body === "object" && req.body ? req.body : {};
  if (b.website) return res.status(200).json({ ok: true }); // honeypot: silently drop bots
  if (!Number(b.startedAt) || now - Number(b.startedAt) < 3000) return res.status(400).json({ ok: false, error: "too_fast" });
  const { errors, data, ok } = validate(b, now);
  if (!ok) return res.status(422).json({ ok: false, error: "validation", fields: errors });
  const rid = clean(b.requestId, 64);
  if (!rid) return res.status(400).json({ ok: false, error: "missing_request_id" });
  if (seen.has(rid)) return res.status(200).json({ ok: true, duplicate: true });
  const { RESEND_API_KEY, RESERVATION_TO_EMAIL, RESERVATION_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !RESERVATION_TO_EMAIL || !RESERVATION_FROM_EMAIL) return res.status(503).json({ ok: false, error: "not_configured" });
  try {
    const { data: sent, error } = await new Resend(RESEND_API_KEY).emails.send({
      from: RESERVATION_FROM_EMAIL, to: RESERVATION_TO_EMAIL, replyTo: data.email,
      subject: `Reservation inquiry: ${data.name}, ${data.date} ${data.time}, ${data.guests} guests`,
      text: `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nDate: ${data.date}\nTime: ${data.time}\nGuests: ${data.guests}\nRequests: ${data.requests || "None"}`,
      html: `<h2>New reservation inquiry</h2><p><b>Name:</b> ${esc(data.name)}<br><b>Email:</b> ${esc(data.email)}<br><b>Phone:</b> ${esc(data.phone)}<br><b>Date:</b> ${esc(data.date)}<br><b>Time:</b> ${esc(data.time)}<br><b>Guests:</b> ${data.guests}</p><p><b>Special requests:</b><br>${esc(data.requests || "None").replace(/\n/g, "<br>")}</p>`,
    }, { idempotencyKey: rid });
    if (error) return res.status(502).json({ ok: false, error: "send_failed" });
    seen.set(rid, now);
    return res.status(200).json({ ok: true, id: sent?.id });
  } catch {
    return res.status(502).json({ ok: false, error: "send_failed" });
  }
}
