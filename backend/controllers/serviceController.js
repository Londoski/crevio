const serviceModel = require('../models/serviceModel');

const getServices = (req, res) => {
    try {
        const userId = req.user.id;
        const services = serviceModel.findByUser(userId);
        res.json({ success: true, services });
    } catch (err) {
        console.error('Get services error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

const getService = (req, res) => {
    try {
        const userId = req.user.id;
        const service = serviceModel.findById(req.params.id);
        if (!service || service.user_id !== userId) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }
        res.json({ success: true, service });
    } catch (err) {
        console.error('Get service error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

const createService = (req, res) => {
    try {
        const userId = req.user.id;
        const serviceData = { ...req.body, user_id: userId };
        const service = serviceModel.create(serviceData);
        res.json({ success: true, service });
    } catch (err) {
        console.error('Create service error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

const updateService = (req, res) => {
    try {
        const userId = req.user.id;
        const service = serviceModel.findById(req.params.id);
        if (!service || service.user_id !== userId) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }
        const updated = serviceModel.update(req.params.id, req.body);
        res.json({ success: true, service: updated });
    } catch (err) {
        console.error('Update service error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

const deleteService = (req, res) => {
    try {
        const userId = req.user.id;
        const service = serviceModel.findById(req.params.id);
        if (!service || service.user_id !== userId) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }
        serviceModel.delete(req.params.id);
        res.json({ success: true, message: 'Service deleted' });
    } catch (err) {
        console.error('Delete service error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

module.exports = {
    getServices,
    getService,
    createService,
    updateService,
    deleteService
};