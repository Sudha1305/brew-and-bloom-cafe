import { business } from "../../src/config/business.js";
export const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
const ist = (ms) => new Date(ms + 5.5 * 3600e3).toISOString().slice(0, 10);
export function validate(b = {}, now = Date.now()) {
  const errors = {};
  const d = { name: clean(b.name, 80), email: clean(b.email, 254), phone: clean(b.phone, 25), date: clean(b.date, 10), time: clean(b.time, 5), guests: Number(b.guests), requests: String(b.requests ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, 1000) };
  if (d.name.length < 2) errors.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errors.email = "Enter a valid email address.";
  const digits = d.phone.replace(/[\s()+-]/g, "");
  if (!/^\d{7,15}$/.test(digits)) errors.phone = "Enter a valid phone number.";
  const real = /^\d{4}-\d{2}-\d{2}$/.test(d.date) && new Date(d.date + "T00:00:00Z").toISOString().slice(0, 10) === d.date;
  const { advanceDays, maxGuests } = business.reservation;
  if (!real || d.date < ist(now) || d.date > ist(now + advanceDays * 864e5)) errors.date = "Choose a date from today to " + advanceDays + " days ahead.";
  if (!/^\d{2}:\d{2}$/.test(d.time) || d.time < business.hours.open || d.time >= business.hours.close) errors.time = "Choose a time within opening hours (" + business.hours.label + ").";
  if (!Number.isInteger(d.guests) || d.guests < 1 || d.guests > maxGuests) errors.guests = "Guests must be between 1 and " + maxGuests + ".";
  return { errors, data: d, ok: Object.keys(errors).length === 0 };
}
