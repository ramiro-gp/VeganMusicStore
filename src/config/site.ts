export const siteConfig = {
  name: 'Vegan Music Store',
  description: 'Compra, venta e importación de discos y vinilos en Almagro, Buenos Aires. Catálogo y pedidos a medida, con envíos nacionales e internacionales.',
  locale: 'es-AR',
  contact: {
    // Único lugar para el número. Usar código internacional, sin + ni espacios.
    whatsappNumber: '5491158974298' as string | null,
  },
  address: {
    street: 'Medrano 529',
    neighborhood: 'Almagro',
    city: 'Ciudad Autónoma de Buenos Aires',
    region: 'CABA',
    country: 'AR',
    display: 'Medrano 529 — Almagro, CABA',
  },
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Medrano%20529%2C%20Almagro%2C%20CABA',
  mapsEmbedUrl: 'https://www.google.com/maps?q=Medrano%20529%2C%20Almagro%2C%20CABA&output=embed',
  social: [] as { label: string; url: string }[],
  catalog: {
    csvUrl: 'https://docs.google.com/spreadsheets/d/1ux6tu3l2bwC_gwFLL83aTMGz2JfYG-8-/export?format=csv&gid=1052727913',
    timeoutMs: 15000,
  },
  messages: {
    general: 'Hola Vegan Music Store, quería hacerles una consulta.',
    order: 'Hola Vegan Music Store, estoy buscando un disco. ¿Me ayudan a conseguirlo?',
    import: 'Hola Vegan Music Store, me gustaría consultar el costo y la disponibilidad de un disco a pedido. ¿Me ayudan a conseguirlo?',
    sell: 'Hola Vegan Music Store, quería consultarles por la venta de unos discos.',
  },
} as const;
