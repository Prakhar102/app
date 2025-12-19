export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/billing/:path*',
    '/inventory/:path*',
    '/customers/:path*',
    '/reports/:path*',
    '/settings/:path*',
  ],
};
