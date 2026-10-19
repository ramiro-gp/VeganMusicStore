import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

const production = process.env.SITE_MODE === 'production';
const variant = process.env.SITE_VARIANT ?? 'v1';
if (variant !== 'v1' && variant !== 'v2') {
  throw new Error(`SITE_VARIANT debe ser v1 o v2. Valor recibido: ${variant}`);
}
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const site = process.env.SITE_URL || (vercelDomain ? `https://${vercelDomain}` : 'http://localhost:4321');
if (production && (!process.env.SITE_URL || !site.startsWith('https://') || new URL(site).hostname === 'localhost')) {
  throw new Error('Producción requiere SITE_URL con la URL HTTPS real del negocio.');
}

export default defineConfig({
  output: 'static',
  site,
  trailingSlash: 'always',
  integrations: production ? [sitemap({ filter: url => {
    const pathname = new URL(url).pathname;
    return !['/404/', '/404.html', '/carrito/'].includes(pathname) && !(variant === 'v2' && pathname === '/catalogo/');
  } })] : [],
  vite: { plugins: [tailwindcss()] },
});
