// ==========================================
// CREVIO — PROJECT DETAIL LOADER
// ==========================================


const API_BASE_URL = "/api/public/projects";


// ==========================================
// GET PROJECT ID
// ==========================================

const params =
    new URLSearchParams(
        window.location.search
    );


const projectId =
    params.get("id");


// ==========================================
// DOM ELEMENTS
// ==========================================

const titleElement =
    document.getElementById(
        "project-title"
    );


const metaElement =
    document.getElementById(
        "project-meta"
    );


const descriptionElement =
    document.getElementById(
        "project-description"
    );


const mediaElement =
    document.getElementById(
        "project-media"
    );


// ==========================================
// LOAD PROJECT
// ==========================================

async function loadProject() {

    if (!projectId) {

        showError(
            "No project was selected."
        );

        return;

    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/${projectId}`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success || !data.project) {

            throw new Error(
                "Project could not be found."
            );

        }


        renderProject(
            data.project
        );


    } catch (error) {

        console.error(
            "Project loading error:",
            error
        );


        showError(
            "Unable to load this project."
        );

    }

}


// ==========================================
// RENDER PROJECT
// ==========================================

function renderProject(project) {

    document.title =
        `${project.title} — Crevio`;


    // --------------------------------------
    // TITLE
    // --------------------------------------

    titleElement.textContent =
        project.title || "Untitled Project";


    // --------------------------------------
    // META
    // --------------------------------------

    metaElement.innerHTML = "";


    if (project.category) {

        addMeta(
            "Category",
            project.category
        );

    }


    if (project.client_name) {

        addMeta(
            "Client",
            project.client_name
        );

    }


    if (project.year) {

        addMeta(
            "Year",
            project.year
        );

    }


    // --------------------------------------
    // DESCRIPTION
    // --------------------------------------

    descriptionElement.textContent =
        project.description ||
        "No project description available.";


    // --------------------------------------
    // MEDIA
    // --------------------------------------

    renderMedia(project);

}


// ==========================================
// ADD META
// ==========================================

function addMeta(label, value) {

    const item =
        document.createElement("div");

    item.className =
        "project-meta-item";


    const labelElement =
        document.createElement("span");

    labelElement.className =
        "project-meta-label";


    labelElement.textContent =
        label;


    const valueElement =
        document.createElement("span");

    valueElement.className =
        "project-meta-value";


    valueElement.textContent =
        value;


    item.appendChild(
        labelElement
    );


    item.appendChild(
        valueElement
    );


    metaElement.appendChild(
        item
    );

}


// ==========================================
// RENDER MEDIA
// ==========================================

function renderMedia(project) {

    mediaElement.innerHTML = "";


    // --------------------------------------
    // THUMBNAIL
    // --------------------------------------

    if (project.thumbnail_url) {

        const thumbnail =
            document.createElement("img");


        thumbnail.className =
            "project-main-image";


        thumbnail.src =
            project.thumbnail_url;


        thumbnail.alt =
            project.title || "Project thumbnail";


        thumbnail.loading =
            "eager";


        mediaElement.appendChild(
            thumbnail
        );

    }


    // --------------------------------------
    // PROJECT MEDIA
    // --------------------------------------

    if (
        !project.media ||
        project.media.length === 0
    ) {

        return;

    }


    const mediaGrid =
        document.createElement("div");


    mediaGrid.className =
        "project-media-grid";


    project.media.forEach(
        (media) => {

            const item =
                document.createElement("div");


            item.className =
                "project-media-item";


            // ------------------------------
            // IMAGE
            // ------------------------------

            if (
                media.media_type === "image"
            ) {

                const image =
                    document.createElement("img");


                image.src =
                    media.media_url;


                image.alt =
                    media.title ||
                    project.title ||
                    "Project image";


                image.loading =
                    "lazy";


                item.appendChild(
                    image
                );

            }


            // ------------------------------
            // VIDEO
            // ------------------------------

            else if (
                media.media_type === "video"
            ) {

                const video =
                    document.createElement("video");


                video.src =
                    media.media_url;


                video.controls =
                    true;


                video.preload =
                    "metadata";


                video.playsInline =
                    true;


                item.appendChild(
                    video
                );

            }


            // ------------------------------
            // MEDIA INFORMATION
            // ------------------------------

            if (
                media.title ||
                media.description
            ) {

                const info =
                    document.createElement("div");


                info.className =
                    "project-media-info";


                if (media.title) {

                    const title =
                        document.createElement("h3");


                    title.textContent =
                        media.title;


                    info.appendChild(
                        title
                    );

                }


                if (media.description) {

                    const description =
                        document.createElement("p");


                    description.textContent =
                        media.description;


                    info.appendChild(
                        description
                    );

                }


                item.appendChild(
                    info
                );

            }


            mediaGrid.appendChild(
                item
            );

        }
    );


    mediaElement.appendChild(
        mediaGrid
    );

}


// ==========================================
// ERROR
// ==========================================

function showError(message) {

    titleElement.textContent =
        "Project unavailable";


    metaElement.innerHTML = "";


    descriptionElement.textContent =
        message;


    mediaElement.innerHTML = `

        <div class="error-state">

            ${message}

        </div>

    `;

}


// ==========================================
// CURRENT YEAR
// ==========================================

const yearElement =
    document.getElementById(
        "current-year"
    );


if (yearElement) {

    yearElement.textContent =
        new Date().getFullYear();

}


// ==========================================
// START
// ==========================================

loadProject();