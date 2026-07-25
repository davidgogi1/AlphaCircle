import { Request } from 'express';

export interface GeoInfo {
  lat:     number;
  lon:     number;
  city:    string;
  country: string;
}

const PRIVATE_IP_RE = /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1$|f[cd][0-9a-f]{2}:)/i;

export function isPrivateIp(ip: string): boolean {
  return !ip || PRIVATE_IP_RE.test(ip);
}

// Cloudflare-proxied — prefer its single-value client-IP header, then the
// standard proxy chain header, then whatever Express itself resolved.
export function extractIp(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'] as string | undefined;
  if (cfIp) return cfIp.trim();
  const xff = req.headers['x-forwarded-for'] as string | undefined;
  if (xff) return xff.split(',')[0].trim();
  return req.ip ?? '';
}

export async function lookupIp(ip: string): Promise<GeoInfo | null> {
  if (isPrivateIp(ip)) return null;
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,lat,lon,city,country`,
      { signal: AbortSignal.timeout(3000) },
    );
    const data = await res.json() as { status: string; lat: number; lon: number; city: string; country: string };
    if (data.status !== 'success') return null;
    return { lat: data.lat, lon: data.lon, city: data.city, country: data.country };
  } catch {
    return null;
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// "Impossible travel": would getting from the previous login's location to
// this one, in the time elapsed, require exceeding commercial flight speed?
export function isImpossibleTravel(prev: GeoInfo, prevAt: Date, next: GeoInfo, nextAt: Date): boolean {
  const distKm = haversineKm(prev.lat, prev.lon, next.lat, next.lon);
  if (distKm < 80) return false; // same metro area — never flag

  const hours = Math.max((nextAt.getTime() - prevAt.getTime()) / 3_600_000, 1 / 60); // floor at 1 minute
  const speedKmh = distKm / hours;
  return speedKmh > 900; // faster than a commercial jet cruises
}
