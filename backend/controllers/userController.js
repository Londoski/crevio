const userModel = require("../models/userModel");

// Create a new user
const createUser = (req, res) => {
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

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email and password are required."
            });
        }

        // Check if username already exists
        const existingUsername = userModel.findByUsername(username);

        if (existingUsername) {
            return res.status(409).json({
                success: false,
                message: "Username already exists."
            });
        }

        // Check if email already exists
        const existingEmail = userModel.findByEmail(email);

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: "Email already exists."
            });
        }

        // Create user
        const user = userModel.create({
            username,
            email,
            password_hash: password,
            display_name,
            bio,
            profile_image,
            location
        });

        // Never return the password
        delete user.password_hash;

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


// Get user by username
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

        // Never return password hash
        delete user.password_hash;

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
    getUserByUsername
};