const express = require('express')
const { authenticateToken } = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(authenticateToken)

// Get all conversations for user
router.get('/', async (req, res) => {
    try {
        const conversations = await req.prisma.conversation.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        res.json({ conversations })
    } catch (err) {
        console.error('Get conversations error:', err)
        res.status(500).json({ error: 'Failed to get conversations' })
    }
})

// Create new conversation
router.post('/', async (req, res) => {
    try {
        const { title } = req.body

        const conversation = await req.prisma.conversation.create({
            data: {
                userId: req.user.id,
                title: title || 'New Chat'
            },
            include: {
                messages: true
            }
        })

        res.status(201).json({ conversation })
    } catch (err) {
        console.error('Create conversation error:', err)
        res.status(500).json({ error: 'Failed to create conversation' })
    }
})

// Update conversation (title)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { title } = req.body

        // Verify ownership
        const existing = await req.prisma.conversation.findFirst({
            where: { id, userId: req.user.id }
        })

        if (!existing) {
            return res.status(404).json({ error: 'Conversation not found' })
        }

        const conversation = await req.prisma.conversation.update({
            where: { id },
            data: { title },
            include: { messages: true }
        })

        res.json({ conversation })
    } catch (err) {
        console.error('Update conversation error:', err)
        res.status(500).json({ error: 'Failed to update conversation' })
    }
})

// Delete conversation
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params

        // Verify ownership
        const existing = await req.prisma.conversation.findFirst({
            where: { id, userId: req.user.id }
        })

        if (!existing) {
            return res.status(404).json({ error: 'Conversation not found' })
        }

        await req.prisma.conversation.delete({
            where: { id }
        })

        res.json({ message: 'Conversation deleted' })
    } catch (err) {
        console.error('Delete conversation error:', err)
        res.status(500).json({ error: 'Failed to delete conversation' })
    }
})

// Add message to conversation
router.post('/:id/messages', async (req, res) => {
    try {
        const { id } = req.params
        const { role, content, isError, searchImages } = req.body

        // Verify ownership
        const conversation = await req.prisma.conversation.findFirst({
            where: { id, userId: req.user.id }
        })

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' })
        }

        const message = await req.prisma.message.create({
            data: {
                conversationId: id,
                role,
                content,
                isError: isError || false,
                searchImages: searchImages || []
            }
        })

        res.status(201).json({ message })
    } catch (err) {
        console.error('Add message error:', err)
        res.status(500).json({ error: 'Failed to add message' })
    }
})

// Update message
router.put('/:conversationId/messages/:messageId', async (req, res) => {
    try {
        const { conversationId, messageId } = req.params
        const { content, isError, searchImages } = req.body

        // Verify ownership
        const conversation = await req.prisma.conversation.findFirst({
            where: { id: conversationId, userId: req.user.id }
        })

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' })
        }

        const updateData = {}
        if (content !== undefined) updateData.content = content
        if (isError !== undefined) updateData.isError = isError
        if (searchImages !== undefined) updateData.searchImages = searchImages

        const message = await req.prisma.message.update({
            where: { id: messageId },
            data: updateData
        })

        res.json({ message })
    } catch (err) {
        console.error('Update message error:', err)
        res.status(500).json({ error: 'Failed to update message' })
    }
})

// Sync conversation (bulk update - useful for syncing from frontend)
router.post('/:id/sync', async (req, res) => {
    try {
        const { id } = req.params
        const { title, messages } = req.body

        // Verify ownership
        const existing = await req.prisma.conversation.findFirst({
            where: { id, userId: req.user.id }
        })

        if (!existing) {
            return res.status(404).json({ error: 'Conversation not found' })
        }

        // Update title if provided
        if (title) {
            await req.prisma.conversation.update({
                where: { id },
                data: { title }
            })
        }

        // Sync messages - delete existing and recreate
        if (messages && Array.isArray(messages)) {
            await req.prisma.message.deleteMany({
                where: { conversationId: id }
            })

            await req.prisma.message.createMany({
                data: messages.map(msg => ({
                    conversationId: id,
                    role: msg.role,
                    content: msg.content || '',
                    isError: msg.isError || false,
                    searchImages: msg.searchImages || []
                }))
            })
        }

        const conversation = await req.prisma.conversation.findUnique({
            where: { id },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
        })

        res.json({ conversation })
    } catch (err) {
        console.error('Sync conversation error:', err)
        res.status(500).json({ error: 'Failed to sync conversation' })
    }
})

module.exports = router
