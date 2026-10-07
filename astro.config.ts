import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

const production = process.env.SITE_MODE === 'production';
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const site = process.env.SITE_URL || (vercelDomain ? `https://${vercelDomain}` : 'http://localhost:4321');
if (production && (!process.env.SITE_URL || !site.startsWith('https://') || new URL(site).hostname === 'localhost')) {
  throw new Error('Producción requiere SITE_URL con la URL HTTPS real del negocio.');
}

export default defineConfig({
  output: 'static',
  site,
  trailingSlash: 'always',
  integrations: production ? [sitemap({ filter: url => !url.endsWith('/404/') })] : [],
  vite: { plugins: [tailwindcss()] },
});
