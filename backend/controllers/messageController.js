const conversationModel = require("../models/conversationModel");
const messageModel = require("../models/messageModel");
const userModel = require("../models/userModel");
const serviceModel = require("../models/serviceModel");
const projectModel = require("../models/projectModel");

// ---- GET ALL CONVERSATIONS ----
const getConversations = (req, res) => {
    try {
        const userId = req.user.id;
        const { status, archived, starred, search } = req.query;
        const conversations = conversationModel.findByCreator(userId, {
            status,
            archived: archived === 'true' ? true : archived === 'false' ? false : undefined,
            starred: starred === 'true' ? true : starred === 'false' ? false : undefined,
            search
        });
        const unreadCount = conversationModel.getUnreadCount(userId);
        res.json({ success: true, conversations, unreadCount });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ success: false, message: 'Unable to load conversations.' });
    }
};

// ---- GET SINGLE CONVERSATION ----
const getConversation = (req, res) => {
    try {
        const userId = req.user.id;
        const conversationId = parseInt(req.params.id);
        const conversation = conversationModel.findById(conversationId);
        if (!conversation || conversation.creator_id !== userId) {
            return res.status(404).json({ success: false, message: 'Conversation not found.' });
        }
        conversationModel.markAsRead(conversationId, 'client');
        const messages = messageModel.findByConversation(conversationId);
        res.json({ success: true, conversation, messages });
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ success: false, message: 'Unable to load conversation.' });
    }
};

// ---- CREATE CONVERSATION ----
const createConversation = (req, res) => {
    try {
        const userId = req.user.id;
        const { client_name, client_email, service_id, project_id, source, budget, timeline, notes, message } = req.body;
        if (!client_name || !client_email) {
            return res.status(400).json({ success: false, message: 'Client name and email are required.' });
        }
        if (service_id) {
            const service = serviceModel.findById(service_id, userId);
            if (!service) return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        if (project_id) {
            const project = projectModel.findById(project_id);
            if (!project || project.user_id !== userId) {
                return res.status(404).json({ success: false, message: 'Project not found.' });
            }
        }
        const conversation = conversationModel.create({
            creator_id: userId,
            client_name,
            client_email,
            service_id: service_id || null,
            project_id: project_id || null,
            source: source || 'portfolio',
            budget,
            timeline,
            notes,
            status: 'new_inquiry'
        });
        if (message) {
            messageModel.create({
                conversation_id: conversation.id,
                sender_type: 'client',
                content: message,
                attachments: null
            });
        }
        const updated = conversationModel.findById(conversation.id);
        res.json({ success: true, conversation: updated });
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({ success: false, message: 'Unable to create conversation.' });
    }
};

// ---- SEND MESSAGE ----
const sendMessage = (req, res) => {
    try {
        const userId = req.user.id;
        const conversationId = parseInt(req.params.id);
        const { content, sender_type } = req.body;
        if (!content) {
            return res.status(400).json({ success: false, message: 'Message content is required.' });
        }
        const conversation = conversationModel.findById(conversationId);
        if (!conversation || conversation.creator_id !== userId) {
            return res.status(404).json({ success: false, message: 'Conversation not found.' });
        }
        conversationModel.update(conversationId, { updated_at: new Date().toISOString() });
        const message = messageModel.create({
            conversation_id: conversationId,
            sender_type: sender_type || 'creator',
            content,
            attachments: null
        });
        res.json({ success: true, message });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ success: false, message: 'Unable to send message.' });
    }
};

// ---- UPDATE CONVERSATION ----
const updateConversation = (req, res) => {
    try {
        const userId = req.user.id;
        const conversationId = parseInt(req.params.id);
        const { status, starred, archived, budget, timeline, notes } = req.body;
        const conversation = conversationModel.findById(conversationId);
        if (!conversation || conversation.creator_id !== userId) {
            return res.status(404).json({ success: false, message: 'Conversation not found.' });
        }
        const updates = {};
        if (status !== undefined) updates.status = status;
        if (starred !== undefined) updates.starred = starred ? 1 : 0;
        if (archived !== undefined) updates.archived = archived ? 1 : 0;
        if (budget !== undefined) updates.budget = budget;
        if (timeline !== undefined) updates.timeline = timeline;
        if (notes !== undefined) updates.notes = notes;
        const updated = conversationModel.update(conversationId, updates);
        res.json({ success: true, conversation: updated });
    } catch (error) {
        console.error('Update conversation error:', error);
        res.status(500).json({ success: false, message: 'Unable to update conversation.' });
    }
};

// ---- DELETE CONVERSATION ----
const deleteConversation = (req, res) => {
    try {
        const userId = req.user.id;
        const conversationId = parseInt(req.params.id);
        const conversation = conversationModel.findById(conversationId);
        if (!conversation || conversation.creator_id !== userId) {
            return res.status(404).json({ success: false, message: 'Conversation not found.' });
        }
        conversationModel.delete(conversationId);
        res.json({ success: true, message: 'Conversation deleted.' });
    } catch (error) {
        console.error('Delete conversation error:', error);
        res.status(500).json({ success: false, message: 'Unable to delete conversation.' });
    }
};

// ---- PUBLIC: SUBMIT INQUIRY ----
const submitInquiry = (req, res) => {
    try {
        const { creator_username, client_name, client_email, service_id, project_id, source, budget, timeline, message } = req.body;
        if (!creator_username || !client_name || !client_email) {
            return res.status(400).json({ success: false, message: 'Creator, client name, and email are required.' });
        }
        const user = userModel.findByUsername(creator_username);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Creator not found.' });
        }
        if (service_id) {
            const service = serviceModel.findById(service_id);
            if (!service || service.user_id !== user.id) {
                return res.status(404).json({ success: false, message: 'Service not found.' });
            }
        }
        if (project_id) {
            const project = projectModel.findById(project_id);
            if (!project || project.user_id !== user.id) {
                return res.status(404).json({ success: false, message: 'Project not found.' });
            }
        }
        const conversation = conversationModel.create({
            creator_id: user.id,
            client_name,
            client_email,
            service_id: service_id || null,
            project_id: project_id || null,
            source: source || 'portfolio',
            budget,
            timeline,
            notes: null,
            status: 'new_inquiry'
        });
        if (message) {
            messageModel.create({
                conversation_id: conversation.id,
                sender_type: 'client',
                content: message,
                attachments: null
            });
        }
        res.json({ success: true, conversation_id: conversation.id, message: 'Inquiry sent successfully!' });
    } catch (error) {
        console.error('Submit inquiry error:', error);
        res.status(500).json({ success: false, message: 'Unable to submit inquiry.' });
    }
};

module.exports = {
    getConversations,
    getConversation,
    createConversation,
    sendMessage,
    updateConversation,
    deleteConversation,
    submitInquiry
};