import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker icons don't bundle correctly with Vite — build our own simple pins instead.
function pin(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}
const PICKUP_PIN = pin("#1AA260");
const DROPOFF_PIN = pin("#D8412E");

// A small SVG car (not an emoji, which renders inconsistently across
// OS/browsers) with a soft pulse ring so it's unmistakable as the "live"
// marker versus the static pickup/dropoff pins.
const CAR_PIN = L.divIcon({
  className: "",
  html: `
    <div style="position:relative; width:30px; height:30px;">
      <div style="position:absolute; inset:0; border-radius:50%; background:rgba(1,103,188,0.18); animation:syncPulse 1.6s ease-out infinite;"></div>
      <svg width="30" height="30" viewBox="0 0 24 24" style="position:relative;">
        <circle cx="12" cy="12" r="11" fill="#053867" stroke="#fff" stroke-width="2"/>
        <path d="M6.5 13.5l1-3.2c.2-.6.7-1 1.3-1h6.4c.6 0 1.1.4 1.3 1l1 3.2M6.5 13.5h11M6.5 13.5v1.8c0 .4.3.7.7.7h.6c.4 0 .7-.3.7-.7v-.8h6v.8c0 .4.3.7.7.7h.6c.4 0 .7-.3.7-.7v-1.8"
          fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="8.7" cy="14.6" r=".9" fill="#fff"/>
        <circle cx="15.3" cy="14.6" r=".9" fill="#fff"/>
      </svg>
    </div>
    <style>@keyframes syncPulse{0%{transform:scale(0.6);opacity:0.9}100%{transform:scale(1.6);opacity:0}}</style>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

/**
 * Fetches a real, road-snapped route between two points from OSRM's free
 * public routing server — no API key, no billing account. This is our own
 * chosen routing source; if it's ever unreachable, we fall back to a
 * straight line so the map never just breaks.
 */
export async function fetchRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes?.[0]) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }
  } catch {
    // fall through
  }
  return [[from.lat, from.lng], [to.lat, to.lng]];
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Keeps a route line updated as a position moves, instead of only fetching
 * it once at page load. Re-fetches from OSRM only when the position has
 * moved a meaningful distance (150m) OR enough time has passed (8s) since
 * the last fetch — a real per-second refresh would both look identical at
 * normal driving speed on a road-snapped line and would hit OSRM's free
 * public instance far harder than its usage policy allows. This throttle
 * is the honest version of "live" for a routing service with no API key.
 */
export function useLiveRoute(currentPos, destination) {
  const [coords, setCoords] = useState([]);
  const lastFetch = useRef({ pos: null, time: 0 });

  useEffect(() => {
    if (!currentPos || !destination) return;
    const now = Date.now();
    const last = lastFetch.current;
    const movedEnough = !last.pos || haversineMeters(last.pos, currentPos) > 150;
    const timeEnough = now - last.time > 8000;
    if (!last.pos || (movedEnough && timeEnough)) {
      lastFetch.current = { pos: currentPos, time: now };
      fetchRoute(currentPos, destination).then(setCoords);
    }
  }, [currentPos?.lat, currentPos?.lng, destination?.lat, destination?.lng]);

  return coords;
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) map.fitBounds(points, { padding: [40, 40] });
    else if (points.length === 1) map.setView(points[0], 13);
  }, [JSON.stringify(points)]);
  return null;
}

/**
 * A simple, dependency-light tracking map: pickup pin, drop-off pin, a
 * route line, and a live car marker. Pass `carPos` as {lat,lng} to move it.
 */
export default function TrackingMap({ pickup, dropoff, carPos, routeCoords, tripRouteCoords, height = "100%" }) {
  const points = [pickup, dropoff].filter(Boolean).map((p) => [p.lat, p.lng]);

  return (
    <MapContainer center={points[0] || [32.7, 74.85]} zoom={13} style={{ height, width: "100%" }} zoomControl={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {tripRouteCoords?.length > 1 && <Polyline positions={tripRouteCoords} pathOptions={{ color: "#9AA5AC", weight: 3, opacity: 0.6, dashArray: "6 8" }} />}
      {routeCoords?.length > 1 && <Polyline positions={routeCoords} pathOptions={{ color: "#0167BC", weight: 5, opacity: 0.85 }} />}
      {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={PICKUP_PIN} />}
      {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={DROPOFF_PIN} />}
      {carPos && <Marker position={[carPos.lat, carPos.lng]} icon={CAR_PIN} />}
      <FitBounds points={points} />
    </MapContainer>
  );
}
