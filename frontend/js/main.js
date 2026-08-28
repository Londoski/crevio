// ==========================================
// CREVIO PUBLIC PORTFOLIO
// MAIN JAVASCRIPT
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Crevio portfolio loaded.");

    initializeCurrentYear();
    loadSocialLinks();
    initializeNavigation();
    initializeScrollEffects();

});


// ==========================================
// CURRENT YEAR
// ==========================================

function initializeCurrentYear() {

    const yearElement =
        document.getElementById("current-year");

    if (yearElement) {

        yearElement.textContent =
            new Date().getFullYear();

    }

}


// ==========================================
// LOAD SOCIAL LINKS
// ==========================================

async function loadSocialLinks() {

    const socialContainer =
        document.querySelector(".social-links");

    if (!socialContainer) {

        console.warn(
            "Social links container not found."
        );

        return;

    }


    try {

        const response =
            await fetch(
                "/api/public/social-links"
            );


        if (!response.ok) {

            throw new Error(
                `HTTP error: ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !data.success ||
            !Array.isArray(data.socialLinks)
        ) {

            console.warn(
                "No social links available."
            );

            return;

        }


        socialContainer.innerHTML = "";


        data.socialLinks.forEach(
            (social) => {

                const link =
                    document.createElement("a");


                link.href =
                    social.url || "#";


                link.target =
                    "_blank";


                link.rel =
                    "noopener noreferrer";


                link.className =
                    "social-link";


                link.setAttribute(
                    "aria-label",
                    social.platform || "Social media"
                );


                const icon =
                    document.createElement("span");


                icon.className =
                    "social-icon";


                icon.textContent =
                    getSocialIcon(
                        social.platform
                    );


                const username =
                    document.createElement("span");


                username.className =
                    "social-username";


                username.textContent =
                    social.handle ||
                    social.username ||
                    social.platform ||
                    "Social";


                link.appendChild(icon);

                link.appendChild(username);

                socialContainer.appendChild(link);

            }
        );


    } catch (error) {

        console.error(
            "Unable to load social links:",
            error
        );

    }

}


// ==========================================
// SOCIAL MEDIA ICONS
// ==========================================

function getSocialIcon(platform) {

    if (!platform) {

        return "↗";

    }


    const name =
        platform
            .toLowerCase()
            .trim();


    const icons = {

        instagram: "◎",

        facebook: "f",

        twitter: "𝕏",

        x: "𝕏",

        tiktok: "♪",

        youtube: "▶",

        linkedin: "in",

        whatsapp: "☏",

        github: "◉",

        behance: "Bē",

        dribbble: "●",

        pinterest: "P",

        telegram: "✈",

        snapchat: "👻"

    };


    return icons[name] || "↗";

}


// ==========================================
// NAVIGATION
// ==========================================

function initializeNavigation() {

    const menuButton =
        document.querySelector(
            "[data-menu-toggle]"
        );


    const navigation =
        document.querySelector(
            "[data-navigation]"
        );


    if (
        !menuButton ||
        !navigation
    ) {

        return;

    }


    menuButton.addEventListener(
        "click",
        () => {

            navigation.classList.toggle(
                "is-open"
            );


            menuButton.classList.toggle(
                "is-active"
            );

        }
    );


    const navigationLinks =
        navigation.querySelectorAll("a");


    navigationLinks.forEach(
        (link) => {

            link.addEventListener(
                "click",
                () => {

                    navigation.classList.remove(
                        "is-open"
                    );


                    menuButton.classList.remove(
                        "is-active"
                    );

                }
            );

        }
    );

}


// ==========================================
// SCROLL EFFECTS
// ==========================================

function initializeScrollEffects() {

    const header =
        document.querySelector(
            ".site-header"
        );


    if (!header) {

        return;

    }


    let lastScrollPosition = 0;


    window.addEventListener(
        "scroll",
        () => {

            const currentScroll =
                window.scrollY;


            if (
                currentScroll > 50
            ) {

                header.classList.add(
                    "is-scrolled"
                );

            } else {

                header.classList.remove(
                    "is-scrolled"
                );

            }


            lastScrollPosition =
                currentScroll;

        },
        {
            passive: true
        }
    );

}


// ==========================================
// SMOOTH SCROLL
// ==========================================

document.addEventListener(
    "click",
    (event) => {

        const link =
            event.target.closest(
                'a[href^="#"]'
            );


        if (!link) {

            return;

        }


        const targetId =
            link.getAttribute("href");


        if (
            !targetId ||
            targetId === "#"
        ) {

            return;

        }


        const target =
            document.querySelector(
                targetId
            );


        if (!target) {

            return;

        }


        event.preventDefault();


        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }
);


// ==========================================
// IMAGE ERROR HANDLING
// ==========================================

document.addEventListener(
    "error",
    (event) => {

        if (
            event.target.tagName === "IMG"
        ) {

            event.target.classList.add(
                "image-load-error"
            );

        }

    },
    true
);


// ==========================================
// EXTERNAL LINKS
// ==========================================

document.addEventListener(
    "click",
    (event) => {

        const link =
            event.target.closest("a");


        if (!link) {

            return;

        }


        const href =
            link.getAttribute("href");


        if (
            href &&
            (
                href.startsWith("http://") ||
                href.startsWith("https://")
            )
        ) {

            link.target =
                "_blank";

            link.rel =
                "noopener noreferrer";

        }

    }
);