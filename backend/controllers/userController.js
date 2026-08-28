const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");


// ==========================================
// CREATE USER
// ==========================================

const createUser = async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            display_name,
            bio,
            profile_image,
            location
        } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email and password are required."
            });
        }

        const existingUsername = userModel.findByUsername(username);

        if (existingUsername) {
            return res.status(409).json({
                success: false,
                message: "Username already exists."
            });
        }

        const existingEmail = userModel.findByEmail(email);

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: "Email already exists."
            });
        }

        const password_hash = await bcrypt.hash(password, 12);

        const user = userModel.create({
            username,
            email,
            password_hash,
            display_name,
            bio,
            profile_image,
            location
        });

        res.status(201).json({
            success: true,
            message: "User created successfully.",
            user
        });

    } catch (error) {
        console.error("Create user error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to create user."
        });
    }
};


// ==========================================
// GET CURRENT USER
// ==========================================

const getCurrentUser = (req, res) => {
    try {
        const user_id = req.user.id;

        const user = userModel.findById(user_id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error("Get current user error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve profile."
        });
    }
};


// ==========================================
// UPDATE CURRENT USER PROFILE
// ==========================================

const updateCurrentUser = (req, res) => {
    try {
        const user_id = req.user.id;

        const {
            display_name,
            bio,
            profile_image,
            location
        } = req.body;

        const existingUser = userModel.findById(user_id);

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const updatedUser = userModel.updateProfile(user_id, {
            display_name,
            bio,
            profile_image,
            location
        });

        res.json({
            success: true,
            message: "Profile updated successfully.",
            user: updatedUser
        });

    } catch (error) {
        console.error("Update profile error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update profile."
        });
    }
};


// ==========================================
// GET USER BY USERNAME
// ==========================================

const getUserByUsername = (req, res) => {
    try {
        const { username } = req.params;

        const user = userModel.findByUsername(username);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error("Get user error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve user."
        });
    }
};


module.exports = {
    createUser,
    getCurrentUser,
    updateCurrentUser,
    getUserByUsername
};