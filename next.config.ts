import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep production output separate on local Windows dev so next dev and next build never collide.
  // Standard '.next' is used during development and on Vercel deployments.
  distDir: process.env.NODE_ENV === 'production' && !process.env.VERCEL ? '.next-production' : '.next',
  // Cache Components/PPR is not used by this application (there are no
  // `use cache` directives). Leaving it enabled caused Windows prerender
  // workers to race while creating `.segments` build directories.
  // The Windows sandbox can also deny concurrent writes to generated route
  // segment directories. Generate this small application through one worker
  // so production builds remain deterministic there.
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 100,
  },
  async redirects() {
    return [
      { source: '/login.html', destination: '/login', permanent: true },
      { source: '/register.html', destination: '/register', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/student-dashboard.html', destination: '/student', permanent: true },
      { source: '/admin-dashboard.html', destination: '/admin', permanent: true },
      { source: '/staff-dashboard.html', destination: '/staff', permanent: true },
      { source: '/otp.html', destination: '/verify-otp', permanent: true },
      { source: '/forgot-password.html', destination: '/forgot-password', permanent: true },
      { source: '/sos.html', destination: '/student/sos', permanent: true },
      { source: '/safe-walk.html', destination: '/student/safe-walk', permanent: true },
      { source: '/contacts.html', destination: '/student/contacts', permanent: true },
      { source: '/report.html', destination: '/student/report', permanent: true },
    ];
  },
};

export default nextConfig;
