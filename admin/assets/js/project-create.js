// =========================================================
// CREVIO ADMIN — CREATE PROJECT
// =========================================================

const CREATE_PROJECT_API =
    "/api/projects";


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
// FORM
// =========================================================

const form =
    document.getElementById(
        "create-project-form"
    );

const statusElement =
    document.getElementById(
        "form-status"
    );


// =========================================================
// SUBMIT
// =========================================================

form.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        statusElement.textContent =
            "Creating project...";


        const formData =
            new FormData(form);


        const payload = {

            title:
                formData.get("title"),

            description:
                formData.get("description"),

            category:
                formData.get("category"),

            thumbnail_url:
                formData.get("thumbnail_url"),

            project_url:
                formData.get("project_url"),

            client_name:
                formData.get("client_name"),

            year:
                formData.get("year")
                    ? Number(
                        formData.get("year")
                    )
                    : null

        };


        try {

            const response =
                await fetch(
                    CREATE_PROJECT_API,
                    {
                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${getToken()}`
                        },

                        body:
                            JSON.stringify(
                                payload
                            )

                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    `HTTP ${response.status}`
                );

            }


            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Unable to create project."
                );

            }


            statusElement.textContent =
                "Project created successfully.";


            form.reset();


            setTimeout(
                () => {

                    window.location.href =
                        "/admin/pages/projects.html";

                },
                800
            );


        } catch (error) {

            console.error(
                "Create project error:",
                error
            );


            statusElement.textContent =
                error.message;

        }

    }
);


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