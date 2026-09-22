const jwt = require('jsonwebtoken');
const userActivityService = require("../services/userActivityService");

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication token is missing.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
        }
        if (decoded.purpose) {
            return res.status(401).json({ success: false, message: 'Invalid token type.' });
        }
        req.user = {
            id: decoded.id,
            username: decoded.username || null,
            email: decoded.email || null,
            role: decoded.role || 'creator'
        ,
            token: token
        };
        try { userActivityService.trackActivity(req.user && req.user.id); } catch (e) {}
        next();
    } catch (err) {
        console.error('JWT verification error:', err.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
    }
};