const isProd = process.env.NODE_ENV === 'production';

const csp = (frameAncestors) =>
  [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com",
    "media-src 'self' blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
    `frame-ancestors ${frameAncestors}`,
  ].join('; ');

const base = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/** @type {import('next').NextConfig} */
export default {
  // `NEXT_OUTPUT=standalone` is set by the Dockerfile only; Vercel / PM2 use the default output.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/widget.js', destination: '/api/widget-script' }];
  },
  async headers() {
    return [
      {
        // Everything except the embeddable widget page can never be framed.
        source: '/((?!embed/).*)',
        headers: [
          ...base,
          { key: 'X-Frame-Options', value: 'DENY' },
          ...(isProd ? [{ key: 'Content-Security-Policy', value: csp("'none'") }] : []),
        ],
      },
      {
        // The widget iframe must be embeddable on customer sites. The page itself checks the
        // parent origin against the business's allow-list (see src/app/embed).
        source: '/embed/:path*',
        headers: [
          ...base,
          ...(isProd ? [{ key: 'Content-Security-Policy', value: csp('*') }] : []),
        ],
      },
    ];
  },
};
