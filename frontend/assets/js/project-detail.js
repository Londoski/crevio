// =========================================================
// CREVIO — PROJECT DETAIL PAGE
// =========================================================

const API_BASE_URL =
    "/api/public/projects";

let currentMedia = [];

let currentMediaIndex = 0;


// =========================================================
// GET PROJECT ID
// =========================================================

function getProjectId() {

    const params =
        new URLSearchParams(
            window.location.search
        );

    return params.get("id");

}


// =========================================================
// LOAD PROJECT
// =========================================================

async function loadProject() {

    const projectId =
        getProjectId();


    if (!projectId) {

        showError(
            "No project was specified."
        );

        return;

    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/${encodeURIComponent(
                    projectId
                )}`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !data.success ||
            !data.project
        ) {

            throw new Error(
                "Invalid project response."
            );

        }


        renderProject(
            data.project
        );


        await loadProjectNavigation(
            Number(projectId)
        );


    } catch (error) {

        console.error(
            "Failed to load project:",
            error
        );


        showError(
            "Unable to load this project."
        );

    }

}


// =========================================================
// RENDER PROJECT
// =========================================================

function renderProject(
    project
) {

    const title =
        document.getElementById(
            "project-title"
        );


    const category =
        document.getElementById(
            "project-category"
        );


    const meta =
        document.getElementById(
            "project-meta"
        );


    const description =
        document.getElementById(
            "project-description"
        );


    if (!title) {
        return;
    }


    title.textContent =
        project.title ||
        "Untitled Project";


    document.title =
        `${project.title || "Project"} | Crevio`;


    if (category) {

        category.textContent =
            project.category ||
            "PROJECT";

    }


    if (meta) {

        meta.innerHTML =
            "";


        addMetaItem(
            meta,
            "Client",
            project.client_name
        );


        addMetaItem(
            meta,
            "Year",
            project.year
        );


        addMetaItem(
            meta,
            "Category",
            project.category
        );

    }


    if (description) {

        if (project.description) {

            description.textContent =
                project.description;

            description.style.display =
                "block";

        } else {

            description.style.display =
                "none";

        }

    }


    updateMetaDescription(
        project.description
    );


    renderMedia(
        project
    );

}


// =========================================================
// SEO META DESCRIPTION
// =========================================================

function updateMetaDescription(
    description
) {

    const metaDescription =
        document.getElementById(
            "project-meta-description"
        );


    if (
        metaDescription &&
        description
    ) {

        metaDescription.setAttribute(
            "content",
            description
        );

    }

}


// =========================================================
// ADD META ITEM
// =========================================================

function addMetaItem(
    container,
    label,
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return;
    }


    const item =
        document.createElement(
            "div"
        );


    item.className =
        "project-meta-item";


    const labelElement =
        document.createElement(
            "span"
        );


    labelElement.className =
        "project-meta-label";


    labelElement.textContent =
        label;


    const valueElement =
        document.createElement(
            "span"
        );


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


    container.appendChild(
        item
    );

}


// =========================================================
// RENDER MEDIA
// =========================================================

function renderMedia(
    project
) {

    const container =
        document.getElementById(
            "project-media"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    currentMedia =
        Array.isArray(
            project.media
        )
            ? project.media
            : [];


    /*
     * Try to use the project's thumbnail first.
     * If it fails, automatically fall back to
     * the first image contained in project.media.
     */

    const firstImage =
        currentMedia.find(
            media =>
                media &&
                media.media_type ===
                "image" &&
                media.media_url
        );


    if (project.thumbnail_url) {

        createMainImage(
            project.thumbnail_url,
            project.title ||
                "Project image",
            container,
            firstImage
        );

    } else if (firstImage) {

        createMainImage(
            firstImage.media_url,
            firstImage.title ||
                project.title ||
                "Project image",
            container
        );

    }


    /*
     * If the project has no thumbnail and no
     * image media, media grid will still render
     * video media below.
     */

    if (
        currentMedia.length === 0
    ) {

        if (
            !project.thumbnail_url &&
            !firstImage
        ) {

            container.innerHTML =
                `
                <div class="empty-state">
                    No media available for this project.
                </div>
                `;

        }

        return;

    }


    const grid =
        document.createElement(
            "div"
        );


    grid.className =
        "project-media-grid";


    currentMedia.forEach(
        (
            media,
            index
        ) => {

            const item =
                createMediaItem(
                    media,
                    index
                );


            if (item) {

                grid.appendChild(
                    item
                );

            }

        }
    );


    if (
        grid.children.length > 0
    ) {

        container.appendChild(
            grid
        );

    }

}


// =========================================================
// CREATE MAIN IMAGE
// =========================================================

function createMainImage(
    imageUrl,
    altText,
    container,
    fallbackMedia = null
) {

    const image =
        document.createElement(
            "img"
        );


    image.className =
        "project-main-image";


    image.alt =
        altText;


    /*
     * Keep the image visually hidden until
     * the browser confirms that it loaded.
     */

    image.style.opacity =
        "0";


    image.style.transition =
        "opacity 0.2s ease";


    image.src =
        imageUrl;


    image.addEventListener(
        "load",
        () => {

            image.style.opacity =
                "1";

        }
    );


    image.addEventListener(
        "error",
        () => {

            /*
             * If the main thumbnail fails,
             * replace it with the first valid
             * project image.
             */

            if (
                fallbackMedia &&
                fallbackMedia.media_url &&
                image.src !==
                    new URL(
                        fallbackMedia.media_url,
                        window.location.origin
                    ).href
            ) {

                image.src =
                    fallbackMedia.media_url;

                image.alt =
                    fallbackMedia.title ||
                    altText;

                return;

            }


            /*
             * No fallback exists.
             * Remove the broken image completely.
             */

            image.remove();

        }
    );


    container.appendChild(
        image
    );

}


// =========================================================
// CREATE MEDIA ITEM
// =========================================================

function createMediaItem(
    media,
    index
) {

    if (
        !media ||
        !media.media_url
    ) {

        return null;

    }


    const item =
        document.createElement(
            "article"
        );


    item.className =
        "project-media-item";


    // =====================================================
    // IMAGE
    // =====================================================

    if (
        media.media_type ===
        "image"
    ) {

        const image =
            document.createElement(
                "img"
            );


        image.src =
            media.media_url;


        image.alt =
            media.title ||
            "Project image";


        image.loading =
            "lazy";


        image.addEventListener(
            "error",
            () => {

                image.remove();

            }
        );


        image.style.cursor =
            "zoom-in";


        image.addEventListener(
            "click",
            () => {

                openLightbox(
                    index
                );

            }
        );


        item.appendChild(
            image
        );

    }


    // =====================================================
    // VIDEO
    // =====================================================

    else if (
        media.media_type ===
        "video"
    ) {

        const video =
            document.createElement(
                "video"
            );


        video.controls =
            true;


        video.preload =
            "metadata";


        video.playsInline =
            true;


        const source =
            document.createElement(
                "source"
            );


        source.src =
            media.media_url;


        /*
         * Determine MIME type from file extension
         * rather than assuming everything is MP4.
         */

        source.type =
            getVideoMimeType(
                media.media_url
            );


        video.appendChild(
            source
        );


        item.appendChild(
            video
        );

    }


    else {

        return null;

    }


    // =====================================================
    // MEDIA INFORMATION
    // =====================================================

    if (
        media.title ||
        media.description
    ) {

        const info =
            document.createElement(
                "div"
            );


        info.className =
            "project-media-info";


        if (media.title) {

            const title =
                document.createElement(
                    "h3"
                );


            title.textContent =
                media.title;


            info.appendChild(
                title
            );

        }


        if (media.description) {

            const description =
                document.createElement(
                    "p"
                );


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


    return item;

}


// =========================================================
// VIDEO MIME TYPE
// =========================================================

function getVideoMimeType(
    url
) {

    const cleanUrl =
        String(
            url
        ).split("?")[0]
        .toLowerCase();


    if (
        cleanUrl.endsWith(
            ".webm"
        )
    ) {

        return "video/webm";

    }


    if (
        cleanUrl.endsWith(
            ".mov"
    )
    ) {

        return "video/quicktime";

    }


    if (
        cleanUrl.endsWith(
            ".avi"
        )
    ) {

        return "video/x-msvideo";

    }


    return "video/mp4";

}


// =========================================================
// LOAD PROJECT NAVIGATION
// =========================================================

async function loadProjectNavigation(
    currentId
) {

    try {

        const response =
            await fetch(
                API_BASE_URL
            );


        if (!response.ok) {
            return;
        }


        const data =
            await response.json();


        if (
            !data.success ||
            !Array.isArray(
                data.projects
            )
        ) {

            return;

        }


        const projects =
            [...data.projects].sort(
                (
                    a,
                    b
                ) =>
                    Number(a.id) -
                    Number(b.id)
            );


        const currentIndex =
            projects.findIndex(
                project =>
                    Number(
                        project.id
                    ) ===
                    Number(
                        currentId
                    )
            );


        if (
            currentIndex === -1
        ) {

            return;

        }


        const previousProject =
            currentIndex > 0
                ? projects[
                    currentIndex - 1
                ]
                : null;


        const nextProject =
            currentIndex <
            projects.length - 1
                ? projects[
                    currentIndex + 1
                ]
                : null;


        setupProjectNavigation(
            previousProject,
            nextProject
        );


    } catch (error) {

        console.error(
            "Project navigation error:",
            error
        );

    }

}


// =========================================================
// SETUP PROJECT NAVIGATION
// =========================================================

function setupProjectNavigation(
    previousProject,
    nextProject
) {

    const previousLink =
        document.getElementById(
            "previous-project"
        );


    const previousTitle =
        document.getElementById(
            "previous-project-title"
        );


    const nextLink =
        document.getElementById(
            "next-project"
        );


    const nextTitle =
        document.getElementById(
            "next-project-title"
        );


    if (
        previousProject &&
        previousLink &&
        previousTitle
    ) {

        previousLink.href =
            `/project.html?id=${encodeURIComponent(
                previousProject.id
            )}`;


        previousTitle.textContent =
            previousProject.title ||
            "Previous project";


        previousLink.style.visibility =
            "visible";

    } else if (
        previousLink
    ) {

        previousLink.style.visibility =
            "hidden";

    }


    if (
        nextProject &&
        nextLink &&
        nextTitle
    ) {

        nextLink.href =
            `/project.html?id=${encodeURIComponent(
                nextProject.id
            )}`;


        nextTitle.textContent =
            nextProject.title ||
            "Next project";


        nextLink.style.visibility =
            "visible";

    } else if (
        nextLink
    ) {

        nextLink.style.visibility =
            "hidden";

    }

}


// =========================================================
// CREATE LIGHTBOX
// =========================================================

function createLightbox() {

    if (
        document.getElementById(
            "crevio-lightbox"
        )
    ) {

        return;

    }


    const lightbox =
        document.createElement(
            "div"
        );


    lightbox.id =
        "crevio-lightbox";


    lightbox.className =
        "crevio-lightbox";


    lightbox.innerHTML =
        `
        <button
            class="lightbox-close"
            type="button"
            aria-label="Close"
        >
            ×
        </button>


        <button
            class="lightbox-prev"
            type="button"
            aria-label="Previous image"
        >
            ←
        </button>


        <div class="lightbox-content"></div>


        <button
            class="lightbox-next"
            type="button"
            aria-label="Next image"
        >
            →
        </button>


        <div class="lightbox-caption"></div>
        `;


    document.body.appendChild(
        lightbox
    );


    lightbox
        .querySelector(
            ".lightbox-close"
        )
        .addEventListener(
            "click",
            closeLightbox
        );


    lightbox
        .querySelector(
            ".lightbox-prev"
        )
        .addEventListener(
            "click",
            showPreviousMedia
        );


    lightbox
        .querySelector(
            ".lightbox-next"
        )
        .addEventListener(
            "click",
            showNextMedia
        );


    lightbox.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                lightbox
            ) {

                closeLightbox();

            }

        }
    );

}


// =========================================================
// OPEN LIGHTBOX
// =========================================================

function openLightbox(
    index
) {

    const media =
        currentMedia[index];


    if (
        !media ||
        media.media_type !==
            "image"
    ) {

        return;

    }


    createLightbox();


    currentMediaIndex =
        index;


    const lightbox =
        document.getElementById(
            "crevio-lightbox"
        );


    lightbox.classList.add(
        "is-open"
    );


    document.body.classList.add(
        "lightbox-open"
    );


    renderLightboxMedia();

}


// =========================================================
// RENDER LIGHTBOX
// =========================================================

function renderLightboxMedia() {

    const media =
        currentMedia[
            currentMediaIndex
        ];


    if (!media) {
        return;
    }


    const lightbox =
        document.getElementById(
            "crevio-lightbox"
        );


    if (!lightbox) {
        return;
    }


    const content =
        lightbox.querySelector(
            ".lightbox-content"
        );


    const caption =
        lightbox.querySelector(
            ".lightbox-caption"
        );


    content.innerHTML =
        "";


    const image =
        document.createElement(
            "img"
        );


    image.src =
        media.media_url;


    image.alt =
        media.title ||
        "Project image";


    content.appendChild(
        image
    );


    caption.textContent =
        media.title ||
        "";


    const imageIndexes =
        currentMedia
            .map(
                (
                    item,
                    index
                ) =>
                    item.media_type ===
                    "image"
                        ? index
                        : null
            )
            .filter(
                index =>
                    index !== null
            );


    const previous =
        lightbox.querySelector(
            ".lightbox-prev"
        );


    const next =
        lightbox.querySelector(
            ".lightbox-next"
        );


    const multipleImages =
        imageIndexes.length > 1;


    previous.style.display =
        multipleImages
            ? "grid"
            : "none";


    next.style.display =
        multipleImages
            ? "grid"
            : "none";

}


// =========================================================
// PREVIOUS IMAGE
// =========================================================

function showPreviousMedia() {

    const imageIndexes =
        currentMedia
            .map(
                (
                    item,
                    index
                ) =>
                    item.media_type ===
                    "image"
                        ? index
                        : null
            )
            .filter(
                index =>
                    index !== null
            );


    if (
        imageIndexes.length <= 1
    ) {

        return;

    }


    const currentPosition =
        imageIndexes.indexOf(
            currentMediaIndex
        );


    const previousPosition =
        currentPosition <= 0
            ? imageIndexes.length - 1
            : currentPosition - 1;


    currentMediaIndex =
        imageIndexes[
            previousPosition
        ];


    renderLightboxMedia();

}


// =========================================================
// NEXT IMAGE
// =========================================================

function showNextMedia() {

    const imageIndexes =
        currentMedia
            .map(
                (
                    item,
                    index
                ) =>
                    item.media_type ===
                    "image"
                        ? index
                        : null
            )
            .filter(
                index =>
                    index !== null
            );


    if (
        imageIndexes.length <= 1
    ) {

        return;

    }


    const currentPosition =
        imageIndexes.indexOf(
            currentMediaIndex
        );


    const nextPosition =
        currentPosition >=
        imageIndexes.length - 1
            ? 0
            : currentPosition + 1;


    currentMediaIndex =
        imageIndexes[
            nextPosition
        ];


    renderLightboxMedia();

}


// =========================================================
// CLOSE LIGHTBOX
// =========================================================

function closeLightbox() {

    const lightbox =
        document.getElementById(
            "crevio-lightbox"
        );


    if (!lightbox) {
        return;
    }


    lightbox.classList.remove(
        "is-open"
    );


    document.body.classList.remove(
        "lightbox-open"
    );

}


// =========================================================
// KEYBOARD CONTROLS
// =========================================================

document.addEventListener(
    "keydown",
    event => {

        const lightbox =
            document.getElementById(
                "crevio-lightbox"
            );


        if (
            !lightbox ||
            !lightbox.classList.contains(
                "is-open"
            )
        ) {

            return;
        }


        if (
            event.key ===
            "Escape"
        ) {

            closeLightbox();

        }


        if (
            event.key ===
            "ArrowLeft"
        ) {

            showPreviousMedia();

        }


        if (
            event.key ===
            "ArrowRight"
        ) {

            showNextMedia();

        }

    }
);


// =========================================================
// DOM READY
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const year =
            document.getElementById(
                "current-year"
            );


        if (year) {

            year.textContent =
                new Date()
                    .getFullYear();

        }


        loadProject();

    }
);