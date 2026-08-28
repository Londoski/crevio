// =========================================================
// CREVIO — PUBLIC SOCIAL LINKS
// =========================================================

const SOCIALS_API_URL =
    "/api/public/social-links";


// =========================================================
// DOM READY
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadSocialLinks();

    }
);


// =========================================================
// LOAD SOCIAL LINKS
// =========================================================

async function loadSocialLinks() {

    const container =
        document.getElementById(
            "social-links-container"
        );


    if (!container) {

        return;

    }


    try {

        container.innerHTML =
            `
            <div class="loading-state">
                Loading social links...
            </div>
            `;


        const response =
            await fetch(
                SOCIALS_API_URL,
                {
                    method: "GET",

                    headers: {
                        "Accept":
                            "application/json"
                    },

                    cache: "no-store"

                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !data ||
            data.success !== true
        ) {

            throw new Error(
                data?.message ||
                "Unable to load social links."
            );

        }


        const socialLinks =
            Array.isArray(
                data.socialLinks
            )
                ? data.socialLinks
                : [];


        // =============================================
        // NO SOCIAL LINKS
        // =============================================

        if (
            socialLinks.length === 0
        ) {

            container.innerHTML =
                `
                <div class="empty-state">
                    No social links available yet.
                </div>
                `;

            return;

        }


        // =============================================
        // SORT BY DISPLAY ORDER
        // =============================================

        socialLinks.sort(
            (
                first,
                second
            ) => {

                const firstOrder =
                    Number(
                        first.display_order
                    ) || 0;


                const secondOrder =
                    Number(
                        second.display_order
                    ) || 0;


                return (
                    firstOrder -
                    secondOrder
                );

            }
        );


        // =============================================
        // CLEAR LOADING
        // =============================================

        container.innerHTML =
            "";


        // =============================================
        // CREATE LINKS
        // =============================================

        socialLinks.forEach(
            social => {

                const link =
                    createSocialLink(
                        social
                    );


                if (link) {

                    container.appendChild(
                        link
                    );

                }

            }
        );


        // =============================================
        // FINAL EMPTY CHECK
        // =============================================

        if (
            container.children.length === 0
        ) {

            container.innerHTML =
                `
                <div class="empty-state">
                    No valid social links available.
                </div>
                `;

        }


    } catch (error) {

        console.error(
            "Crevio social links error:",
            error
        );


        container.innerHTML =
            `
            <div class="error-state">
                Unable to load social links.
            </div>
            `;

    }

}


// =========================================================
// CREATE SOCIAL LINK
// =========================================================

function createSocialLink(
    social
) {

    if (!social) {

        return null;

    }


    const platform =
        String(
            social.platform ||
            ""
        ).trim();


    const url =
        String(
            social.url ||
            ""
        ).trim();


    if (
        !platform ||
        !url
    ) {

        return null;

    }


    const link =
        document.createElement(
            "a"
        );


    link.className =
        "social-link";


    link.href =
        url;


    link.target =
        "_blank";


    link.rel =
        "noopener noreferrer";


    link.dataset.platform =
        normalizePlatform(
            platform
        );


    link.setAttribute(
        "aria-label",
        `Visit ${platform}`
    );


    // =====================================================
    // ICON
    // =====================================================

    const icon =
        document.createElement(
            "span"
        );


    icon.className =
        "social-icon";


    icon.setAttribute(
        "aria-hidden",
        "true"
    );


    icon.innerHTML =
        getSocialIcon(
            platform
        );


    // =====================================================
    // LABEL
    // =====================================================

    const label =
        document.createElement(
            "span"
        );


    label.className =
        "social-label";


    label.textContent =
        getDisplayName(
            platform
        );


    // =====================================================
    // BUILD LINK
    // =====================================================

    link.appendChild(
        icon
    );


    link.appendChild(
        label
    );


    return link;

}


// =========================================================
// NORMALIZE PLATFORM
// =========================================================

function normalizePlatform(
    value
) {

    return String(
        value || ""
    )
        .toLowerCase()
        .trim()
        .replace(
            /[^a-z0-9]/g,
            ""
        );

}


// =========================================================
// DISPLAY NAME
// =========================================================

function getDisplayName(
    platform
) {

    const normalized =
        normalizePlatform(
            platform
        );


    const names = {

        tiktok:
            "TikTok",

        linkedin:
            "LinkedIn",

        instagram:
            "Instagram",

        facebook:
            "Facebook",

        twitter:
            "X",

        x:
            "X",

        youtube:
            "YouTube",

        whatsapp:
            "WhatsApp",

        github:
            "GitHub",

        behance:
            "Behance",

        dribbble:
            "Dribbble",

        twitch:
            "Twitch"

    };


    return (
        names[normalized] ||
        platform
    );

}


// =========================================================
// SOCIAL ICON
// =========================================================

function getSocialIcon(
    platform
) {

    const normalized =
        normalizePlatform(
            platform
        );


    switch (
        normalized
    ) {


        // =============================================
        // TIKTOK
        // =============================================

        case "tiktok":

            return `
                <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        fill="currentColor"
                        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-3.77h-3.17v12.58a2.68 2.68 0 1 1-2.68-2.68c.17 0 .34.02.51.05v-3.2a5.86 5.86 0 1 0 5.36 5.83V8.95a8 8 0 0 0 3.75.93V6.69z"
                    />
                </svg>
            `;


        // =============================================
        // LINKEDIN
        // =============================================

        case "linkedin":

            return `
                <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        fill="currentColor"
                        d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.44-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.32 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.1 20.45H3.54V9H7.1v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0z"
                    />
                </svg>
            `;


        // =============================================
        // INSTAGRAM
        // =============================================

        case "instagram":

            return `
                <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="5"
                        ry="5"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    />

                    <circle
                        cx="12"
                        cy="12"
                        r="4"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    />

                    <circle
                        cx="17.5"
                        cy="6.5"
                        r="1.2"
                        fill="currentColor"
                    />
                </svg>
            `;


        // =============================================
        // FACEBOOK
        // =============================================

        case "facebook":

            return `
                <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        fill="currentColor"
                        d="M13.5 21v-8h2.75l.41-3.12H13.5V7.89c0-.9.25-1.51 1.54-1.51h1.65V3.59A22.07 22.07 0 0 0 14.28 3c-2.38 0-4.01 1.45-4.01 4.12v2.76H7.5V13h2.77v8h3.23z"
                    />
                </svg>
            `;


        // =============================================
        // X / TWITTER
        // =============================================

        case "x":
        case "twitter":

            return `
                <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        fill="currentColor"
                        d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.38L6.48 22H3.36l7.24-8.28L2.86 2H9.26l4.42 5.84L18.9 2zm-1.1 17.8h1.73L8.34 4.08H6.48L17.8 19.8z"
                    />
                </svg>
            `;


        // =============================================
        // YOUTUBE
        // =============================================

        case "youtube":

            return `
                <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        fill="currentColor"
                        d="M23.5 6.2a2.98 2.98 0 0 0-2.1-2.1C19.55 3.6 12 3.6 12 3.6s-7.55 0-9.4.5A2.98 2.98 0 0 0 .5 6.2 31.14 31.14 0 0 0 0 12a31.14 31.14 0 0 0 .5 5.8 2.98 2.98 0 0 0 2.1 2.1c1.85.5 9.4.5 9.4.5s7.55 0 9.4-.5a2.98 2.98 0 0 0 2.1-2.1A31.14 31.14 0 0 0 24 12a31.14 31.14 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"
                    />
                </svg>
            `;


        // =============================================
        // WHATSAPP
        // =============================================

        case "whatsapp":

            return `
                <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        fill="currentColor"
                        d="M20.52 3.48A11.83 11.83 0 0 0 12.06 0C5.53 0 .22 5.31.22 11.84c0 2.09.54 4.13 1.57 5.93L.13 24l6.37-1.63a11.84 11.84 0 0 0 5.56 1.42h.01c6.53 0 11.84-5.31 11.84-11.84 0-3.17-1.23-6.15-3.39-8.47zM12.07 21.86h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.78.97 1.01-3.69-.23-.38a9.88 9.88 0 0 1-1.51-5.33c0-5.47 4.45-9.92 9.93-9.92 2.65 0 5.15 1.03 7.03 2.91a9.88 9.88 0 0 1 2.91 7.03c0 5.47-4.45 9.92-9.95 9.92zm5.44-7.43c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.77-1.68-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.01-1.04 2.47s1.07 2.86 1.22 3.06c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.71.63.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.41.25-.69.25-1.28.17-1.41-.07-.12-.27-.2-.57-.35z"
                    />
                </svg>
            `;


        // =============================================
        // GITHUB
        // =============================================

        case "github":

            return `
                <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        fill="currentColor"
                        d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.14c-3.2.69-3.87-1.55-3.87-1.55-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .96-.31 3.15 1.18a10.94 10.94 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.77.11 3.06.73.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.41.36.78 1.08.78 2.18v3.23c0 .31.21.66.79.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"
                    />
                </svg>
            `;


        // =============================================
        // BEHANCE
        // =============================================

        case "behance":

            return `
                <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        fill="currentColor"
                        d="M7.2 4.5c2.7 0 4.4 1.02 4.4 3.16 0 1.34-.72 2.25-1.73 2.75 1.57.42 2.45 1.45 2.45 3.07 0 2.57-2.04 3.72-4.9 3.72H1V4.5h6.2zm-.28 5.05c1.05 0 1.69-.46 1.69-1.36 0-.84-.57-1.25-1.69-1.25H4.05v2.61h2.87zm.25 5.1c1.24 0 1.93-.48 1.93-1.47 0-.97-.7-1.44-1.93-1.44H4.05v2.91h3.12zM14.2 4.5h5.02v1.55H14.2V4.5zm-1.13 8.19c0-3.14 2.05-5.38 5.1-5.38 3.28 0 4.95 2.59 4.95 5.98h-6.83c.16 1.42.89 2.19 2.25 2.19.95 0 1.67-.45 1.95-1.18h2.47c-.4 2.03-2.08 3.31-4.47 3.31-3.32 0-5.42-2.11-5.42-4.92zm6.97-1.27c-.08-1.18-.8-2.03-1.9-2.03-1.22 0-1.84.73-1.93 2.03h3.83z"
                    />
                </svg>
            `;


        // =============================================
        // DRIBBBLE
        // =============================================

        case "dribbble":

            return `
                <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        fill="currentColor"
                        d="M12 0a12 12 0 1 0 12 12A12.014 12.014 0 0 0 12 0zm7.93 5.78a10.2 10.2 0 0 1 1.81 5.7 23.78 23.78 0 0 0-6.54-.07c-.2-.49-.41-.98-.64-1.46a25.6 25.6 0 0 0 5.37-4.17zM18.6 4.55a23.1 23.1 0 0 1-4.77 3.74 74.78 74.78 0 0 0-3.48-5.58 10.25 10.25 0 0 1 8.25 1.84zM8.45 2.98a72.3 72.3 0 0 1 3.5 5.63A71.46 71.46 0 0 1 3.5 9.77a10.16 10.16 0 0 1 4.95-6.79zM2.03 11.68h.05a73.66 73.66 0 0 0 10.67-1.48c.18.36.35.72.5 1.08a39.96 39.96 0 0 0-9.9 6.13 10.17 10.17 0 0 1-1.32-5.73zM4.67 18.94a38.07 38.07 0 0 1 9.25-5.76 44.3 44.3 0 0 1 1.59 7.46 10.15 10.15 0 0 1-10.84-1.7zm12.63.79a46.62 46.62 0 0 0-1.62-7.22 22.35 22.35 0 0 1 5.94.12 10.16 10.16 0 0 1-4.32 7.1z"
                    />
                </svg>
            `;


        // =============================================
        // TWITCH
        // =============================================

        case "twitch":

            return `
                <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        fill="currentColor"
                        d="M2 1h20v14l-6 6h-4l-3 3v-3H2V1zm3 3v14h5v3l3-3h3l3-3V4H5zm4 3h2v6H9V7zm5 0h2v6h-2V7z"
                    />
                </svg>
            `;


        // =============================================
        // DEFAULT
        // =============================================

        default:

            return `
                <svg
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <circle
                        cx="12"
                        cy="12"
                        r="9"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                    />

                    <path
                        d="M3 12h18M12 3c2.5 2.6 3.75 5.6 3.75 9S14.5 18.4 12 21c-2.5-2.6-3.75-5.6-3.75-9S9.5 5.6 12 3z"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                    />
                </svg>
            `;

    }

}