const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY; // Use a strong secret key, possibly from environment variables.

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) {
        return res.status(401).send('Authentication token is missing.');
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Attach decoded payload to request object
        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        return res.status(403).send('Invalid or expired token.');
    }
};

module.exports = authMiddleware;
