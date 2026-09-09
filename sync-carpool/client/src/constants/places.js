// Shared across the ride form, tracking pages, and seed script.
// Best-effort approximation from public sources describing MIET's location
// (Kot Bhalwal, north-west of Jammu city, near Chak Bhalwal / the Tawi river)
// — not a surveyed exact geocode. If you have the real coordinates, update
// this one line and every route/map in the app follows automatically.
export const MIET = { lat: 32.812, lng: 74.797, label: "MIET Jammu, Kot Bhalwal" };

export const PICKUP_POINTS = [
  { value: "trikuta", label: "Trikuta Nagar", lat: 32.7196, lng: 74.858 },
  { value: "gandhi", label: "Gandhi Nagar", lat: 32.7332, lng: 74.8697 },
  { value: "bakshi", label: "Bakshi Nagar", lat: 32.728, lng: 74.863 },
  { value: "channi", label: "Channi Himmat", lat: 32.698, lng: 74.879 },
  { value: "roop", label: "Roop Nagar", lat: 32.7365, lng: 74.856 },
  { value: "janipur", label: "Janipur", lat: 32.744, lng: 74.839 },
  { value: "rehari", label: "Rehari Chungi", lat: 32.7147, lng: 74.8639 },
  { value: "shastri", label: "Shastri Nagar", lat: 32.7288, lng: 74.8574 },
  { value: "talab_tillo", label: "Talab Tillo", lat: 32.7238, lng: 74.8459 },
  { value: "sarwal", label: "Sarwal", lat: 32.7091, lng: 74.8517 },
  { value: "greater_kailash", label: "Greater Kailash", lat: 32.7015, lng: 74.8446 },
  { value: "narwal", label: "Narwal", lat: 32.6742, lng: 74.8695 },
  { value: "muthi", label: "Muthi", lat: 32.6656, lng: 74.8267 },
  { value: "bantalab", label: "Bantalab", lat: 32.7602, lng: 74.8214 },
  { value: "sainik_colony", label: "Sainik Colony", lat: 32.7469, lng: 74.8827 },
];

export function coordsFor(value) {
  const p = PICKUP_POINTS.find((p) => p.value === value);
  return p ? { lat: p.lat, lng: p.lng } : null;
}

export function labelFor(value) {
  const p = PICKUP_POINTS.find((p) => p.value === value);
  return p ? p.label : value;
}
