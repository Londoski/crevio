// =========================================================
// CREVIO ADMIN — EDIT PROJECT
// =========================================================

const PROJECTS_API = "/api/projects";


// =========================================================
// PROJECT ID
// =========================================================

const params =
    new URLSearchParams(
        window.location.search
    );

const projectId =
    params.get("id");


// =========================================================
// DOM ELEMENTS
// =========================================================

const loadingElement =
    document.getElementById(
        "edit-loading"
    );

const errorElement =
    document.getElementById(
        "edit-error"
    );

const errorMessageElement =
    document.getElementById(
        "edit-error-message"
    );

const formSection =
    document.getElementById(
        "edit-form-section"
    );

const mediaSection =
    document.getElementById(
        "media-section"
    );

const form =
    document.getElementById(
        "edit-project-form"
    );

const formStatus =
    document.getElementById(
        "edit-form-status"
    );

const mediaUploadForm =
    document.getElementById(
        "media-upload-form"
    );

const mediaUploadStatus =
    document.getElementById(
        "media-upload-status"
    );

const mediaList =
    document.getElementById(
        "project-media-list"
    );

const saveMediaOrderButton =
    document.getElementById(
        "save-media-order-button"
    );


// =========================================================
// AUTH
// =========================================================

function getToken() {

    return (
        localStorage.getItem("crevio_token") ||
        localStorage.getItem("token") ||
        ""
    );

}


function getJsonHeaders() {

    return {

        "Content-Type":
            "application/json",

        "Authorization":
            `Bearer ${getToken()}`

    };

}


function getAuthHeaders() {

    return {

        "Authorization":
            `Bearer ${getToken()}`

    };

}


// =========================================================
// AUTH FAILURE
// =========================================================

function handleAuthFailure() {

    localStorage.removeItem(
        "crevio_token"
    );

    localStorage.removeItem(
        "token"
    );

    window.location.href =
        "/admin/pages/login.html";

}


// =========================================================
// LOAD PROJECT
// =========================================================

async function loadProject() {

    if (!projectId) {

        showError(
            "No project ID was provided."
        );

        return;

    }


    if (!getToken()) {

        handleAuthFailure();

        return;

    }


    try {

        const response =
            await fetch(
                `${PROJECTS_API}/${encodeURIComponent(
                    projectId
                )}`,
                {
                    method: "GET",
                    headers:
                        getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleAuthFailure();

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.message ||
                `HTTP ${response.status}`
            );

        }


        if (
            !data.success ||
            !data.project
        ) {

            throw new Error(
                data.message ||
                "Project not found."
            );

        }


        populateForm(
            data.project
        );


        renderMedia(
            data.project.media || []
        );


        if (loadingElement) {

            loadingElement.hidden =
                true;

        }

        if (formSection) {

            formSection.hidden =
                false;

        }

        if (mediaSection) {

            mediaSection.hidden =
                false;

        }


    } catch (error) {

        console.error(
            "Load project error:",
            error
        );


        showError(
            error.message ||
            "Unable to load project."
        );

    }

}


// =========================================================
// POPULATE PROJECT FORM
// =========================================================

function populateForm(
    project
) {

    const titleInput =
        document.getElementById(
            "title"
        );

    const descriptionInput =
        document.getElementById(
            "description"
        );

    const categoryInput =
        document.getElementById(
            "category"
        );

    const thumbnailInput =
        document.getElementById(
            "thumbnail_url"
        );

    const projectUrlInput =
        document.getElementById(
            "project_url"
        );

    const clientInput =
        document.getElementById(
            "client_name"
        );

    const yearInput =
        document.getElementById(
            "year"
        );


    if (titleInput) {

        titleInput.value =
            project.title || "";

    }


    if (descriptionInput) {

        descriptionInput.value =
            project.description || "";

    }


    if (categoryInput) {

        categoryInput.value =
            project.category || "";

    }


    if (thumbnailInput) {

        thumbnailInput.value =
            project.thumbnail_url || "";

    }


    if (projectUrlInput) {

        projectUrlInput.value =
            project.project_url || "";

    }


    if (clientInput) {

        clientInput.value =
            project.client_name || "";

    }


    if (yearInput) {

        yearInput.value =
            project.year || "";

    }

}


// =========================================================
// SAVE PROJECT
// =========================================================

if (form) {

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const saveButton =
                document.getElementById(
                    "save-project-button"
                );


            const title =
                document.getElementById(
                    "title"
                ).value.trim();


            const description =
                document.getElementById(
                    "description"
                ).value.trim();


            const category =
                document.getElementById(
                    "category"
                ).value.trim();


            const thumbnailUrl =
                document.getElementById(
                    "thumbnail_url"
                ).value.trim();


            const projectUrl =
                document.getElementById(
                    "project_url"
                ).value.trim();


            const clientName =
                document.getElementById(
                    "client_name"
                ).value.trim();


            const yearValue =
                document.getElementById(
                    "year"
                ).value;


            if (!title) {

                formStatus.textContent =
                    "Project title is required.";

                return;

            }


            const payload = {

                title,

                description,

                category,

                thumbnail_url:
                    thumbnailUrl,

                project_url:
                    projectUrl,

                client_name:
                    clientName,

                year:
                    yearValue
                        ? Number(yearValue)
                        : null

            };


            saveButton.disabled =
                true;


            saveButton.textContent =
                "Saving...";


            formStatus.textContent =
                "";


            try {

                const response =
                    await fetch(
                        `${PROJECTS_API}/${encodeURIComponent(
                            projectId
                        )}`,
                        {
                            method: "PUT",

                            headers:
                                getJsonHeaders(),

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );


                const data =
                    await response.json();


                if (
                    response.status === 401 ||
                    response.status === 403
                ) {

                    handleAuthFailure();

                    return;

                }


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        `HTTP ${response.status}`
                    );

                }


                if (!data.success) {

                    throw new Error(
                        data.message ||
                        "Unable to update project."
                    );

                }


                formStatus.textContent =
                    "Project updated successfully.";


                saveButton.disabled =
                    false;


                saveButton.textContent =
                    "Save Changes";


                await loadProject();


            } catch (error) {

                console.error(
                    "Update project error:",
                    error
                );


                formStatus.textContent =
                    error.message ||
                    "Unable to update project.";


                saveButton.disabled =
                    false;


                saveButton.textContent =
                    "Save Changes";

            }

        }
    );

}


// =========================================================
// UPLOAD MEDIA
// =========================================================

if (mediaUploadForm) {

    mediaUploadForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const fileInput =
                document.getElementById(
                    "media-file"
                );

            const uploadButton =
                document.getElementById(
                    "upload-media-button"
                );


            if (
                !fileInput ||
                !fileInput.files ||
                fileInput.files.length === 0
            ) {

                mediaUploadStatus.textContent =
                    "Please select an image or video.";

                return;

            }


            const file =
                fileInput.files[0];


            const maxSize =
                500 * 1024 * 1024;


            if (
                file.size >
                maxSize
            ) {

                mediaUploadStatus.textContent =
                    "File is too large. Maximum allowed size is 500 MB.";

                return;

            }


            const formData =
                new FormData();


            formData.append(
                "media",
                file
            );


            formData.append(
                "title",
                document.getElementById(
                    "media-title"
                ).value.trim()
            );


            formData.append(
                "description",
                document.getElementById(
                    "media-description"
                ).value.trim()
            );


            formData.append(
                "sort_order",
                document.getElementById(
                    "media-sort-order"
                ).value || "0"
            );


            uploadButton.disabled =
                true;


            uploadButton.textContent =
                "Uploading...";


            mediaUploadStatus.textContent =
                "";


            try {

                const response =
                    await fetch(
                        `${PROJECTS_API}/${encodeURIComponent(
                            projectId
                        )}/media/upload`,
                        {
                            method: "POST",

                            headers:
                                getAuthHeaders(),

                            body:
                                formData
                        }
                    );


                const data =
                    await response.json();


                if (
                    response.status === 401 ||
                    response.status === 403
                ) {

                    handleAuthFailure();

                    return;

                }


                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        `HTTP ${response.status}`
                    );

                }


                if (!data.success) {

                    throw new Error(
                        data.message ||
                        "Media upload failed."
                    );

                }


                mediaUploadStatus.textContent =
                    "Media uploaded successfully.";


                mediaUploadForm.reset();


                const sortOrderInput =
                    document.getElementById(
                        "media-sort-order"
                    );


                if (sortOrderInput) {

                    sortOrderInput.value =
                        "0";

                }


                await reloadMedia();


            } catch (error) {

                console.error(
                    "Media upload error:",
                    error
                );


                mediaUploadStatus.textContent =
                    error.message ||
                    "Media upload failed.";

            } finally {

                uploadButton.disabled =
                    false;


                uploadButton.textContent =
                    "Upload Media";

            }

        }
    );

}


// =========================================================
// RELOAD MEDIA
// =========================================================

async function reloadMedia() {

    try {

        const response =
            await fetch(
                `${PROJECTS_API}/${encodeURIComponent(
                    projectId
                )}`,
                {
                    method: "GET",

                    headers:
                        getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleAuthFailure();

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.message ||
                `HTTP ${response.status}`
            );

        }


        if (
            !data.success ||
            !data.project
        ) {

            throw new Error(
                data.message ||
                "Unable to reload project media."
            );

        }


        renderMedia(
            data.project.media || []
        );


    } catch (error) {

        console.error(
            "Reload media error:",
            error
        );


        mediaList.innerHTML = `
            <div class="admin-error">
                Unable to reload media.
            </div>
        `;

    }

}


// =========================================================
// RENDER MEDIA
// =========================================================

function renderMedia(
    mediaItems
) {

    if (!mediaList) {

        return;

    }


    mediaList.innerHTML = "";


    if (
        !Array.isArray(
            mediaItems
        ) ||
        mediaItems.length === 0
    ) {

        mediaList.innerHTML = `
            <div class="admin-empty">
                No media has been added to this project yet.
            </div>
        `;

        return;

    }


    const sortedMedia =
        [...mediaItems].sort(
            (a, b) => {

                const orderA =
                    Number(
                        a.sort_order ?? 0
                    );

                const orderB =
                    Number(
                        b.sort_order ?? 0
                    );

                return orderA - orderB;

            }
        );


    sortedMedia.forEach(
        media => {

            mediaList.appendChild(
                createMediaCard(
                    media
                )
            );

        }
    );

}


// =========================================================
// CREATE MEDIA CARD
// =========================================================

function createMediaCard(
    media
) {

    const card =
        document.createElement(
            "article"
        );


    card.className =
        "admin-media-card";


    card.dataset.mediaId =
        media.id;


    // =====================================================
    // PREVIEW
    // =====================================================

    const preview =
        document.createElement(
            "div"
        );


    preview.className =
        "admin-media-preview";


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


        preview.appendChild(
            image
        );

    } else if (
        media.media_type ===
        "video"
    ) {

        const video =
            document.createElement(
                "video"
            );


        video.src =
            media.media_url;


        video.controls =
            true;


        video.preload =
            "metadata";


        video.playsInline =
            true;


        preview.appendChild(
            video
        );

    }


    // =====================================================
    // CONTENT
    // =====================================================

    const content =
        document.createElement(
            "div"
        );


    content.className =
        "admin-media-content";


    // TYPE

    const type =
        document.createElement(
            "p"
        );


    type.className =
        "admin-media-type";


    type.textContent =
        String(
            media.media_type ||
            "MEDIA"
        ).toUpperCase();


    content.appendChild(
        type
    );


    // TITLE

    if (
        media.title
    ) {

        const title =
            document.createElement(
                "h3"
            );


        title.textContent =
            media.title;


        content.appendChild(
            title
        );

    }


    // DESCRIPTION

    if (
        media.description
    ) {

        const description =
            document.createElement(
                "p"
            );


        description.textContent =
            media.description;


        content.appendChild(
            description
        );

    }


    // =====================================================
    // ORDER
    // =====================================================

    const orderWrapper =
        document.createElement(
            "div"
        );


    orderWrapper.className =
        "admin-media-order";


    const orderLabel =
        document.createElement(
            "label"
        );


    orderLabel.textContent =
        "Display Order";


    const orderInput =
        document.createElement(
            "input"
        );


    orderInput.type =
        "number";


    orderInput.min =
        "0";


    orderInput.value =
        Number(
            media.sort_order ?? 0
        );


    orderInput.className =
        "media-order-input";


    orderInput.dataset.mediaId =
        media.id;


    orderWrapper.appendChild(
        orderLabel
    );


    orderWrapper.appendChild(
        orderInput
    );


    content.appendChild(
        orderWrapper
    );


    // =====================================================
    // ACTIONS
    // =====================================================

    const actions =
        document.createElement(
            "div"
        );


    actions.className =
        "admin-media-actions";


    // OPEN

    const openLink =
        document.createElement(
            "a"
        );


    openLink.href =
        media.media_url;


    openLink.target =
        "_blank";


    openLink.rel =
        "noopener noreferrer";


    openLink.className =
        "admin-secondary-button";


    openLink.textContent =
        "Open";


    actions.appendChild(
        openLink
    );


    // DELETE

    const deleteButton =
        document.createElement(
            "button"
        );


    deleteButton.type =
        "button";


    deleteButton.className =
        "admin-action-delete";


    deleteButton.textContent =
        "Delete";


    deleteButton.addEventListener(
        "click",
        () => {

            deleteMedia(
                media.id,
                media.title ||
                media.media_type
            );

        }
    );


    actions.appendChild(
        deleteButton
    );


    content.appendChild(
        actions
    );


    // =====================================================
    // BUILD CARD
    // =====================================================

    card.appendChild(
        preview
    );


    card.appendChild(
        content
    );


    return card;

}


// =========================================================
// SAVE MEDIA ORDER
// =========================================================

async function saveMediaOrder() {

    const inputs =
        document.querySelectorAll(
            ".media-order-input"
        );


    if (
        !inputs.length
    ) {

        mediaUploadStatus.textContent =
            "There is no media to reorder.";

        return;

    }


    if (saveMediaOrderButton) {

        saveMediaOrderButton.disabled =
            true;


        saveMediaOrderButton.textContent =
            "Saving...";

    }


    try {

        for (
            const input
            of inputs
        ) {

            const mediaId =
                input.dataset.mediaId;


            const sortOrder =
                Math.max(
                    0,
                    Number(
                        input.value
                    ) || 0
                );


            const response =
                await fetch(
                    `${PROJECTS_API}/${encodeURIComponent(
                        projectId
                    )}/media/${encodeURIComponent(
                        mediaId
                    )}/order`,
                    {
                        method: "PUT",

                        headers:
                            getJsonHeaders(),

                        body:
                            JSON.stringify({

                                sort_order:
                                    sortOrder

                            })
                    }
                );


            const data =
                await response.json();


            if (
                response.status === 401 ||
                response.status === 403
            ) {

                handleAuthFailure();

                return;

            }


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    `HTTP ${response.status}`
                );

            }


            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Unable to update media order."
                );

            }

        }


        mediaUploadStatus.textContent =
            "Media order saved successfully.";


        await reloadMedia();


    } catch (error) {

        console.error(
            "Save media order error:",
            error
        );


        mediaUploadStatus.textContent =
            error.message ||
            "Unable to save media order.";

    } finally {

        if (saveMediaOrderButton) {

            saveMediaOrderButton.disabled =
                false;


            saveMediaOrderButton.textContent =
                "Save Media Order";

        }

    }

}


// =========================================================
// DELETE MEDIA
// =========================================================

async function deleteMedia(
    mediaId,
    mediaTitle
) {

    const confirmed =
        window.confirm(
            `Delete "${mediaTitle}"?\n\nThis will permanently remove the media from this project.`
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                `${PROJECTS_API}/${encodeURIComponent(
                    projectId
                )}/media/${encodeURIComponent(
                    mediaId
                )}`,
                {
                    method: "DELETE",

                    headers:
                        getAuthHeaders()
                }
            );


        const data =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            handleAuthFailure();

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.message ||
                `HTTP ${response.status}`
            );

        }


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to delete media."
            );

        }


        mediaUploadStatus.textContent =
            "Media deleted successfully.";


        await reloadMedia();


    } catch (error) {

        console.error(
            "Delete media error:",
            error
        );


        window.alert(
            error.message ||
            "Unable to delete media."
        );

    }

}


// =========================================================
// SHOW ERROR
// =========================================================

function showError(
    message
) {

    if (loadingElement) {

        loadingElement.hidden =
            true;

    }


    if (formSection) {

        formSection.hidden =
            true;

    }


    if (mediaSection) {

        mediaSection.hidden =
            true;

    }


    if (errorElement) {

        errorElement.hidden =
            false;

    }


    if (errorMessageElement) {

        errorMessageElement.textContent =
            message;

    }

}


// =========================================================
// LOGOUT
// =========================================================

const logoutButton =
    document.getElementById(
        "logout-button"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "crevio_token"
            );

            localStorage.removeItem(
                "token"
            );

            window.location.href =
                "/admin/pages/login.html";

        }
    );

}


// =========================================================
// SAVE MEDIA ORDER BUTTON
// =========================================================

if (saveMediaOrderButton) {

    saveMediaOrderButton.addEventListener(
        "click",
        saveMediaOrder
    );

}


// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadProject();

    }
);