// =========================================================
// CREVIO — MEDIA LIBRARY
// File: dashboard/js/media.js
// Bulletproof thumbnails with manual fallback
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);

    const container = $("mediaContainer");
    const dropZone  = $("dropZone");
    const fileInput = $("fileInput");
    const uploadBtn = $("uploadBtn");
    const queue     = $("uploadQueue");
    const toast     = $("toast");
    const overlay   = $("panelOverlay");
    const panel     = $("detailsPanel");

    let allMedia = [];
    let filter   = "all";
    let search   = "";
    let sort     = "newest";
    let view     = "grid";
    let debounceTimer;

    // =========================================================
    // LOAD STATS
    // =========================================================
    async function loadStats() {
        try {
            const res = await window.apiFetch("/api/media/stats");
            const d = await res.json();
            if (d.success) {
                setText("statTotal",  d.stats.total);
                setText("statImages", d.stats.images);
                setText("statVideos", d.stats.videos);
                setText("statAudio",  d.stats.audio);
                setText("statDocs",   d.stats.documents);
            }
        } catch (err) { console.error("Stats error:", err); }
    }

    // =========================================================
    // LOAD MEDIA
    // =========================================================
    async function loadMedia() {
        container.innerHTML = `<div class="state-box"><p>Loading media…</p></div>`;
        try {
            const url = `/api/media?filter=${filter}&sort=${sort}&search=${encodeURIComponent(search)}`;
            const res = await window.apiFetch(url);
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            allMedia = data.media || [];
            render();
        } catch (err) {
            console.error("Load error:", err);
            container.innerHTML = `
                <div class="state-box error">
                    <i data-lucide="alert-triangle" class="icon-lg"></i>
                    <h3>We couldn't load your media.</h3>
                    <p>${escapeHtml(err.message)}</p>
                    <button class="btn-primary" onclick="location.reload()">Try Again</button>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    }

    // =========================================================
    // RENDER
    // =========================================================
    function render() {
        if (!allMedia.length) {
            const isFiltered = search || filter !== "all";
            container.innerHTML = `
                <div class="state-box">
                    <i data-lucide="${isFiltered ? "search-x" : "image"}" class="icon-lg"></i>
                    <h3>${isFiltered ? "No media found" : "Your media library is empty"}</h3>
                    <p>${isFiltered
                        ? "Try a different search or remove some filters."
                        : "Upload images, videos, audio, and other assets."}</p>
                    <button class="btn-primary" onclick="document.getElementById('uploadBtn').click()">
                        <i data-lucide="upload" class="icon" style="width:14px;height:14px;"></i>
                        Upload Media
                    </button>
                </div>`;
            if (typeof lucide !== "undefined") lucide.createIcons();
            return;
        }

        if (view === "list") {
            container.innerHTML = `<div class="media-list">${allMedia.map(renderListRow).join("")}</div>`;
        } else {
            container.innerHTML = `<div class="media-grid">${allMedia.map(renderGridCard).join("")}</div>`;
        }

        if (typeof lucide !== "undefined") lucide.createIcons();

        container.querySelectorAll("[data-media-id]").forEach(el => {
            el.addEventListener("click", (e) => {
                if (e.target.closest("button")) return;
                openDetails(parseInt(el.dataset.mediaId, 10));
            });
        });
    }

    function renderGridCard(m) {
        const group = m.category_group || "other";
        const preview = previewHTML(m, "grid");

        return `
            <div class="media-card" data-media-id="${m.id}">
                <div class="media-preview">
                    ${preview}
                    <span class="media-type-badge">${group}</span>
                </div>
                <div class="media-info">
                    <div class="media-name" title="${escapeHtml(m.display_name)}">${escapeHtml(m.display_name)}</div>
                    <div class="media-meta">
                        <span>${formatBytes(m.file_size)}</span>
                        ${m.used_in_count > 0 ? `<span class="dot">·</span><span>Used in ${m.used_in_count}</span>` : ""}
                    </div>
                </div>
            </div>
        `;
    }

    function renderListRow(m) {
        const group = m.category_group || "other";
        const preview = previewHTML(m, "list");

        return `
            <div class="list-row" data-media-id="${m.id}">
                <div class="thumb">${preview}</div>
                <div class="name" title="${escapeHtml(m.display_name)}">${escapeHtml(m.display_name)}</div>
                <div class="cell hide-tablet">${group}</div>
                <div class="cell hide-tablet">${formatBytes(m.file_size)}</div>
                <div class="cell hide-mobile">${formatDate(m.created_at)}</div>
                <div class="actions">
                    <button class="icon-btn" data-action="download" data-id="${m.id}" title="Download">
                        <i data-lucide="download" class="icon"></i>
                    </button>
                </div>
            </div>
        `;
    }

    function previewHTML(m, mode) {
        const url = m.media_url;
        const thumb = m.thumbnail_url;
        const group = m.category_group;
        const size = mode === "list" ? "20" : "44";

        if (group === "image") {
            return `<img src="${escapeHtml(url)}" alt="" loading="lazy">`;
        }

        if (group === "video") {
            if (thumb && thumb !== url) {
                return `<img src="${escapeHtml(thumb)}" alt="" loading="lazy">`;
            }
            return `<i data-lucide="video" class="type-icon" style="width:${size}px;height:${size}px;"></i>`;
        }

        if (group === "audio") {
            return `<i data-lucide="music" class="type-icon" style="width:${size}px;height:${size}px;"></i>`;
        }
        if (group === "document") {
            return `<i data-lucide="file-text" class="type-icon" style="width:${size}px;height:${size}px;"></i>`;
        }
        return `<i data-lucide="file" class="type-icon" style="width:${size}px;height:${size}px;"></i>`;
    }

    // =========================================================
    // DETAILS PANEL
    // =========================================================
    async function openDetails(id) {
        try {
            const res = await window.apiFetch(`/api/media/${id}`);
            const data = await res.json();
            if (!data.success || !data.media) throw new Error("Not found");

            const m = data.media;
            const group = m.category_group;

            let preview = "";
            if (group === "image") {
                preview = `<img src="${escapeHtml(m.media_url)}" alt="">`;
            } else if (group === "video") {
                const poster = (m.thumbnail_url && m.thumbnail_url !== m.media_url)
                    ? `poster="${escapeHtml(m.thumbnail_url)}"`
                    : "";
                preview = `<video controls ${poster} src="${escapeHtml(m.media_url)}"></video>`;
            } else if (group === "audio") {
                preview = `<audio controls src="${escapeHtml(m.media_url)}"></audio>`;
            } else {
                preview = `
                    <div class="fallback">
                        <i data-lucide="file-text" class="icon"></i>
                        <div>Preview not available</div>
                    </div>`;
            }

            const showThumbTools = group === "video" && (!m.thumbnail_url || m.thumbnail_url === m.media_url);

            panel.innerHTML = `
                <div class="panel-header">
                    <h3>Media Details</h3>
                    <button class="icon-btn" id="closePanel"><i data-lucide="x" class="icon"></i></button>
                </div>

                <div class="panel-preview" id="previewBox">${preview}</div>

                ${showThumbTools ? `
                    <div class="panel-section" style="border:1px solid var(--border-color); border-radius:10px; padding:14px; background:var(--bg-input);">
                        <h4 style="margin-top:0;">Thumbnail</h4>
                        <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
                            No thumbnail set. Generate one from the first frame, or upload your own image.
                        </p>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <button class="btn-secondary" id="genThumbBtn" style="width:100%; justify-content:center;">
                                <i data-lucide="image-plus" class="icon" style="width:14px;height:14px;"></i>
                                Auto-generate from video
                            </button>
                            <button class="btn-secondary" id="pickThumbBtn" style="width:100%; justify-content:center;">
                                <i data-lucide="upload" class="icon" style="width:14px;height:14px;"></i>
                                Upload custom image
                            </button>
                            <input type="file" id="thumbFileInput" accept="image/*" style="display:none;">
                        </div>
                    </div>
                ` : ""}

                <div class="panel-section">
                    <h4>File</h4>
                    <div class="meta-row"><span class="key">Name</span><span class="val">${escapeHtml(m.display_name)}</span></div>
                    <div class="meta-row"><span class="key">Type</span><span class="val">${escapeHtml(m.media_type || "—")}</span></div>
                    <div class="meta-row"><span class="key">Size</span><span class="val">${formatBytes(m.file_size)}</span></div>
                    <div class="meta-row"><span class="key">Uploaded</span><span class="val">${formatDate(m.created_at)}</span></div>
                </div>

                <div class="panel-section">
                    <h4>Rename</h4>
                    <input type="text" id="editTitle" value="${escapeHtml(m.title || m.original_filename || "")}"
                        style="width:100%; padding:10px 12px; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-primary); font-size:14px; font-family:inherit;">
                    <textarea id="editDescription" placeholder="Description (optional)" style="width:100%; margin-top:8px; min-height:60px; padding:10px 12px; border-radius:10px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-primary); font-size:13px; font-family:inherit; resize:vertical;">${escapeHtml(m.description || "")}</textarea>
                    <button class="btn-primary" id="saveBtn" style="width:100%; justify-content:center; margin-top:12px;">
                        <i data-lucide="save" class="icon" style="width:14px;height:14px;"></i> Save Changes
                    </button>
                </div>

                <div class="panel-actions">
                    <a href="/api/media/${m.id}/download" class="btn-secondary" download>
                        <i data-lucide="download" class="icon" style="width:14px;height:14px;"></i> Download
                    </a>
                    <button class="btn-danger" id="deleteBtn" style="flex:1; justify-content:center;">
                        <i data-lucide="trash-2" class="icon" style="width:14px;height:14px;"></i> Delete
                    </button>
                </div>
            `;

            if (typeof lucide !== "undefined") lucide.createIcons();
            overlay.classList.add("open");

            $("closePanel")?.addEventListener("click", closePanel);
            $("saveBtn")?.addEventListener("click", () => saveMetadata(m.id));
            $("deleteBtn")?.addEventListener("click", () => deleteMedia(m.id, m.used_in_count));

            if (showThumbTools) {
                $("genThumbBtn")?.addEventListener("click", () => autoGenerateThumb(m));
                $("pickThumbBtn")?.addEventListener("click", () => $("thumbFileInput").click());
                $("thumbFileInput")?.addEventListener("change", function () {
                    if (this.files[0]) uploadCustomThumb(m.id, this.files[0]);
                    this.value = "";
                });
            }
        } catch (err) {
            console.error("Details error:", err);
            showToast("Could not load media: " + err.message, true);
        }
    }

    function closePanel() {
        overlay.classList.remove("open");
        panel.innerHTML = "";
    }

    overlay?.addEventListener("click", (e) => { if (e.target === overlay) closePanel(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

    // =========================================================
    // SAVE METADATA
    // =========================================================
    async function saveMetadata(id) {
        const title = $("editTitle")?.value.trim() || "";
        const description = $("editDescription")?.value.trim() || "";

        try {
            const res = await window.apiFetch(`/api/media/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ title, description })
            });
            const data = await res.json();
            if (data.success) {
                showToast("Media updated");
                closePanel();
                loadMedia();
            } else {
                showToast(data.message || "Update failed", true);
            }
        } catch (err) {
            showToast("Update failed: " + err.message, true);
        }
    }

    // =========================================================
    // DELETE
    // =========================================================
    async function deleteMedia(id, usedInCount) {
        const msg = usedInCount > 0
            ? `This media is used in ${usedInCount} project(s). Deleting may remove it from those projects.\n\nDelete anyway?`
            : "Delete this file permanently?";

        if (!confirm(msg)) return;

        try {
            const res = await window.apiFetch(`/api/media/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                showToast("Media deleted");
                closePanel();
                loadMedia();
                loadStats();
            } else {
                showToast(data.message || "Delete failed", true);
            }
        } catch (err) {
            showToast("Delete failed: " + err.message, true);
        }
    }

    // =========================================================
    // THUMBNAIL — AUTO-GENERATE (from first frame)
    // =========================================================
    async function autoGenerateThumb(media) {
        const btn = $("genThumbBtn");
        const orig = btn ? btn.innerHTML : "";
        if (btn) { btn.disabled = true; btn.innerHTML = "Generating…"; }

        try {
            console.log("🎬 Starting auto-generate for:", media.media_url);

            // 1. Fetch the video
            const res = await fetch(media.media_url);
            if (!res.ok) throw new Error("Video not found on server (" + res.status + ")");
            console.log("✅ Video fetched:", res.status);

            const blob = await res.blob();
            console.log("✅ Blob size:", blob.size, "type:", blob.type);

            if (blob.size === 0) throw new Error("Video file is empty");

            // 2. Extract frame
            const thumbBlob = await extractVideoThumbnail(blob);
            if (!thumbBlob) throw new Error("Could not extract frame — browser may not support this video format");
            console.log("✅ Thumbnail extracted:", thumbBlob.size, "bytes");

            // 3. Upload
            await uploadThumb(media.id, thumbBlob);
        } catch (err) {
            console.error("❌ Auto-generate failed:", err);
            showToast("Auto-generate failed: " + err.message, true);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = orig;
                if (typeof lucide !== "undefined") lucide.createIcons();
            }
        }
    }

    // =========================================================
    // THUMBNAIL — CUSTOM UPLOAD
    // =========================================================
    async function uploadCustomThumb(mediaId, file) {
        try {
            console.log("📤 Uploading custom thumbnail:", file.name, file.size, "bytes");

            if (!file.type.startsWith("image/")) {
                throw new Error("Please select an image file");
            }
            if (file.size > 5 * 1024 * 1024) {
                throw new Error("Image too large (max 5MB)");
            }

            await uploadThumb(mediaId, file);
        } catch (err) {
            console.error("❌ Custom upload failed:", err);
            showToast("Upload failed: " + err.message, true);
        }
    }

    // =========================================================
    // SHARED — Upload thumbnail blob to server
    // =========================================================
    async function uploadThumb(mediaId, blob) {
        const fd = new FormData();
        const ext = blob.type === "image/png" ? "png" : "jpg";
        fd.append("thumbnail", blob, "thumbnail." + ext);

        const token = localStorage.getItem("token");
        const res = await fetch(`/api/media/${mediaId}/thumbnail`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: fd
        });

        console.log("📥 Thumbnail upload status:", res.status);
        const data = await res.json();
        console.log("📥 Thumbnail response:", data);

        if (!data.success) throw new Error(data.message || "Server rejected thumbnail");

        showToast("Thumbnail saved!");
        closePanel();
        loadMedia();
    }

    // =========================================================
    // Extract frame from any video blob
    // =========================================================
    function extractVideoThumbnail(blob) {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(blob);
            const video = document.createElement("video");
            video.preload = "auto";
            video.muted = true;
            video.playsInline = true;
            video.src = url;

            let resolved = false;
            const done = (result) => {
                if (resolved) return;
                resolved = true;
                try { URL.revokeObjectURL(url); } catch (e) {}
                resolve(result);
            };

            // Timeout after 15s
            const timer = setTimeout(() => {
                console.warn("⏱️ Video extraction timed out");
                done(null);
            }, 15000);

            video.onloadeddata = () => {
                console.log("✅ Video metadata loaded, duration:", video.duration);
                // Seek to 1 second or 10% of duration
                const seekTo = Math.min(1, Math.max(0.1, video.duration * 0.1));
                try {
                    video.currentTime = seekTo;
                } catch (e) {
                    console.warn("Seek failed:", e);
                    done(null);
                }
            };

            video.onseeked = () => {
                console.log("✅ Seeked to:", video.currentTime);
                try {
                    const canvas = document.createElement("canvas");
                    const maxDim = 640;
                    let w = video.videoWidth || 320;
                    let h = video.videoHeight || 240;

                    console.log("📐 Video dimensions:", w, "x", h);

                    if (w > h && w > maxDim) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else if (h > maxDim) {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }

                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(video, 0, 0, w, h);

                    canvas.toBlob((thumbBlob) => {
                        clearTimeout(timer);
                        if (thumbBlob) {
                            console.log("✅ Canvas → JPEG:", thumbBlob.size, "bytes");
                            done(thumbBlob);
                        } else {
                            console.warn("Canvas toBlob returned null");
                            done(null);
                        }
                    }, "image/jpeg", 0.85);
                } catch (err) {
                    clearTimeout(timer);
                    console.error("Canvas error:", err);
                    done(null);
                }
            };

            video.onerror = (e) => {
                clearTimeout(timer);
                console.error("❌ Video error:", video.error);
                done(null);
            };

            // Load
            video.load();
        });
    }

    // =========================================================
    // UPLOAD (main media)
    // =========================================================
    uploadBtn?.addEventListener("click", () => fileInput.click());
    dropZone?.addEventListener("click", () => fileInput.click());

    fileInput?.addEventListener("change", function () {
        uploadFiles(this.files);
        this.value = "";
    });

    ["dragenter", "dragover"].forEach(ev => {
        dropZone?.addEventListener(ev, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add("dragging");
        });
    });
    ["dragleave", "drop"].forEach(ev => {
        dropZone?.addEventListener(ev, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove("dragging");
        });
    });
    dropZone?.addEventListener("drop", (e) => {
        uploadFiles(e.dataTransfer.files);
    });

    async function uploadFiles(files) {
        const list = Array.from(files);
        if (!list.length) return;

        for (const file of list) {
            await uploadOne(file);
        }

        loadMedia();
        loadStats();
    }

    async function uploadOne(file) {
        return new Promise(async (resolve) => {
            const row = document.createElement("div");
            row.className = "upload-item";
            row.innerHTML = `
                <div class="row">
                    <div class="fname">${escapeHtml(file.name)}</div>
                    <div class="status uploading">Preparing…</div>
                </div>
                <div class="progress"><div class="bar"></div></div>
            `;
            queue.appendChild(row);

            const fd = new FormData();
            fd.append("file", file);

            // Auto-generate thumbnail for videos on upload
            if (file.type.startsWith("video/")) {
                try {
                    row.querySelector(".status").textContent = "Generating preview…";
                    const thumbBlob = await extractVideoThumbnail(file);
                    if (thumbBlob) {
                        const thumbName = file.name.replace(/\.[^.]+$/, "") + "-thumb.jpg";
                        fd.append("thumbnail", thumbBlob, thumbName);
                        console.log("🎬 Thumbnail appended for", file.name);
                    } else {
                        console.warn("⚠️ Thumbnail extraction returned null for", file.name);
                    }
                } catch (err) {
                    console.warn("Thumbnail extraction failed:", err);
                }
            }

            row.querySelector(".status").textContent = "Uploading…";

            const token = localStorage.getItem("token");
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/media");
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    row.querySelector(".bar").style.width = pct + "%";
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        if (data.success) {
                            row.className = "upload-item complete";
                            const s = row.querySelector(".status");
                            s.className = "status complete";
                            s.textContent = "Complete";
                            row.querySelector(".bar").style.width = "100%";
                        } else {
                            throw new Error(data.message || "Upload failed");
                        }
                    } catch (e) {
                        row.className = "upload-item failed";
                        const s = row.querySelector(".status");
                        s.className = "status failed";
                        s.textContent = "Failed";
                    }
                } else {
                    row.className = "upload-item failed";
                    const s = row.querySelector(".status");
                    s.className = "status failed";
                    s.textContent = "Failed";
                }
                setTimeout(() => row.remove(), 2000);
                resolve();
            };
            xhr.onerror = () => {
                row.className = "upload-item failed";
                const s = row.querySelector(".status");
                s.className = "status failed";
                s.textContent = "Failed";
                setTimeout(() => row.remove(), 2000);
                resolve();
            };

            xhr.send(fd);
        });
    }

    // =========================================================
    // FILTERS / SEARCH / SORT / VIEW
    // =========================================================
    document.querySelectorAll(".chip").forEach(chip => {
        chip.addEventListener("click", () => {
            document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            filter = chip.dataset.filter;
            loadMedia();
        });
    });

    $("searchInput")?.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        const val = this.value;
        debounceTimer = setTimeout(() => {
            search = val;
            loadMedia();
        }, 300);
    });

    $("sortSelect")?.addEventListener("change", function () {
        sort = this.value;
        loadMedia();
    });

    document.querySelectorAll(".view-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            view = btn.dataset.view;
            render();
        });
    });

    // =========================================================
    // HELPERS
    // =========================================================
    function setText(id, val) {
        const el = $(id);
        if (el) el.textContent = val ?? 0;
    }

    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + " " + sizes[i];
    }

    function formatDate(str) {
        if (!str) return "";
        try {
            const d = new Date(str.replace(" ", "T") + (str.includes("Z") ? "" : "Z"));
            return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
        } catch { return str; }
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, s => ({
            "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
        })[s]);
    }

    let toastTimer;
    function showToast(msg, isError = false) {
        if (!toast) return;
        clearTimeout(toastTimer);
        toast.textContent = msg;
        toast.classList.toggle("error", isError);
        toast.classList.add("show");
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
    }

    // =========================================================
    // INIT
    // =========================================================
    loadStats();
    loadMedia();
});