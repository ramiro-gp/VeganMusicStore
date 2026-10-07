import type { APIRoute } from 'astro';
export const GET: APIRoute = ({ site }) => {
  const production = process.env.SITE_MODE === 'production';
  return new Response(`User-agent: *\nAllow: /\n${production && site ? `\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n` : ''}`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
