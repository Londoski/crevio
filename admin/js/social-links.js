// ==========================================
// CREVIO ADMIN - SOCIAL MEDIA
// ==========================================


// ==========================================
// AUTHENTICATION
// ==========================================

const token =
    localStorage.getItem("crevio_token");


if (!token) {

    window.location.href =
        "/admin/pages/login.html";

}


// ==========================================
// ELEMENTS
// ==========================================

const socialForm =
    document.getElementById(
        "socialForm"
    );


const socialLinksContainer =
    document.getElementById(
        "socialLinksContainer"
    );


const socialMessage =
    document.getElementById(
        "socialMessage"
    );


const socialModal =
    document.getElementById(
        "socialModal"
    );


const addSocialButton =
    document.getElementById(
        "addSocialButton"
    );


const closeSocialModalButton =
    document.getElementById(
        "closeSocialModal"
    );


const cancelSocialModalButton =
    document.getElementById(
        "cancelSocialModal"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


const socialModalTitle =
    document.getElementById(
        "socialModalTitle"
    );


const submitSocialButton =
    document.getElementById(
        "submitSocialButton"
    );


// ==========================================
// EDITING STATE
// ==========================================

let editingSocialId = null;


// ==========================================
// PLATFORM NAMES
// ==========================================

const platformNames = {

    instagram: "Instagram",

    tiktok: "TikTok",

    youtube: "YouTube",

    facebook: "Facebook",

    linkedin: "LinkedIn",

    x: "X / Twitter",

    threads: "Threads",

    behance: "Behance",

    dribbble: "Dribbble",

    github: "GitHub",

    website: "Website",

    other: "Other"

};


// ==========================================
// LOAD SOCIAL LINKS
// ==========================================

async function loadSocialLinks() {

    if (!socialLinksContainer) {
        return;
    }


    socialLinksContainer.innerHTML = `

        <div class="loading-state">

            Loading social media...

        </div>

    `;


    try {

        const response =
            await fetch(
                "/api/social-links",
                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(

                data.message ||
                "Unable to load social media."

            );

        }


        let links =
            data.socialLinks ||
            data.social_links ||
            data.links ||
            [];


        // Handle object responses safely

        if (!Array.isArray(links)) {

            links = Object.values(
                links || {}
            );

        }


        renderSocialLinks(
            links
        );


    } catch (error) {

        console.error(
            "Load social links error:",
            error
        );


        socialLinksContainer.innerHTML = `

            <div class="empty-state">

                <h3>
                    Unable to load social media
                </h3>

                <p>
                    ${escapeHtml(
                        error.message
                    )}
                </p>

            </div>

        `;

    }

}


// ==========================================
// RENDER SOCIAL LINKS
// ==========================================

function renderSocialLinks(
    links
) {

    if (!links.length) {

        socialLinksContainer.innerHTML = `

            <div class="empty-state">

                <h3>
                    No social media accounts
                </h3>

                <p>
                    Add your first social media account.
                </p>

                <button
                    type="button"
                    class="primary-button"
                    onclick="openAddSocialModal()"
                >
                    + Add Social Media
                </button>

            </div>

        `;

        return;

    }


    socialLinksContainer.innerHTML =

        links.map(
            link => {

                const platform =
                    link.platform ||
                    "other";


                const platformName =
                    platformNames[platform] ||
                    platform;


                const handle =
                    link.handle ||
                    link.username ||
                    link.display_name ||
                    "No handle";


                const url =
                    link.url ||
                    link.profile_url ||
                    link.link ||
                    "";


                const active =
                    link.is_active === undefined
                        ? true
                        : Boolean(
                            Number(link.is_active)
                        );


                return `

                    <article
                        class="social-card"
                        data-social-id="${escapeAttribute(
                            link.id
                        )}"
                    >

                        <div class="social-card-top">

                            <div class="social-platform-icon">

                                ${escapeHtml(
                                    platformName
                                        .charAt(0)
                                        .toUpperCase()
                                )}

                            </div>


                            <div class="social-card-info">

                                <h3>
                                    ${escapeHtml(
                                        platformName
                                    )}
                                </h3>

                                <p>
                                    ${escapeHtml(
                                        handle
                                    )}
                                </p>

                            </div>


                            <span
                                class="social-status ${
                                    active
                                        ? "active"
                                        : "inactive"
                                }"
                            >

                                ${
                                    active
                                        ? "Active"
                                        : "Hidden"
                                }

                            </span>

                        </div>


                        <div class="social-card-url">

                            <a
                                href="${escapeAttribute(
                                    url
                                )}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >

                                ${escapeHtml(
                                    url
                                )}

                            </a>

                        </div>


                        <div class="social-card-actions">

                            <button
                                type="button"
                                class="secondary-button"
                                onclick="editSocialLink(${Number(
                                    link.id
                                )})"
                            >
                                Edit
                            </button>


                            <button
                                type="button"
                                class="danger-button"
                                onclick="deleteSocialLink(${Number(
                                    link.id
                                )})"
                            >
                                Delete
                            </button>

                        </div>

                    </article>

                `;

            }
        ).join("");

}


// ==========================================
// OPEN ADD MODAL
// ==========================================

function openAddSocialModal() {

    editingSocialId = null;


    resetSocialForm();


    if (socialModalTitle) {

        socialModalTitle.textContent =
            "Add Social Media";

    }


    if (submitSocialButton) {

        submitSocialButton.textContent =
            "Add Social Media";

    }


    openSocialModal();

}


// ==========================================
// OPEN MODAL
// ==========================================

function openSocialModal() {

    if (!socialModal) {
        return;
    }


    socialModal.classList.add(
        "open"
    );

}


// ==========================================
// CLOSE MODAL
// ==========================================

function closeSocialModal() {

    if (socialModal) {

        socialModal.classList.remove(
            "open"
        );

    }


    resetSocialForm();


    editingSocialId = null;

}


// ==========================================
// RESET FORM
// ==========================================

function resetSocialForm() {

    if (!socialForm) {
        return;
    }


    socialForm.reset();


    const sortOrder =
        document.getElementById(
            "sortOrder"
        );


    const active =
        document.getElementById(
            "isActive"
        );


    if (sortOrder) {

        sortOrder.value =
            "0";

    }


    if (active) {

        active.checked =
            true;

    }


    if (socialModalTitle) {

        socialModalTitle.textContent =
            "Add Social Media";

    }


    if (submitSocialButton) {

        submitSocialButton.disabled =
            false;

        submitSocialButton.textContent =
            "Add Social Media";

    }

}


// ==========================================
// ADD / UPDATE SOCIAL LINK
// ==========================================

async function saveSocialLink(
    event
) {

    event.preventDefault();


    const platform =
        document.getElementById(
            "platform"
        ).value.trim();


    const handle =
        document.getElementById(
            "handle"
        ).value.trim();


    const url =
        document.getElementById(
            "url"
        ).value.trim();


    const sortOrder =
        document.getElementById(
            "sortOrder"
        ).value;


    const isActive =
        document.getElementById(
            "isActive"
        ).checked;


    if (!platform) {

        showMessage(
            "Please select a platform.",
            "error"
        );

        return;

    }


    if (!handle) {

        showMessage(
            "Please enter a handle or display name.",
            "error"
        );

        return;

    }


    if (!url) {

        showMessage(
            "Please enter the social media URL.",
            "error"
        );

        return;

    }


    if (submitSocialButton) {

        submitSocialButton.disabled =
            true;

        submitSocialButton.textContent =
            editingSocialId
                ? "Saving..."
                : "Adding...";

    }


    const body = {

        platform,

        handle,

        url,

        sort_order:
            sortOrder
                ? Number(sortOrder)
                : 0,

        is_active:
            isActive ? 1 : 0

    };


    try {

        let endpoint =
            "/api/social-links";


        let method =
            "POST";


        if (editingSocialId) {

            endpoint =
                `/api/social-links/${editingSocialId}`;

            method =
                "PUT";

        }


        const response =
            await fetch(
                endpoint,
                {

                    method,

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body:
                        JSON.stringify(
                            body
                        )

                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(

                data.message ||
                "Unable to save social media."

            );

        }


        closeSocialModal();


        showMessage(

            editingSocialId
                ? "Social media updated successfully."
                : "Social media added successfully.",

            "success"

        );


        await loadSocialLinks();


    } catch (error) {

        console.error(
            "Save social link error:",
            error
        );


        showMessage(

            error.message ||
            "Unable to save social media.",

            "error"

        );


    } finally {

        if (submitSocialButton) {

            submitSocialButton.disabled =
                false;

            submitSocialButton.textContent =
                editingSocialId
                    ? "Save Changes"
                    : "Add Social Media";

        }

    }

}


// ==========================================
// EDIT SOCIAL LINK
// ==========================================

async function editSocialLink(
    socialId
) {

    try {

        const response =
            await fetch(
                "/api/social-links",
                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(

                data.message ||
                "Unable to load social media."

            );

        }


        let links =
            data.socialLinks ||
            data.social_links ||
            data.links ||
            [];


        if (!Array.isArray(links)) {

            links = Object.values(
                links || {}
            );

        }


        const social =
            links.find(
                item =>
                    Number(item.id) ===
                    Number(socialId)
            );


        if (!social) {

            throw new Error(
                "Social media account not found."
            );

        }


        editingSocialId =
            Number(socialId);


        document.getElementById(
            "platform"
        ).value =
            social.platform ||
            "other";


        document.getElementById(
            "handle"
        ).value =
            social.handle ||
            social.username ||
            social.display_name ||
            "";


        document.getElementById(
            "url"
        ).value =
            social.url ||
            social.profile_url ||
            social.link ||
            "";


        document.getElementById(
            "sortOrder"
        ).value =
            social.sort_order ??
            0;


        document.getElementById(
            "isActive"
        ).checked =
            social.is_active === undefined
                ? true
                : Boolean(
                    Number(
                        social.is_active
                    )
                );


        if (socialModalTitle) {

            socialModalTitle.textContent =
                "Edit Social Media";

        }


        if (submitSocialButton) {

            submitSocialButton.textContent =
                "Save Changes";

        }


        openSocialModal();


    } catch (error) {

        console.error(
            "Edit social link error:",
            error
        );


        showMessage(

            error.message ||
            "Unable to edit social media.",

            "error"

        );

    }

}


// ==========================================
// DELETE SOCIAL LINK
// ==========================================

async function deleteSocialLink(
    socialId
) {

    const confirmed =
        window.confirm(

            "Are you sure you want to permanently delete this social media account?"

        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/social-links/${socialId}`,
                {

                    method: "DELETE",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(

                data.message ||
                "Unable to delete social media."

            );

        }


        showMessage(

            "Social media deleted successfully.",

            "success"

        );


        await loadSocialLinks();


    } catch (error) {

        console.error(
            "Delete social link error:",
            error
        );


        showMessage(

            error.message ||
            "Unable to delete social media.",

            "error"

        );

    }

}


// ==========================================
// MESSAGE
// ==========================================

function showMessage(
    message,
    type = "info"
) {

    if (!socialMessage) {
        return;
    }


    socialMessage.textContent =
        message;


    socialMessage.className =
        `admin-message ${type}`;


    window.clearTimeout(
        showMessage.timeout
    );


    showMessage.timeout =
        window.setTimeout(
            () => {

                socialMessage.textContent =
                    "";

                socialMessage.className =
                    "admin-message";

            },
            4000
        );

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// ==========================================
// ESCAPE ATTRIBUTE
// ==========================================

function escapeAttribute(
    value
) {

    return escapeHtml(
        value
    );

}


// ==========================================
// EVENTS
// ==========================================

if (socialForm) {

    socialForm.addEventListener(
        "submit",
        saveSocialLink
    );

}


if (addSocialButton) {

    addSocialButton.addEventListener(
        "click",
        openAddSocialModal
    );

}


if (closeSocialModalButton) {

    closeSocialModalButton.addEventListener(
        "click",
        closeSocialModal
    );

}


if (cancelSocialModalButton) {

    cancelSocialModalButton.addEventListener(
        "click",
        closeSocialModal
    );

}


if (socialModal) {

    socialModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                socialModal
            ) {

                closeSocialModal();

            }

        }
    );

}


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "crevio_token"
            );


            localStorage.removeItem(
                "crevio_user"
            );


            window.location.href =
                "/admin/pages/login.html";

        }
    );

}


// ==========================================
// INITIAL LOAD
// ==========================================

loadSocialLinks();