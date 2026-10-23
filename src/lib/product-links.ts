export function imageUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port ? url.href : null;
  } catch { return null; }
}

export function purchaseUrl(value: string): string | null {
  const safe = imageUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  return url.hostname.endsWith('.empretienda.com.ar') ? safe : null;
}
