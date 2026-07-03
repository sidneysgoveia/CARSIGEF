import https from 'https';

export default function handler(req, res) {
  // Preserve query string
  const queryIndex = req.url.indexOf('?');
  const queryString = queryIndex !== -1 ? req.url.slice(queryIndex) : '';
  const targetUrl = `https://geoserver.car.gov.br/geoserver/sicar/ows${queryString}`;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Use https module with rejectUnauthorized: false to bypass SSL Handshake issues
  https.get(targetUrl, { rejectUnauthorized: false }, (proxyRes) => {
    res.status(proxyRes.statusCode);
    res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json');
    proxyRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: err.message, url: targetUrl });
  });
}
