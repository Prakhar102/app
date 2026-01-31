import { getToken } from 'next-auth/jwt';

const protect = async (req, res, next) => {
    try {
        console.log('--- Auth Middleware Debug ---');
        console.log('Headers Cookies:', req.headers.cookie);
        // console.log('Env Secret:', process.env.NEXTAUTH_SECRET); // Don't log secrets in prod

        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET,
            secureCookie: process.env.NEXTAUTH_URL?.startsWith('https://')
        });

        console.log('Decoded Token:', token ? 'Found' : 'Not Found');

        if (!token) {
            return res.status(401).json({ error: 'Not authorized, no token' });
        }

        req.user = token;
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(401).json({ error: 'Not authorized' });
    }
};

export { protect };
