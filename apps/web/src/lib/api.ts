import type { HealthResponse } from '@starter/shared';

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  const response = await fetch(`${base}/api/health`, { signal });
  if (!response.ok) throw new Error(`API returned HTTP ${response.status}`);
  return response.json() as Promise<HealthResponse>;
}
