// =========================================================
// CREVIO — PUBLIC PROJECTS
// =========================================================

const PROJECTS_API =
    "/api/public/projects";


// =========================================================
// LOAD PROJECTS
// =========================================================

async function loadProjects() {

    const container =
        document.getElementById(
            "projects-container"
        );


    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                PROJECTS_API
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
            !Array.isArray(
                data.projects
            )
        ) {

            throw new Error(
                "Invalid projects response."
            );

        }


        if (
            data.projects.length === 0
        ) {

            container.innerHTML =
                `
                <div class="empty-state">
                    No projects available yet.
                </div>
                `;

            return;

        }


        container.innerHTML =
            "";


        data.projects.forEach(
            project => {

                container.appendChild(
                    createProjectCard(
                        project
                    )
                );

            }
        );


    } catch (error) {

        console.error(
            "Crevio projects error:",
            error
        );


        container.innerHTML =
            `
            <div class="error-state">
                Unable to load projects.
            </div>
            `;

    }

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
        "project-card";


    const link =
        document.createElement(
            "a"
        );


    link.className =
        "project-card-link";


    link.href =
        `/project.html?id=${encodeURIComponent(
            project.id
        )}`;


    // =====================================================
    // THUMBNAIL
    // =====================================================

    const thumbnail =
        document.createElement(
            "div"
        );


    thumbnail.className =
        "project-thumbnail";


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
            () => {

                thumbnail.innerHTML =
                    `
                    <div class="empty-state">
                        Image unavailable
                    </div>
                    `;

            };


        thumbnail.appendChild(
            image
        );

    }


    // =====================================================
    // INFO
    // =====================================================

    const info =
        document.createElement(
            "div"
        );


    info.className =
        "project-info";


    if (
        project.category
    ) {

        const category =
            document.createElement(
                "p"
            );


        category.className =
            "project-category";


        category.textContent =
            project.category;


        info.appendChild(
            category
        );

    }


    const title =
        document.createElement(
            "h3"
        );


    title.className =
        "project-title";


    title.textContent =
        project.title ||
        "Untitled Project";


    info.appendChild(
        title
    );


    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "project-meta";


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
        meta.children.length
    ) {

        info.appendChild(
            meta
        );

    }


    if (
        project.description
    ) {

        const description =
            document.createElement(
                "p"
            );


        description.className =
            "project-description";


        description.textContent =
            project.description;


        info.appendChild(
            description
        );

    }


    link.appendChild(
        thumbnail
    );


    link.appendChild(
        info
    );


    article.appendChild(
        link
    );


    return article;

}


// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    loadProjects
);