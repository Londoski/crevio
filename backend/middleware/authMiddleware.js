const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET is not configured.');
}

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }
        const token = authHeader.slice(7).trim();
        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication token is missing.' });
        }
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            console.error('JWT verification error:', err.message);
            return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
        }
        if (!decoded || !decoded.id) {
            return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
        }
        req.user = {
            id: decoded.id,
            username: decoded.username || null,
            email: decoded.email || null,
            role: decoded.role || 'creator'
        };
        next();
    } catch (err) {
        console.error('Authentication middleware error:', err);
        return res.status(500).json({ success: false, message: 'Authentication service error.' });
    }
};

module.exports = { authenticate };