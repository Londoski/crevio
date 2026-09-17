// =========================================================
// CREVIO — MEDIA LIBRARY CONTROLLER (alias of mediaController)
// File: backend/controllers/mediaLibraryController.js
// =========================================================

const mediaController = require("./mediaController");

module.exports = {
    getMedia:     mediaController.getMedia,
    uploadMedia:  mediaController.uploadMedia,
    deleteMedia:  mediaController.deleteMedia
};