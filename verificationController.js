// =========================================================
// CREVIO — VERIFICATION CONTROLLER (Minimal)
// =========================================================

const verifyEmail = (req, res) => {
    res.json({ success: true, message: 'Email verification endpoint (placeholder).' });
};

const resendVerification = (req, res) => {
    res.json({ success: true, message: 'Resend verification endpoint (placeholder).' });
};

const verifyPhone = (req, res) => {
    res.json({ success: true, message: 'Phone verification endpoint (placeholder).' });
};

const sendPhoneVerification = (req, res) => {
    res.json({ success: true, message: 'Send phone verification endpoint (placeholder).' });
};

const forgotPassword = (req, res) => {
    res.json({ success: true, message: 'Forgot password endpoint (placeholder).' });
};

const resetPassword = (req, res) => {
    res.json({ success: true, message: 'Reset password endpoint (placeholder).' });
};

module.exports = {
    verifyEmail,
    resendVerification,
    verifyPhone,
    sendPhoneVerification,
    forgotPassword,
    resetPassword
};