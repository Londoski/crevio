// =========================================================
// CREVIO — MAIN PUBLIC JAVASCRIPT
// =========================================================


// =========================================================
// DOM READY
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateCurrentYear();

        initializeCrevioBot();

    }
);


// =========================================================
// CURRENT YEAR
// =========================================================

function updateCurrentYear() {

    const year =
        document.getElementById(
            "current-year"
        );


    if (!year) {
        return;
    }


    year.textContent =
        new Date().getFullYear();

}


// =========================================================
// BOT STATE
// =========================================================

let crevioBotOpen = false;


// =========================================================
// INITIALIZE CREVIO BOT
// =========================================================

function initializeCrevioBot() {

    const panel =
        document.getElementById(
            "ai-panel-trigger"
        );


    const heroButton =
        document.getElementById(
            "open-assistant-hero"
        );


    const navButton =
        document.getElementById(
            "open-assistant-nav"
        );


    const closeButton =
        document.getElementById(
            "ai-close"
        );


    const backdrop =
        document.getElementById(
            "ai-backdrop"
        );


    const form =
        document.getElementById(
            "ai-form"
        );


    const input =
        document.getElementById(
            "ai-input"
        );


    const suggestionButtons =
        document.querySelectorAll(
            "[data-ai-prompt]"
        );


    // =====================================================
    // VISUAL PANEL
    // =====================================================

    if (panel) {

        panel.addEventListener(
            "click",
            event => {

                event.preventDefault();

                openCrevioBot();

            }
        );

    }


    // =====================================================
    // HERO BUTTON
    // =====================================================

    if (heroButton) {

        heroButton.addEventListener(
            "click",
            openCrevioBot
        );

    }


    // =====================================================
    // NAV BUTTON
    // =====================================================

    if (navButton) {

        navButton.addEventListener(
            "click",
            openCrevioBot
        );

    }


    // =====================================================
    // CLOSE
    // =====================================================

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeCrevioBot
        );

    }


    // =====================================================
    // BACKDROP
    // =====================================================

    if (backdrop) {

        backdrop.addEventListener(
            "click",
            closeCrevioBot
        );

    }


    // =====================================================
    // FORM
    // =====================================================

    if (form) {

        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();


                const message =
                    input
                        ? input.value.trim()
                        : "";


                if (!message) {
                    return;
                }


                sendBotMessage(
                    message
                );


                if (input) {

                    input.value =
                        "";

                }

            }
        );

    }


    // =====================================================
    // SUGGESTIONS
    // =====================================================

    suggestionButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const prompt =
                        button.dataset
                            .aiPrompt;


                    if (!prompt) {
                        return;
                    }


                    sendBotMessage(
                        prompt
                    );

                }
            );

        }
    );


    // =====================================================
    // ESCAPE
    // =====================================================

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape" &&
                crevioBotOpen
            ) {

                closeCrevioBot();

            }

        }
    );

}


// =========================================================
// OPEN CREVIO BOT
// =========================================================

function openCrevioBot() {

    const assistant =
        document.getElementById(
            "ai-assistant"
        );


    if (!assistant) {
        return;
    }


    crevioBotOpen =
        true;


    assistant.classList.add(
        "is-open"
    );


    assistant.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "ai-open"
    );


    setTimeout(
        () => {

            const input =
                document.getElementById(
                    "ai-input"
                );


            if (input) {

                input.focus();

            }

        },
        250
    );

}


// =========================================================
// CLOSE CREVIO BOT
// =========================================================

function closeCrevioBot() {

    const assistant =
        document.getElementById(
            "ai-assistant"
        );


    if (!assistant) {
        return;
    }


    crevioBotOpen =
        false;


    assistant.classList.remove(
        "is-open"
    );


    assistant.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "ai-open"
    );

}


// =========================================================
// SEND BOT MESSAGE
// =========================================================

function sendBotMessage(
    message
) {

    if (!message) {
        return;
    }


    addBotMessage(
        message,
        "user"
    );


    /*
     * Temporary frontend response.
     *
     * The next stage will connect Crevio Bot
     * to your real project/database data.
     */

    setTimeout(
        () => {

            const response =
                generateTemporaryBotResponse(
                    message
                );


            addBotMessage(
                response,
                "assistant"
            );

        },
        650
    );

}


// =========================================================
// TEMPORARY BOT RESPONSE
// =========================================================

function generateTemporaryBotResponse(
    message
) {

    const lower =
        message.toLowerCase();


    if (
        lower.includes(
            "video"
        )
    ) {

        return [
            "Crevio includes video production, editing and visual storytelling work.",
            "You can explore the available projects in the Projects section."
        ];

    }


    if (
        lower.includes(
            "service"
        )
    ) {

        return [
            "The portfolio focuses on video production, video editing, graphic design, visual storytelling and digital creative work."
        ];

    }


    if (
        lower.includes(
            "experience"
        )
    ) {

        return [
            "The portfolio brings together creative production, design and media projects into one visual experience."
        ];

    }


    if (
        lower.includes(
            "project"
        )
    ) {

        return [
            "You can browse the current portfolio through the Projects section.",
            "Each project can be opened to view its dedicated project page and media."
        ];

    }


    return [
        "I'm Crevio Bot, the portfolio helper inside Crevio.",
        "I can help visitors discover the work, services and creative experience."
    ];

}


// =========================================================
// ADD BOT MESSAGE
// =========================================================

function addBotMessage(
    content,
    role
) {

    const messages =
        document.getElementById(
            "ai-messages"
        );


    if (!messages) {
        return;
    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        role === "user"
            ? "ai-message ai-message-user"
            : "ai-message ai-message-assistant";


    if (
        role ===
        "assistant"
    ) {

        const avatar =
            document.createElement(
                "div"
            );


        avatar.className =
            "ai-avatar";


        avatar.textContent =
            "C";


        wrapper.appendChild(
            avatar
        );

    }


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "ai-bubble";


    const paragraphs =
        Array.isArray(
            content
        )
            ? content
            : [content];


    paragraphs.forEach(
        text => {

            const paragraph =
                document.createElement(
                    "p"
                );


            paragraph.textContent =
                text;


            bubble.appendChild(
                paragraph
            );

        }
    );


    wrapper.appendChild(
        bubble
    );


    messages.appendChild(
        wrapper
    );


    messages.scrollTo({

        top:
            messages.scrollHeight,

        behavior:
            "smooth"

    });

}