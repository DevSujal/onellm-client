require('dotenv').config({ path: '../../.env' })
const express = require('express')
const cors = require('cors')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/user')
const conversationRoutes = require('./routes/conversations')

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || process.env.SERVER_PORT || 3001
const isProduction = process.env.NODE_ENV === 'production'

// Middleware
app.use(cors({
    origin: isProduction ? true : (process.env.FRONTEND_URL || 'http://localhost:5173'),
    credentials: true
}))
app.use(express.json())

// Make prisma available to routes
app.use((req, res, next) => {
    req.prisma = prisma
    next()
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/conversations', conversationRoutes)

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve static files in production
if (isProduction) {
    const clientBuildPath = path.join(__dirname, '../client/dist')
    app.use(express.static(clientBuildPath))

    // Handle client-side routing - serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next()
        }
        res.sendFile(path.join(clientBuildPath, 'index.html'))
    })
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Something went wrong!' })
})

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect()
    process.exit(0)
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    if (isProduction) {
        console.log('Serving frontend from: ../client/dist')
    }
})

module.exports = { app, prisma }

