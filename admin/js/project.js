// ==========================================
// CREVIO ADMIN - PROJECT PAGE
// ==========================================


// ==========================================
// AUTHENTICATION
// ==========================================

const token = localStorage.getItem("crevio_token");

if (!token) {

    window.location.href =
        "/admin/pages/login.html";

}


// ==========================================
// PROJECT ID
// ==========================================

const params =
    new URLSearchParams(
        window.location.search
    );


const projectId =
    Number(
        params.get("id")
    );


if (!Number.isInteger(projectId)) {

    window.location.href =
        "/admin/pages/projects.html";

}


// ==========================================
// ELEMENTS
// ==========================================

const projectForm =
    document.getElementById(
        "projectForm"
    );


const projectMessage =
    document.getElementById(
        "projectMessage"
    );


const saveProjectButton =
    document.getElementById(
        "saveProjectButton"
    );


const deleteProjectButton =
    document.getElementById(
        "deleteProjectButton"
    );


const addMediaButton =
    document.getElementById(
        "addMediaButton"
    );


const mediaContainer =
    document.getElementById(
        "mediaContainer"
    );


const mediaMessage =
    document.getElementById(
        "mediaMessage"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


// ==========================================
// API HELPER
// ==========================================

async function apiRequest(
    url,
    options = {}
) {

    const headers = {

        ...(options.headers || {}),

        "Authorization":
            `Bearer ${token}`

    };


    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );


    let data = null;


    try {

        data =
            await response.json();

    } catch {

        data = null;

    }


    if (!response.ok) {

        throw new Error(

            data?.message ||
            `Request failed with status ${response.status}.`

        );

    }


    return data;

}


// ==========================================
// LOAD PROJECT
// ==========================================

async function loadProject() {

    try {

        const data =
            await apiRequest(
                `/api/projects/${projectId}`
            );


        if (
            !data.success ||
            !data.project
        ) {

            throw new Error(
                data.message ||
                "Unable to load project."
            );

        }


        populateProject(
            data.project
        );


        await loadMedia();


    } catch (error) {

        console.error(
            "Load project error:",
            error
        );


        if (projectMessage) {

            projectMessage.textContent =
                error.message ||
                "Unable to load project.";

        }

    }

}


// ==========================================
// POPULATE PROJECT
// ==========================================

function populateProject(project) {

    const fields = {

        title:
            project.title || "",

        description:
            project.description || "",

        category:
            project.category || "",

        thumbnail_url:
            project.thumbnail_url || "",

        project_url:
            project.project_url || "",

        client_name:
            project.client_name || "",

        year:
            project.year || ""

    };


    Object.entries(fields)
        .forEach(
            ([id, value]) => {

                const element =
                    document.getElementById(
                        id
                    );


                if (element) {

                    element.value =
                        value;

                }

            }
        );


    const projectTitle =
        document.getElementById(
            "projectTitle"
        );


    if (projectTitle) {

        projectTitle.textContent =
            project.title ||
            "Project";

    }

}


// ==========================================
// LOAD MEDIA
// ==========================================

async function loadMedia() {

    if (!mediaContainer) {
        return;
    }


    mediaContainer.innerHTML = `

        <div class="loading-state">

            Loading media...

        </div>

    `;


    try {

        const data =
            await apiRequest(
                `/api/projects/${projectId}/media`
            );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load project media."
            );

        }


        renderMedia(
            data.media || []
        );


    } catch (error) {

        console.error(
            "Load media error:",
            error
        );


        mediaContainer.innerHTML = `

            <div class="empty-state">

                <h4>
                    Unable to load media
                </h4>

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
// RENDER MEDIA
// ==========================================

function renderMedia(
    mediaItems
) {

    if (!mediaItems.length) {

        mediaContainer.innerHTML = `

            <div class="empty-state">

                <h4>
                    No media yet
                </h4>

                <p>
                    Add images or videos to this project.
                </p>

            </div>

        `;

        return;

    }


    mediaContainer.innerHTML =
        mediaItems
            .map(
                item =>
                    createMediaCard(
                        item
                    )
            )
            .join("");


}


// ==========================================
// CREATE MEDIA CARD
// ==========================================

function createMediaCard(item) {

    const mediaType =
        item.media_type ||
        "image";


    const title =
        item.title ||
        "Untitled Media";


    const description =
        item.description ||
        "No description provided.";


    const mediaUrl =
        item.media_url ||
        "";


    let preview = "";


    // IMAGE

    if (
        mediaType ===
        "image"
    ) {

        preview = `

            <div class="media-preview">

                <img
                    src="${escapeAttribute(mediaUrl)}"
                    alt="${escapeAttribute(title)}"
                    loading="lazy"
                    onerror="
                        this.style.display='none';
                    "
                >

            </div>

        `;

    }


    // VIDEO

    else if (
        mediaType ===
        "video"
    ) {

        preview = `

            <div class="media-preview">

                <video
                    src="${escapeAttribute(mediaUrl)}"
                    controls
                    preload="metadata"
                ></video>

            </div>

        `;

    }


    return `

        <article
            class="media-card"
            data-media-id="${Number(item.id)}"
        >

            ${preview}


            <div class="media-card-content">


                <div class="media-card-header">

                    <span class="media-type-badge">

                        ${escapeHtml(
                            mediaType.toUpperCase()
                        )}

                    </span>

                </div>


                <h4>

                    ${escapeHtml(title)}

                </h4>


                <p>

                    ${escapeHtml(
                        description
                    )}

                </p>


                <div class="media-card-actions">


                    <button
                        type="button"
                        class="secondary-button"
                        data-action="edit"
                        data-media-id="${Number(item.id)}"
                    >
                        Edit
                    </button>


                    <button
                        type="button"
                        class="danger-button"
                        data-action="delete"
                        data-media-id="${Number(item.id)}"
                    >
                        Delete
                    </button>


                </div>


            </div>

        </article>

    `;

}


// ==========================================
// MEDIA CARD EVENTS
// ==========================================

if (mediaContainer) {

    mediaContainer.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "button[data-action]"
                );


            if (!button) {
                return;
            }


            const mediaId =
                Number(
                    button.dataset.mediaId
                );


            const action =
                button.dataset.action;


            if (
                action ===
                "edit"
            ) {

                editMedia(
                    mediaId
                );

            }


            if (
                action ===
                "delete"
            ) {

                deleteMedia(
                    mediaId
                );

            }

        }
    );

}


// ==========================================
// ADD MEDIA
// ==========================================

async function addMedia() {

    const mediaTypeElement =
        document.getElementById(
            "mediaType"
        );


    const mediaFileElement =
        document.getElementById(
            "mediaFile"
        );


    const mediaUrlElement =
        document.getElementById(
            "mediaUrl"
        );


    const mediaTitleElement =
        document.getElementById(
            "mediaTitle"
        );


    const mediaDescriptionElement =
        document.getElementById(
            "mediaDescription"
        );


    const mediaSortOrderElement =
        document.getElementById(
            "mediaSortOrder"
        );


    const mediaType =
        mediaTypeElement?.value ||
        "image";


    const mediaFile =
        mediaFileElement?.files?.[0] ||
        null;


    const mediaUrl =
        mediaUrlElement?.value.trim() ||
        "";


    const mediaTitle =
        mediaTitleElement?.value.trim() ||
        "";


    const mediaDescription =
        mediaDescriptionElement?.value.trim() ||
        "";


    const sortOrder =
        mediaSortOrderElement?.value
            ? Number(
                mediaSortOrderElement.value
            )
            : 0;


    // Require either file OR URL

    if (
        !mediaFile &&
        !mediaUrl
    ) {

        alert(
            "Please select a file or enter a media URL."
        );

        return;

    }


    const button =
        document.getElementById(
            "submitMediaButton"
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Adding...";

    }


    try {

        // ======================================
        // FILE UPLOAD
        // ======================================

        if (mediaFile) {

            const formData =
                new FormData();


            formData.append(
                "media",
                mediaFile
            );


            formData.append(
                "title",
                mediaTitle
            );


            formData.append(
                "description",
                mediaDescription
            );


            formData.append(
                "sort_order",
                String(sortOrder)
            );


            const response =
                await fetch(
                    `/api/projects/${projectId}/media/upload`,
                    {

                        method: "POST",

                        headers: {

                            "Authorization":
                                `Bearer ${token}`

                        },

                        body:
                            formData

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
                    "Unable to upload media."
                );

            }

        }


        // ======================================
        // URL MEDIA
        // ======================================

        else {

            const data =
                await apiRequest(
                    `/api/projects/${projectId}/media`,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                media_type:
                                    mediaType,

                                media_url:
                                    mediaUrl,

                                title:
                                    mediaTitle,

                                description:
                                    mediaDescription,

                                sort_order:
                                    sortOrder

                            })

                    }
                );


            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Unable to add media."
                );

            }

        }


        closeMediaModal();

        clearMediaForm();

        await loadMedia();


    } catch (error) {

        console.error(
            "Add media error:",
            error
        );


        alert(
            error.message ||
            "Unable to add media."
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Add Media";

        }

    }

}


// ==========================================
// EDIT MEDIA
// ==========================================

async function editMedia(
    mediaId
) {

    try {

        const data =
            await apiRequest(
                `/api/projects/${projectId}/media`
            );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load media."
            );

        }


        const media =
            (data.media || [])
                .find(
                    item =>
                        Number(item.id) ===
                        Number(mediaId)
                );


        if (!media) {

            throw new Error(
                "Media item not found."
            );

        }


        document.getElementById(
            "mediaType"
        ).value =
            media.media_type ||
            "image";


        document.getElementById(
            "mediaUrl"
        ).value =
            media.media_url ||
            "";


        document.getElementById(
            "mediaTitle"
        ).value =
            media.title ||
            "";


        document.getElementById(
            "mediaDescription"
        ).value =
            media.description ||
            "";


        document.getElementById(
            "mediaSortOrder"
        ).value =
            media.sort_order ??
            0;


        const fileInput =
            document.getElementById(
                "mediaFile"
            );


        if (fileInput) {

            fileInput.value =
                "";

        }


        const modalTitle =
            document.getElementById(
                "mediaModalTitle"
            );


        if (modalTitle) {

            modalTitle.textContent =
                "Edit Media";

        }


        const button =
            document.getElementById(
                "submitMediaButton"
            );


        if (button) {

            button.textContent =
                "Save Changes";


            button.onclick =
                () => updateMedia(
                    mediaId
                );

        }


        openMediaModal();


    } catch (error) {

        console.error(
            "Edit media error:",
            error
        );


        alert(
            error.message ||
            "Unable to edit media."
        );

    }

}


// ==========================================
// UPDATE MEDIA
// ==========================================

async function updateMedia(
    mediaId
) {

    const mediaType =
        document.getElementById(
            "mediaType"
        ).value;


    const mediaUrl =
        document.getElementById(
            "mediaUrl"
        ).value.trim();


    const mediaTitle =
        document.getElementById(
            "mediaTitle"
        ).value.trim();


    const mediaDescription =
        document.getElementById(
            "mediaDescription"
        ).value.trim();


    const sortOrder =
        document.getElementById(
            "mediaSortOrder"
        ).value;


    if (!mediaUrl) {

        alert(
            "Media URL is required when editing media."
        );

        return;

    }


    const button =
        document.getElementById(
            "submitMediaButton"
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Saving...";

    }


    try {

        const data =
            await apiRequest(
                `/api/projects/${projectId}/media/${mediaId}`,
                {

                    method: "PUT",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            media_type:
                                mediaType,

                            media_url:
                                mediaUrl,

                            title:
                                mediaTitle,

                            description:
                                mediaDescription,

                            sort_order:
                                sortOrder
                                    ? Number(
                                        sortOrder
                                    )
                                    : 0

                        })

                }
            );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to update media."
            );

        }


        closeMediaModal();

        clearMediaForm();

        await loadMedia();


    } catch (error) {

        console.error(
            "Update media error:",
            error
        );


        alert(
            error.message ||
            "Unable to update media."
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Add Media";

        }

    }

}


// ==========================================
// DELETE MEDIA
// ==========================================

async function deleteMedia(
    mediaId
) {

    const confirmed =
        window.confirm(
            "Are you sure you want to permanently delete this media?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const data =
            await apiRequest(
                `/api/projects/${projectId}/media/${mediaId}`,
                {

                    method: "DELETE"

                }
            );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to delete media."
            );

        }


        await loadMedia();


    } catch (error) {

        console.error(
            "Delete media error:",
            error
        );


        alert(
            error.message ||
            "Unable to delete media."
        );

    }

}


// ==========================================
// OPEN MEDIA MODAL
// ==========================================

function openMediaModal() {

    const modal =
        document.getElementById(
            "mediaModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.add(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );

}


// ==========================================
// CLOSE MEDIA MODAL
// ==========================================

function closeMediaModal() {

    const modal =
        document.getElementById(
            "mediaModal"
        );


    if (modal) {

        modal.classList.remove(
            "open"
        );


        modal.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    resetMediaModal();

}


// ==========================================
// RESET MEDIA MODAL
// ==========================================

function resetMediaModal() {

    const modalTitle =
        document.getElementById(
            "mediaModalTitle"
        );


    if (modalTitle) {

        modalTitle.textContent =
            "Add Media";

    }


    const button =
        document.getElementById(
            "submitMediaButton"
        );


    if (button) {

        button.disabled =
            false;

        button.textContent =
            "Add Media";

        button.onclick =
            addMedia;

    }


    clearMediaForm();

}


// ==========================================
// CLEAR MEDIA FORM
// ==========================================

function clearMediaForm() {

    const mediaType =
        document.getElementById(
            "mediaType"
        );


    const mediaFile =
        document.getElementById(
            "mediaFile"
        );


    const mediaUrl =
        document.getElementById(
            "mediaUrl"
        );


    const mediaTitle =
        document.getElementById(
            "mediaTitle"
        );


    const mediaDescription =
        document.getElementById(
            "mediaDescription"
        );


    const mediaSortOrder =
        document.getElementById(
            "mediaSortOrder"
        );


    if (mediaType) {

        mediaType.value =
            "image";

    }


    if (mediaFile) {

        mediaFile.value =
            "";

    }


    if (mediaUrl) {

        mediaUrl.value =
            "";

    }


    if (mediaTitle) {

        mediaTitle.value =
            "";

    }


    if (mediaDescription) {

        mediaDescription.value =
            "";

    }


    if (mediaSortOrder) {

        mediaSortOrder.value =
            "0";

    }

}


// ==========================================
// PROJECT UPDATE
// ==========================================

if (projectForm) {

    projectForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (projectMessage) {

                projectMessage.textContent =
                    "";

            }


            if (saveProjectButton) {

                saveProjectButton.disabled =
                    true;

                saveProjectButton.textContent =
                    "Saving...";

            }


            const body = {

                title:
                    document.getElementById(
                        "title"
                    )?.value.trim() || "",

                description:
                    document.getElementById(
                        "description"
                    )?.value.trim() || "",

                category:
                    document.getElementById(
                        "category"
                    )?.value.trim() || "",

                thumbnail_url:
                    document.getElementById(
                        "thumbnail_url"
                    )?.value.trim() || "",

                project_url:
                    document.getElementById(
                        "project_url"
                    )?.value.trim() || "",

                client_name:
                    document.getElementById(
                        "client_name"
                    )?.value.trim() || "",

                year:
                    document.getElementById(
                        "year"
                    )?.value
                        ? Number(
                            document.getElementById(
                                "year"
                            ).value
                        )
                        : null

            };


            try {

                const data =
                    await apiRequest(
                        `/api/projects/${projectId}`,
                        {

                            method: "PUT",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(body)

                        }
                    );


                if (!data.success) {

                    throw new Error(
                        data.message ||
                        "Unable to update project."
                    );

                }


                if (projectMessage) {

                    projectMessage.textContent =
                        "Project updated successfully.";

                }


                if (data.project) {

                    populateProject(
                        data.project
                    );

                }


            } catch (error) {

                console.error(
                    "Update project error:",
                    error
                );


                if (projectMessage) {

                    projectMessage.textContent =
                        error.message ||
                        "Unable to update project.";

                }

            } finally {

                if (saveProjectButton) {

                    saveProjectButton.disabled =
                        false;

                    saveProjectButton.textContent =
                        "Save Changes";

                }

            }

        }
    );

}


// ==========================================
// DELETE PROJECT
// ==========================================

if (deleteProjectButton) {

    deleteProjectButton.addEventListener(
        "click",
        async () => {

            const confirmed =
                window.confirm(
                    "Are you sure you want to permanently delete this project?"
                );


            if (!confirmed) {
                return;
            }


            deleteProjectButton.disabled =
                true;


            deleteProjectButton.textContent =
                "Deleting...";


            try {

                const data =
                    await apiRequest(
                        `/api/projects/${projectId}`,
                        {

                            method: "DELETE"

                        }
                    );


                if (!data.success) {

                    throw new Error(
                        data.message ||
                        "Unable to delete project."
                    );

                }


                window.location.href =
                    "/admin/pages/projects.html";


            } catch (error) {

                console.error(
                    "Delete project error:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to delete project."
                );


                deleteProjectButton.disabled =
                    false;


                deleteProjectButton.textContent =
                    "Delete Project";

            }

        }
    );

}


// ==========================================
// ADD MEDIA BUTTON
// ==========================================

if (addMediaButton) {

    addMediaButton.addEventListener(
        "click",
        () => {

            resetMediaModal();

            openMediaModal();

        }
    );

}


// ==========================================
// CLOSE MODAL
// ==========================================

const closeMediaButton =
    document.getElementById(
        "closeMediaModal"
    );


if (closeMediaButton) {

    closeMediaButton.addEventListener(
        "click",
        closeMediaModal
    );

}


// ==========================================
// CANCEL MODAL
// ==========================================

const cancelMediaButton =
    document.getElementById(
        "cancelMediaModal"
    );


if (cancelMediaButton) {

    cancelMediaButton.addEventListener(
        "click",
        closeMediaModal
    );

}


// ==========================================
// CLICK OUTSIDE MODAL
// ==========================================

const mediaModal =
    document.getElementById(
        "mediaModal"
    );


if (mediaModal) {

    const overlay =
        mediaModal.querySelector(
            ".modal-overlay"
        );


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeMediaModal
        );

    }

}


// ==========================================
// ESCAPE KEY
// ==========================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            const modal =
                document.getElementById(
                    "mediaModal"
                );


            if (
                modal &&
                modal.classList.contains(
                    "open"
                )
            ) {

                closeMediaModal();

            }

        }

    }
);


// ==========================================
// LOGOUT
// ==========================================

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
// HTML ESCAPE
// ==========================================

function escapeHtml(value) {

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
// ATTRIBUTE ESCAPE
// ==========================================

function escapeAttribute(value) {

    return escapeHtml(
        value
    );

}


// ==========================================
// INITIAL LOAD
// ==========================================

loadProject();