import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const logo = (await sharp('src/assets/brand/vegan-music-store.png').resize({ width: 550 }).png().toBuffer()).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#f5f1f7"/><path d="M44 44H1156" stroke="#211c27"/>
<image x="44" y="98" width="550" height="351" href="data:image/png;base64,${logo}"/>
<g font-family="Arial,sans-serif" fill="#211c27"><text x="44" y="80" font-size="16" letter-spacing="2">DISCOS / VINILOS / IMPORTACIÓN</text><text x="44" y="496" font-size="24">Ese disco que venís buscando.</text><text x="44" y="568" font-size="18">Medrano 529 — Almagro, Buenos Aires.</text></g>
<g transform="translate(674 154)"><circle cx="255" cy="150" r="148" fill="#17151b"/><g stroke="#39343f" fill="none"><circle cx="255" cy="150" r="138"/><circle cx="255" cy="150" r="126"/><circle cx="255" cy="150" r="114"/><circle cx="255" cy="150" r="102"/><circle cx="255" cy="150" r="90"/></g><circle cx="255" cy="150" r="43" fill="#eee7f2"/><circle cx="255" cy="150" r="5" fill="#17151b"/><g transform="rotate(-4 130 150)"><rect width="275" height="300" fill="#9c84c3"/><g fill="#211c27" font-family="Arial,sans-serif"><text x="20" y="30" font-size="10">VEGAN MUSIC STORE / VMS—001</text><text x="20" y="125" font-size="52" font-weight="900">KEEP</text><text x="20" y="182" font-size="44" font-weight="900">DIGGING.</text><text x="20" y="272" font-size="10">BUENOS AIRES / ARGENTINA</text></g></g></g></svg>`;
await writeFile('public/og-cover.svg', svg);
await sharp(await readFile('public/og-cover.svg')).png().toFile('public/og-cover.png');
