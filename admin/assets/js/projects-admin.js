// =========================================================
// CREVIO ADMIN — PROJECT MANAGEMENT
// =========================================================

const PROJECTS_API =
    "/api/projects";


// =========================================================
// DOM ELEMENTS
// =========================================================

const projectsList =
    document.getElementById(
        "projects-list"
    );

const projectsLoading =
    document.getElementById(
        "projects-loading"
    );

const projectsEmpty =
    document.getElementById(
        "projects-empty"
    );

const projectsError =
    document.getElementById(
        "projects-error"
    );

const projectsErrorMessage =
    document.getElementById(
        "projects-error-message"
    );

const retryProjectsButton =
    document.getElementById(
        "retry-projects-button"
    );

const projectCount =
    document.getElementById(
        "project-count"
    );

const projectLastUpdated =
    document.getElementById(
        "project-last-updated"
    );

const logoutButton =
    document.getElementById(
        "logout-button"
    );


// =========================================================
// TOKEN
// =========================================================

function getToken() {

    return (
        localStorage.getItem("crevio_token") ||
        localStorage.getItem("token") ||
        ""
    );

}


// =========================================================
// AUTH HEADERS
// =========================================================

function getAuthHeaders() {

    const token =
        getToken();

    return {

        "Content-Type":
            "application/json",

        "Authorization":
            `Bearer ${token}`

    };

}


// =========================================================
// CHECK AUTH
// =========================================================

function requireAuthentication() {

    const token =
        getToken();

    if (!token) {

        window.location.href =
            "/admin/pages/login.html";

        return false;

    }

    return true;

}


// =========================================================
// SHOW LOADING
// =========================================================

function showLoading() {

    if (projectsLoading) {

        projectsLoading.hidden =
            false;

    }

    if (projectsEmpty) {

        projectsEmpty.hidden =
            true;

    }

    if (projectsError) {

        projectsError.hidden =
            true;

    }

    if (projectsList) {

        projectsList.innerHTML = "";

        if (projectsLoading) {

            projectsList.appendChild(
                projectsLoading
            );

        }

    }

}


// =========================================================
// SHOW EMPTY STATE
// =========================================================

function showEmpty() {

    if (projectsLoading) {

        projectsLoading.hidden =
            true;

    }

    if (projectsError) {

        projectsError.hidden =
            true;

    }

    if (projectsEmpty) {

        projectsEmpty.hidden =
            false;

    }

}


// =========================================================
// SHOW ERROR
// =========================================================

function showError(message) {

    if (projectsLoading) {

        projectsLoading.hidden =
            true;

    }

    if (projectsEmpty) {

        projectsEmpty.hidden =
            true;

    }

    if (projectsError) {

        projectsError.hidden =
            false;

    }

    if (projectsErrorMessage) {

        projectsErrorMessage.textContent =
            message;

    }

}


// =========================================================
// HIDE STATUS ELEMENTS
// =========================================================

function hideStatusElements() {

    if (projectsLoading) {

        projectsLoading.hidden =
            true;

    }

    if (projectsEmpty) {

        projectsEmpty.hidden =
            true;

    }

    if (projectsError) {

        projectsError.hidden =
            true;

    }

}


// =========================================================
// LOAD PROJECTS
// =========================================================

async function loadAdminProjects() {

    if (!requireAuthentication()) {

        return;

    }


    showLoading();


    try {

        const response =
            await fetch(
                PROJECTS_API,
                {
                    method: "GET",

                    headers:
                        getAuthHeaders()
                }
            );


        let data;

        try {

            data =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                `Server returned HTTP ${response.status}.`
            );

        }


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem(
                "crevio_token"
            );

            localStorage.removeItem(
                "token"
            );

            window.location.href =
                "/admin/pages/login.html";

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
            !Array.isArray(
                data.projects
            )
        ) {

            throw new Error(
                data.message ||
                "Invalid projects response."
            );

        }


        updateProjectSummary(
            data.projects
        );


        if (
            data.projects.length === 0
        ) {

            showEmpty();

            return;

        }


        renderProjects(
            data.projects
        );

        hideStatusElements();


    } catch (error) {

        console.error(
            "Admin project loading error:",
            error
        );


        showError(
            error.message ||
            "Unable to load projects."
        );

    }

}


// =========================================================
// UPDATE SUMMARY
// =========================================================

function updateProjectSummary(
    projects
) {

    if (projectCount) {

        projectCount.textContent =
            projects.length;

    }


    if (
        projectLastUpdated &&
        projects.length > 0
    ) {

        const latestProject =
            [...projects]
                .sort(
                    (a, b) => {

                        const dateA =
                            new Date(
                                a.updated_at ||
                                a.created_at ||
                                0
                            );

                        const dateB =
                            new Date(
                                b.updated_at ||
                                b.created_at ||
                                0
                            );

                        return dateB - dateA;

                    }
                )[0];


        const latestDate =
            latestProject.updated_at ||
            latestProject.created_at;


        projectLastUpdated.textContent =
            formatDate(
                latestDate
            );

    } else if (projectLastUpdated) {

        projectLastUpdated.textContent =
            "—";

    }

}


// =========================================================
// RENDER PROJECTS
// =========================================================

function renderProjects(
    projects
) {

    if (!projectsList) {

        return;

    }


    projectsList.innerHTML = "";


    projects.forEach(
        project => {

            const card =
                createProjectCard(
                    project
                );


            projectsList.appendChild(
                card
            );

        }
    );

}


// =========================================================
// CREATE PROJECT CARD
// =========================================================

function createProjectCard(
    project
) {

    const article =
        document.createElement(
            "article"
        );


    article.className =
        "admin-project-card";


    // =====================================================
    // THUMBNAIL
    // =====================================================

    const thumbnail =
        document.createElement(
            "div"
        );


    thumbnail.className =
        "admin-project-thumbnail";


    if (
        project.thumbnail_url
    ) {

        const image =
            document.createElement(
                "img"
            );


        image.src =
            project.thumbnail_url;


        image.alt =
            project.title ||
            "Project thumbnail";


        image.loading =
            "lazy";


        image.onerror =
            function () {

                this.style.display =
                    "none";

                thumbnail.classList.add(
                    "thumbnail-error"
                );

                const fallback =
                    document.createElement(
                        "span"
                    );

                fallback.textContent =
                    "Thumbnail unavailable";


                thumbnail.appendChild(
                    fallback
                );

            };


        thumbnail.appendChild(
            image
        );

    } else {

        const fallback =
            document.createElement(
                "span"
            );


        fallback.textContent =
            "No Thumbnail";


        thumbnail.appendChild(
            fallback
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
        "admin-project-content";


    // =====================================================
    // INFORMATION
    // =====================================================

    const information =
        document.createElement(
            "div"
        );


    information.className =
        "admin-project-information";


    // CATEGORY

    const category =
        document.createElement(
            "p"
        );


    category.className =
        "admin-project-category";


    category.textContent =
        project.category ||
        "Uncategorized";


    information.appendChild(
        category
    );


    // TITLE

    const title =
        document.createElement(
            "h2"
        );


    title.textContent =
        project.title ||
        "Untitled Project";


    information.appendChild(
        title
    );


    // DESCRIPTION

    if (
        project.description
    ) {

        const description =
            document.createElement(
                "p"
            );


        description.className =
            "admin-project-description";


        description.textContent =
            project.description;


        information.appendChild(
            description
        );

    }


    // META

    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "admin-project-meta";


    if (
        project.client_name
    ) {

        const client =
            document.createElement(
                "span"
            );


        client.textContent =
            project.client_name;


        meta.appendChild(
            client
        );

    }


    if (
        project.year
    ) {

        const year =
            document.createElement(
                "span"
            );


        year.textContent =
            project.year;


        meta.appendChild(
            year
        );

    }


    if (
        Array.isArray(
            project.media
        )
    ) {

        const mediaCount =
            document.createElement(
                "span"
            );


        mediaCount.textContent =
            `${project.media.length} media`;


        meta.appendChild(
            mediaCount
        );

    }


    if (
        meta.children.length > 0
    ) {

        information.appendChild(
            meta
        );

    }


    // =====================================================
    // ACTIONS
    // =====================================================

    const actions =
        document.createElement(
            "div"
        );


    actions.className =
        "admin-project-actions";


    // VIEW

    const viewButton =
        document.createElement(
            "a"
        );


    viewButton.href =
        `/project.html?id=${encodeURIComponent(
            project.id
        )}`;


    viewButton.target =
        "_blank";


    viewButton.rel =
        "noopener noreferrer";


    viewButton.className =
        "admin-action-view";


    viewButton.textContent =
        "View";


    actions.appendChild(
        viewButton
    );


    // EDIT

    const editButton =
        document.createElement(
            "a"
        );


    editButton.href =
        `/admin/pages/project-edit.html?id=${encodeURIComponent(
            project.id
        )}`;


    editButton.className =
        "admin-action-edit";


    editButton.textContent =
        "Edit";


    actions.appendChild(
        editButton
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


    deleteButton.dataset.projectId =
        project.id;


    deleteButton.dataset.projectTitle =
        project.title ||
        "this project";


    actions.appendChild(
        deleteButton
    );


    // =====================================================
    // BUILD CARD
    // =====================================================

    content.appendChild(
        information
    );


    content.appendChild(
        actions
    );


    article.appendChild(
        thumbnail
    );


    article.appendChild(
        content
    );


    return article;

}


// =========================================================
// DELETE PROJECT
// =========================================================

async function deleteProject(
    projectId,
    projectTitle,
    button
) {

    const confirmed =
        window.confirm(
            `Delete "${projectTitle}"?\n\nThis action cannot be undone.`
        );


    if (!confirmed) {

        return;

    }


    const originalText =
        button.textContent;


    button.disabled =
        true;


    button.textContent =
        "Deleting...";


    try {

        const response =
            await fetch(
                `${PROJECTS_API}/${encodeURIComponent(
                    projectId
                )}`,
                {
                    method: "DELETE",

                    headers:
                        getAuthHeaders()
                }
            );


        let data;

        try {

            data =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                `Server returned HTTP ${response.status}.`
            );

        }


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem(
                "crevio_token"
            );

            localStorage.removeItem(
                "token"
            );

            window.location.href =
                "/admin/pages/login.html";

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
                "Unable to delete project."
            );

        }


        await loadAdminProjects();


    } catch (error) {

        console.error(
            "Delete project error:",
            error
        );


        window.alert(
            error.message ||
            "Unable to delete project."
        );


        button.disabled =
            false;


        button.textContent =
            originalText;

    }

}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(
    dateValue
) {

    if (!dateValue) {

        return "—";

    }


    const parsedDate =
        new Date(
            String(
                dateValue
            ).replace(
                " ",
                "T"
            )
        );


    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {

        return String(
            dateValue
        );

    }


    return parsedDate.toLocaleDateString(
        undefined,
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


// =========================================================
// LOGOUT
// =========================================================

function logout() {

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
// EVENT DELEGATION
// =========================================================

document.addEventListener(
    "click",
    event => {

        // ---------------------------------------------
        // DELETE
        // ---------------------------------------------

        const deleteButton =
            event.target.closest(
                ".admin-action-delete"
            );


        if (deleteButton) {

            const projectId =
                deleteButton.dataset.projectId;


            const projectTitle =
                deleteButton.dataset.projectTitle;


            deleteProject(
                projectId,
                projectTitle,
                deleteButton
            );


            return;

        }


        // ---------------------------------------------
        // LOGOUT
        // ---------------------------------------------

        if (
            event.target.closest(
                "#logout-button"
            )
        ) {

            logout();

        }


        // ---------------------------------------------
        // RETRY
        // ---------------------------------------------

        if (
            event.target.closest(
                "#retry-projects-button"
            )
        ) {

            loadAdminProjects();

        }

    }
);


// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadAdminProjects();

    }
);