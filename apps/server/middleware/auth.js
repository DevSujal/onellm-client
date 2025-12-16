const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' })
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET)

        // Fetch user from database to ensure they still exist
        const user = await req.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, username: true, createdAt: true }
        })

        if (!user) {
            return res.status(401).json({ error: 'User not found' })
        }

        req.user = user
        next()
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' })
        }
        return res.status(403).json({ error: 'Invalid token' })
    }
}

const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

module.exports = { authenticateToken, generateToken, JWT_SECRET }
