import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['lucide-react'],
  experimental: {
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 100,
    optimizePackageImports: ['lucide-react'],
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
