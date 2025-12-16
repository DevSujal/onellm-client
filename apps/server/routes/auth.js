const express = require('express')
const bcrypt = require('bcryptjs')
const { generateToken } = require('../middleware/auth')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body

        // Validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' })
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' })
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' })
        }

        // Check if username already exists
        const existingUser = await req.prisma.user.findUnique({
            where: { username: username.toLowerCase() }
        })

        if (existingUser) {
            return res.status(409).json({ error: 'Username already taken' })
        }

        // Hash password
        const saltRounds = 12
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        // Create user with default settings
        const user = await req.prisma.user.create({
            data: {
                username: username.toLowerCase(),
                password: hashedPassword,
                settings: {
                    create: {} // Create with defaults
                }
            },
            select: {
                id: true,
                username: true,
                createdAt: true
            }
        })

        // Generate token
        const token = generateToken(user.id)

        res.status(201).json({
            message: 'User registered successfully',
            user,
            token
        })
    } catch (err) {
        console.error('Registration error:', err)
        res.status(500).json({ error: 'Failed to register user' })
    }
})

// Login user
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' })
        }

        // Find user
        const user = await req.prisma.user.findUnique({
            where: { username: username.toLowerCase() }
        })

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' })
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password)

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' })
        }

        // Generate token
        const token = generateToken(user.id)

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                createdAt: user.createdAt
            },
            token
        })
    } catch (err) {
        console.error('Login error:', err)
        res.status(500).json({ error: 'Failed to login' })
    }
})

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await req.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                username: true,
                createdAt: true,
                settings: true
            }
        })

        res.json({ user })
    } catch (err) {
        console.error('Get user error:', err)
        res.status(500).json({ error: 'Failed to get user info' })
    }
})

module.exports = router
