const express = require('express')
const bcrypt = require('bcryptjs')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Update profile (username)
router.put('/profile', async (req, res) => {
    try {
        const { username } = req.body

        if (!username) {
            return res.status(400).json({ error: 'Username is required' })
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' })
        }

        // Check if username is taken by another user
        const existingUser = await req.prisma.user.findFirst({
            where: {
                username: username.toLowerCase(),
                NOT: { id: req.user.id }
            }
        })

        if (existingUser) {
            return res.status(409).json({ error: 'Username already taken' })
        }

        const updatedUser = await req.prisma.user.update({
            where: { id: req.user.id },
            data: { username: username.toLowerCase() },
            select: {
                id: true,
                username: true,
                createdAt: true
            }
        })

        res.json({ message: 'Profile updated', user: updatedUser })
    } catch (err) {
        console.error('Update profile error:', err)
        res.status(500).json({ error: 'Failed to update profile' })
    }
})

// Change password
router.put('/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' })
        }

        // Get user with password
        const user = await req.prisma.user.findUnique({
            where: { id: req.user.id }
        })

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password)

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' })
        }

        // Hash new password
        const saltRounds = 12
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

        await req.prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        })

        res.json({ message: 'Password changed successfully' })
    } catch (err) {
        console.error('Change password error:', err)
        res.status(500).json({ error: 'Failed to change password' })
    }
})

// Update settings
router.put('/settings', async (req, res) => {
    try {
        const { apiKeys, baseUrls, selectedModel, streamOutput, searchEnabled } = req.body

        const updateData = {}
        if (apiKeys !== undefined) updateData.apiKeys = apiKeys
        if (baseUrls !== undefined) updateData.baseUrls = baseUrls
        if (selectedModel !== undefined) updateData.selectedModel = selectedModel
        if (streamOutput !== undefined) updateData.streamOutput = streamOutput
        if (searchEnabled !== undefined) updateData.searchEnabled = searchEnabled

        const settings = await req.prisma.userSettings.upsert({
            where: { userId: req.user.id },
            update: updateData,
            create: {
                userId: req.user.id,
                ...updateData
            }
        })

        res.json({ message: 'Settings updated', settings })
    } catch (err) {
        console.error('Update settings error:', err)
        res.status(500).json({ error: 'Failed to update settings' })
    }
})

// Get settings
router.get('/settings', async (req, res) => {
    try {
        let settings = await req.prisma.userSettings.findUnique({
            where: { userId: req.user.id }
        })

        // Create default settings if they don't exist
        if (!settings) {
            settings = await req.prisma.userSettings.create({
                data: { userId: req.user.id }
            })
        }

        res.json({ settings })
    } catch (err) {
        console.error('Get settings error:', err)
        res.status(500).json({ error: 'Failed to get settings' })
    }
})

module.exports = router
