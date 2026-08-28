const projectModel =
    require("../models/projectModel");


// ==========================================
// GET PUBLIC PROJECTS
// ==========================================

const getPublicProjects = (req, res) => {

    try {

        const projects =
            projectModel.getAll();

        res.json({

            success: true,

            count: projects.length,

            projects

        });

    } catch (error) {

        console.error(
            "Get public projects error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to load projects."

        });

    }

};


// ==========================================
// GET SINGLE PUBLIC PROJECT
// ==========================================

const getPublicProjectById = (req, res) => {

    try {

        const { id } = req.params;


        // Validate ID
        if (!id || isNaN(Number(id))) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid project ID."

            });

        }


        const project =
            projectModel.findById(
                Number(id)
            );


        // Project does not exist
        if (!project) {

            return res.status(404).json({

                success: false,

                message:
                    "Project not found."

            });

        }


        res.json({

            success: true,

            project

        });

    } catch (error) {

        console.error(
            "Get public project error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Unable to load project."

        });

    }

};


// ==========================================
// EXPORT
// ==========================================

module.exports = {

    getPublicProjects,

    getPublicProjectById

};