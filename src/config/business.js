// Single source of truth for business details. Set a field to null to hide it everywhere on the site.
export const business = {
  name: "Brew & Bloom Café",
  tagline: "Coffee · Food · Connection",
  hours: { label: "Monday–Sunday, 8:00 AM–6:00 PM", open: "08:00", close: "18:00" },
  // Pending client confirmation. Never put the .example demo addresses here.
  address: null,
  phone: null,
  publicEmail: null,
  instagram: null, // full URL, e.g. "https://instagram.com/<handle>"
  facebook: null,
  reservation: { maxGuests: 12, advanceDays: 90 },
};
