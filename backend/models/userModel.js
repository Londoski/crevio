// =========================================================
// CREVIO — USER MODEL
// =========================================================

const db =
    require("../../database/db");


const userModel = {


    // =====================================================
    // CREATE USER
    // =====================================================

    create(user) {

        const stmt =
            db.prepare(
                `
                INSERT INTO users (
                    username,
                    email,
                    phone,
                    password_hash,
                    display_name,
                    bio,
                    profile_image,
                    location
                )

                VALUES (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
                `
            );


        const result =
            stmt.run(
                user.username,
                user.email,
                user.phone || null,
                user.password_hash,
                user.display_name || null,
                user.bio || null,
                user.profile_image || null,
                user.location || null
            );


        return this.findById(
            result.lastInsertRowid
        );

    },


    // =====================================================
    // FIND BY ID
    // =====================================================

    findById(id) {

        return db
            .prepare(
                `
                SELECT
                    id,
                    username,
                    email,
                    phone,
                    role,
                    display_name,
                    bio,
                    profile_image,
                    location,
                    email_verified,
                    phone_verified,
                    account_status,
                    two_factor_enabled,
                    created_at,
                    updated_at

                FROM users

                WHERE id = ?
                `
            )
            .get(id);

    },


    // =====================================================
    // FIND BY USERNAME
    // =====================================================

    findByUsername(username) {

        return db
            .prepare(
                `
                SELECT
                    id,
                    username,
                    email,
                    phone,
                    role,
                    display_name,
                    bio,
                    profile_image,
                    location,
                    email_verified,
                    phone_verified,
                    account_status,
                    two_factor_enabled,
                    created_at,
                    updated_at

                FROM users

                WHERE username = ?
                `
            )
            .get(username);

    },


    // =====================================================
    // FIND BY EMAIL
    // =====================================================

    findByEmail(email) {

        return db
            .prepare(
                `
                SELECT *
                FROM users
                WHERE LOWER(email) = LOWER(?)
                `
            )
            .get(email);

    },


    // =====================================================
    // FIND BY PHONE
    // =====================================================

    findByPhone(phone) {

        return db
            .prepare(
                `
                SELECT *
                FROM users
                WHERE phone = ?
                `
            )
            .get(phone);

    },


    // =====================================================
    // FIND BY EMAIL OR PHONE
    // =====================================================

    findByLogin(identifier) {

        const value =
            String(
                identifier || ""
            ).trim();


        if (!value) {

            return undefined;

        }


        const emailUser =
            this.findByEmail(
                value
            );


        if (emailUser) {

            return emailUser;

        }


        return this.findByPhone(
            value
        );

    },


    // =====================================================
    // UPDATE PROFILE
    // =====================================================

    updateProfile(
        id,
        profile
    ) {

        const {
            display_name,
            bio,
            profile_image,
            location
        } = profile;


        const stmt =
            db.prepare(
                `
                UPDATE users

                SET
                    display_name = ?,
                    bio = ?,
                    profile_image = ?,
                    location = ?,
                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = ?
                `
            );


        stmt.run(
            display_name || null,
            bio || null,
            profile_image || null,
            location || null,
            id
        );


        return this.findById(
            id
        );

    },


    // =====================================================
    // UPDATE PHONE
    // =====================================================

    updatePhone(
        id,
        phone
    ) {

        db
            .prepare(
                `
                UPDATE users

                SET
                    phone = ?,
                    phone_verified = 0,
                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = ?
                `
            )
            .run(
                phone || null,
                id
            );


        return this.findById(
            id
        );

    },


    // =====================================================
    // MARK EMAIL VERIFIED
    // =====================================================

    markEmailVerified(id) {

        db
            .prepare(
                `
                UPDATE users

                SET
                    email_verified = 1,
                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = ?
                `
            )
            .run(id);


        return this.findById(
            id
        );

    },


    // =====================================================
    // MARK PHONE VERIFIED
    // =====================================================

    markPhoneVerified(id) {

        db
            .prepare(
                `
                UPDATE users

                SET
                    phone_verified = 1,
                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = ?
                `
            )
            .run(id);


        return this.findById(
            id
        );

    },


    // =====================================================
    // UPDATE 2FA STATE
    // =====================================================

    setTwoFactorEnabled(
        id,
        enabled
    ) {

        db
            .prepare(
                `
                UPDATE users

                SET
                    two_factor_enabled = ?,
                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = ?
                `
            )
            .run(
                enabled ? 1 : 0,
                id
            );


        return this.findById(
            id
        );

    },


    // =====================================================
    // ACCOUNT STATUS
    // =====================================================

    setAccountStatus(
        id,
        status
    ) {

        db
            .prepare(
                `
                UPDATE users

                SET
                    account_status = ?,
                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE id = ?
                `
            )
            .run(
                status,
                id
            );


        return this.findById(
            id
        );

    }

};


module.exports =
    userModel;