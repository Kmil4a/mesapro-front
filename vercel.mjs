const renderUrl = process.env.RENDER_API_ORIGIN;

if (process.env.VERCEL_ENV === 'production' && !renderUrl) {
  throw new Error('Configura RENDER_API_ORIGIN con la URL del backend en Render.');
}

const apiRewrites = [];
if (renderUrl) {
  const backend = new URL(renderUrl);
  if (backend.protocol !== 'https:' || renderUrl.replace(/\/$/, '') !== backend.origin) {
    throw new Error('RENDER_API_ORIGIN debe ser un origen HTTPS sin ruta.');
  }
  apiRewrites.push({
    source: '/api/:path*',
    destination: `${backend.origin}/api/:path*`,
  });
}

export const config = {
  framework: 'vite',
  rewrites: [
    ...apiRewrites,
    { source: '/(.*)', destination: '/index.html' },
  ],
};
