// =========================================================
// CREVIO — NOTIFICATIONS SELECT MODE
// File: dashboard/js/notifications-select.js
// Select button + Select all + bulk delete.
// Also: right-click any item → context menu with "Select"
// Also: double-tap on mobile → same.
// =========================================================
(function () {
    if (window.__crevioNotifSelectInstalled) {
        console.log("[NotifSelect] already installed");
        return;
    }
    window.__crevioNotifSelectInstalled = true;
    console.log("[NotifSelect] installing...");

    let selectionMode = false;
    const selectedIds = new Set();

    // ---------- CSS ----------
    if (!document.getElementById("__nsStyles")) {
        const style = document.createElement("style");
        style.id = "__nsStyles";
        style.textContent = `
            /* ============ TOOLBAR ROW ============ */
            .mark-all-row {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                flex-wrap: nowrap !important;
                gap: 8px !important;
                padding: 12px 14px !important;
                border-bottom: 1px solid var(--border-color, #E2E8F0) !important;
                overflow: visible !important;
                box-sizing: border-box !important;
                width: 100% !important;
            }
            .mark-all-row #nsCountMirror,
            .mark-all-row .count-label {
                white-space: nowrap !important;
                overflow: visible !important;
                text-overflow: clip !important;
                flex: 0 0 auto !important;
                font-size: 13px !important;
                color: var(--text-muted, #94A3B8) !important;
                margin: 0 !important;
            }
            .mark-all-row .ns-wrap {
                display: flex !important;
                flex: 0 0 auto !important;
                align-items: center !important;
                gap: 6px !important;
                flex-wrap: nowrap !important;
                margin-left: auto !important;
                margin-right: 0 !important;
                padding-right: 0 !important;
            }

            /* Hide mark-all-as-read + per-item trash */
            #markAllBtn,
            .mark-all-row .btn-secondary,
            .notif-item .notif-actions,
            .notif-item [data-delete] { display: none !important; }

            /* ============ BUTTONS ============ */
            .ns-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: transparent;
                border: 1px solid var(--border-color, #E2E8F0);
                color: var(--text-secondary, #475569);
                padding: 6px 14px;
                border-radius: 999px;
                font-size: 13px;
                font-weight: 500;
                font-family: inherit;
                cursor: pointer;
                white-space: nowrap;
                flex-shrink: 0;
                transition: background 0.12s, color 0.12s, border-color 0.12s;
            }
            .ns-btn:hover {
                background: var(--accent-dim, rgba(37,99,235,0.1));
                border-color: var(--accent, #2563EB);
                color: var(--accent, #2563EB);
            }
            .ns-btn.active {
                background: var(--accent, #2563EB);
                border-color: var(--accent, #2563EB);
                color: #FFFFFF;
            }
            .ns-btn.danger {
                background: var(--danger, #EF4444);
                border-color: var(--danger, #EF4444);
                color: #FFFFFF;
            }
            .ns-btn.danger:hover { filter: brightness(0.95); }
            .ns-btn .icon { width: 14px; height: 14px; }
            .ns-btn[style*='display: none'] { display: none !important; }


            /* ============ SELECTED ITEMS ============ */
            .notif-item { position: relative; }
            body.ns-mode .notif-item { padding-left: 56px !important; cursor: pointer; }
            .ns-check {
                display: none;
                position: absolute;
                left: 18px; top: 50%;
                transform: translateY(-50%);
                width: 22px; height: 22px;
                border-radius: 50%;
                background: var(--bg-card, #FFFFFF);
                border: 2px solid var(--border-color, #E2E8F0);
                align-items: center; justify-content: center;
                font-size: 11px; font-weight: 700;
                color: transparent;
                z-index: 2;
                pointer-events: none;
                transition: background 0.12s, border-color 0.12s;
            }
            body.ns-mode .notif-item .ns-check { display: flex; }
            .notif-item.ns-selected .ns-check {
                background: var(--accent, #2563EB);
                border-color: var(--accent, #2563EB);
                color: #FFFFFF;
            }
            .notif-item.ns-selected { background: var(--accent-dim, rgba(37,99,235,0.1)); }

            /* ============ CONTEXT MENU ============ */
            .ns-menu {
                position: fixed;
                background: var(--bg-card, #FFFFFF);
                border: 1px solid var(--border-color, #E2E8F0);
                border-radius: 10px;
                box-shadow: 0 12px 32px rgba(0,0,0,0.25);
                padding: 6px;
                z-index: 9000;
                display: none;
                min-width: 180px;
            }
            .ns-menu.open { display: block; }
            .ns-menu button {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 100%;
                padding: 9px 12px;
                background: transparent;
                border: none;
                color: var(--text-secondary, #475569);
                font-size: 13px;
                font-weight: 500;
                font-family: inherit;
                text-align: left;
                cursor: pointer;
                border-radius: 8px;
            }
            .ns-menu button:hover {
                background: var(--accent-dim, rgba(37,99,235,0.1));
                color: var(--accent, #2563EB);
            }
            .ns-menu button .icon { width: 14px; height: 14px; }

            /* mobile handled by nowrap — one row always */
        
        
            /* Narrow screens: shrink buttons so everything fits one line */
            @media (max-width: 520px) {
                .mark-all-row {
                    padding: 10px 10px !important;
                    gap: 4px !important;
                }
                .mark-all-row .ns-wrap {
                    gap: 4px !important;
                }
                .mark-all-row .ns-btn {
                    padding: 5px 8px !important;
                    font-size: 11px !important;
                    gap: 3px !important;
                    border-radius: 8px !important;
                }
                .mark-all-row .ns-btn .icon {
                    display: none !important;
                }
                .mark-all-row #nsCountMirror,
                .mark-all-row .count-label {
                    font-size: 11.5px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ---------- Helpers ----------
    function authHeaders() {
        const token = localStorage.getItem("token");
        return {
            "Content-Type": "application/json",
            "Authorization": token ? "Bearer " + token : ""
        };
    }

    function toast(msg, isErr) {
        if (typeof window.showToast === "function") {
            window.showToast(msg, isErr);
            return;
        }
        const t = document.getElementById("toast");
        if (!t) { console.log(msg); return; }
        t.textContent = msg;
        t.classList.toggle("error", !!isErr);
        t.classList.add("show");
        clearTimeout(t.__tm);
        t.__tm = setTimeout(function () { t.classList.remove("show"); }, 2400);
    }

    // ---------- Find the toolbar ----------
    function findToolbar() {
        // Try several selectors (in priority order)
        return document.querySelector(".mark-all-row")
            || document.querySelector(".filter-bar")
            || document.querySelector(".list-header");
    }

    function getItems() {
        return document.querySelectorAll(".notif-item");
    }

    // ---------- Build the select button ----------
    function ensureButtons() {
        const bar = findToolbar();
        if (!bar) {
            console.log("[NotifSelect] toolbar not found yet");
            return null;
        }
        let wrap = document.querySelector(".ns-wrap");
        if (wrap) return wrap;

        // Make sure the toolbar can host the button
        if (getComputedStyle(bar).position === "static") bar.style.position = "relative";
        if (bar.style.display === "" || bar.style.display === "block") {
            // ensure it's flex or has position context
            bar.style.display = bar.style.display || "";
        }

        wrap = document.createElement("div");
        wrap.className = "ns-wrap";
        wrap.style.cssText = "display:flex; gap:8px; align-items:center; margin-left:auto;";

        const selectBtn = document.createElement("button");
        selectBtn.type = "button";
        selectBtn.className = "ns-btn";
        selectBtn.id = "nsSelectBtn";
        selectBtn.innerHTML = '<span>Select</span>';
        selectBtn.addEventListener("click", onSelectBtnClick);

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "ns-btn danger";
        deleteBtn.id = "nsDeleteBtn";
        deleteBtn.style.display = "none";
        deleteBtn.innerHTML = '<i data-lucide="trash-2" class="icon"></i><span id="nsDeleteLabel">Delete</span>';
        deleteBtn.addEventListener("click", onDeleteClick);

        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "ns-btn";
        cancelBtn.id = "nsCancelBtn";
        cancelBtn.style.display = "none";
        cancelBtn.textContent = "Cancel";
        cancelBtn.addEventListener("click", exitSelectionMode);

        wrap.appendChild(selectBtn);
        wrap.appendChild(deleteBtn);
        wrap.appendChild(cancelBtn);

        // Append to the list-header (that's where the title lives) — position absolute top right
        bar.appendChild(wrap);

        console.log("[NotifSelect] buttons added to", bar.className);

        if (typeof lucide !== "undefined") {
            try { lucide.createIcons(); } catch (e) {}
        }
        return wrap;
    }

    // ---------- Selection mode ----------
    function enterSelectionMode() {
        selectionMode = true;
        document.body.classList.add("ns-mode");
        selectedIds.clear();

        const sel = document.getElementById("nsSelectBtn");
        const del = document.getElementById("nsDeleteBtn");
        const can = document.getElementById("nsCancelBtn");
        if (sel) {
            sel.classList.add("active");
            sel.innerHTML = '<i data-lucide="check-square" class="icon"></i><span>Select all</span>';
        }
        if (del) del.style.display = "none";
        if (can) can.style.display = "";

        getItems().forEach(injectCheckbox);
        updateCount();
        if (typeof lucide !== "undefined") {
            try { lucide.createIcons(); } catch (e) {}
        }
    }

    function exitSelectionMode() {
        selectionMode = false;
        selectedIds.clear();
        document.body.classList.remove("ns-mode");

        const sel = document.getElementById("nsSelectBtn");
        const del = document.getElementById("nsDeleteBtn");
        const can = document.getElementById("nsCancelBtn");
        if (sel) {
            sel.classList.remove("active");
            sel.innerHTML = '<span>Select</span>';
        }
        if (del) del.style.display = "none";
        if (can) can.style.display = "none";

        getItems().forEach(function (item) {
            item.classList.remove("ns-selected");
            const c = item.querySelector(".ns-check");
            if (c) c.remove();
        });
        if (typeof lucide !== "undefined") {
            try { lucide.createIcons(); } catch (e) {}
        }
    }

    function toggleItem(item) {
        const id = item.dataset.id;
        if (!id) return;
        if (selectedIds.has(id)) {
            selectedIds.delete(id);
            item.classList.remove("ns-selected");
        } else {
            selectedIds.add(id);
            item.classList.add("ns-selected");
        }
        updateCount();
    }

    function selectAllVisible() {
        getItems().forEach(function (item) {
            const id = item.dataset.id;
            if (!id) return;
            if (!selectedIds.has(id)) {
                selectedIds.add(id);
                item.classList.add("ns-selected");
            }
        });
        updateCount();
    }

    function updateCount() {
        const n = selectedIds.size;
        const del = document.getElementById("nsDeleteBtn");
        const label = document.getElementById("nsDeleteLabel");
        if (label) label.textContent = n > 0 ? ("Delete (" + n + ")") : "Delete";
        if (del) del.style.display = n > 0 ? "" : "none";
    }

    // ---------- Checkbox injection ----------
    function injectCheckbox(item) {
        if (item.querySelector(".ns-check")) return;
        const check = document.createElement("span");
        check.className = "ns-check";
        item.insertBefore(check, item.firstChild);
    }

    // ---------- Click handling on items ----------
    function attachItemHandlers() {
        getItems().forEach(function (item) {
            if (item.dataset.nsBound === "1") return;
            item.dataset.nsBound = "1";

            // Click toggle (only in selection mode)
            // click handled by capture listener above

            // Right-click context menu
            item.addEventListener("contextmenu", function (e) {
                e.preventDefault();
                openContextMenu(e.clientX, e.clientY, item);
            });

            // Double-tap (mobile) → context menu
            let lastTap = 0;
            item.addEventListener("touchend", function (e) {
                const now = Date.now();
                if (now - lastTap < 300) {
                    e.preventDefault();
                    const touch = e.changedTouches[0];
                    openContextMenu(touch.clientX, touch.clientY, item);
                    lastTap = 0;
                } else {
                    lastTap = now;
                }
            }, { passive: false });
        });
    }

    // ---------- Context menu ----------
    let contextItem = null;
    function ensureContextMenu() {
        let menu = document.getElementById("nsMenu");
        if (menu) return menu;
        menu = document.createElement("div");
        menu.id = "nsMenu";
        menu.className = "ns-menu";
        menu.innerHTML = [
            '<button data-act="select" type="button"><i data-lucide="check-square" class="icon"></i> Select</button>',
            '<button data-act="delete" type="button"><i data-lucide="trash-2" class="icon"></i> Delete</button>',
            '<button data-act="markread" type="button"><i data-lucide="check" class="icon"></i> Mark as read</button>'
        ].join("");
        document.body.appendChild(menu);
        menu.addEventListener("click", onContextMenuAction);
        if (typeof lucide !== "undefined") {
            try { lucide.createIcons(); } catch (e) {}
        }
        return menu;
    }

    function openContextMenu(x, y, item) {
        const menu = ensureContextMenu();
        contextItem = item;
        menu.style.left = Math.min(x, window.innerWidth - 200) + "px";
        menu.style.top = Math.min(y, window.innerHeight - 160) + "px";
        menu.classList.add("open");

        // Dismiss on next click anywhere
        setTimeout(function () {
            document.addEventListener("click", closeContextMenuOnce, { once: true });
        }, 0);
    }

    function closeContextMenuOnce() {
        const menu = document.getElementById("nsMenu");
        if (menu) menu.classList.remove("open");
        contextItem = null;
    }

    async function onContextMenuAction(e) {
        const btn = e.target.closest("button[data-act]");
        if (!btn || !contextItem) return;
        const act = btn.dataset.act;
        const item = contextItem;
        const id = item.dataset.id;
        const menu = document.getElementById("nsMenu");
        if (menu) menu.classList.remove("open");

        if (act === "select") {
            if (!selectionMode) enterSelectionMode();
            if (id) {
                selectedIds.add(id);
                item.classList.add("ns-selected");
                updateCount();
            }
        } else if (act === "delete") {
            if (!id) return;
            if (!confirm("Delete this notification?")) return;
            try {
                const res = await fetch("/api/notifications/" + id, {
                    method: "DELETE",
                    headers: authHeaders()
                });
                const data = await res.json();
                if (data && data.success) {
                    item.remove();
                    toast("Deleted");
                } else {
                    toast((data && data.message) || "Could not delete", true);
                }
            } catch (err) {
                toast("Could not delete", true);
            }
        } else if (act === "markread") {
            if (!id) return;
            try {
                await fetch("/api/notifications/" + id + "/read", {
                    method: "PATCH",
                    headers: authHeaders()
                });
                item.classList.remove("unread");
                const dot = item.querySelector(".notif-dot");
                if (dot) dot.remove();
                toast("Marked as read");
            } catch (err) {
                toast("Could not mark read", true);
            }
        }
    }

    // ---------- Button handlers ----------
    function onSelectBtnClick() {
        if (!selectionMode) {
            enterSelectionMode();
            return;
        }
        selectAllVisible();
    }

    async function onDeleteClick() {
        if (selectedIds.size === 0) return;
        if (!confirm("Delete " + selectedIds.size + " notification(s)?")) return;

        const ids = Array.from(selectedIds);
        try {
            const res = await fetch("/api/notifications/bulk", {
                method: "DELETE",
                headers: authHeaders(),
                body: JSON.stringify({ ids: ids })
            });
            const data = await res.json();
            if (data && data.success) {
                toast("Deleted " + data.deleted + " notification(s)");
                ids.forEach(function (id) {
                    const el = document.querySelector('.notif-item[data-id="' + id + '"]');
                    if (el) el.remove();
                });
                exitSelectionMode();
            } else {
                toast((data && data.message) || "Could not delete", true);
            }
        } catch (e) {
            toast("Could not delete", true);
        }
    }

    // ---------- Mirror the "N notifications" count into our row ----------
    function moveCount() {
        const original = document.getElementById("totalLabel");
        const row = document.querySelector(".mark-all-row");
        if (!original || !row) return;

        // Hide the original
        original.style.display = "none";

        // Create / reuse our mirror
        let mirror = document.getElementById("nsCountMirror");
        if (!mirror) {
            mirror = document.createElement("span");
            mirror.id = "nsCountMirror";
            mirror.className = "count-label";
            mirror.style.cssText = "font-size:13px;color:var(--text-muted,#94A3B8);margin:0;margin-right:auto;";
            row.insertBefore(mirror, row.firstChild);
            console.log("[NotifSelect] count mirror inserted");
        }

        // Sync text
        const text = (original.textContent || "").trim();
        if (mirror.textContent !== text) mirror.textContent = text;
    }

    // ---------- Scan + install ----------
    function scan() {
        ensureButtons();
        attachItemHandlers();
    }

    if (window.MutationObserver) {
        let t;
        new MutationObserver(function () {
            clearTimeout(t);
            t = setTimeout(scan, 200);
        }).observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener("load", function () { setTimeout(scan, 400); });
    if (document.readyState === "complete") setTimeout(scan, 200);
    else document.addEventListener("DOMContentLoaded", function () { setTimeout(scan, 200); });

    // ---------- Keep mirror in sync if notifications.js re-renders ----------
    (function startMirrorSync() {
        const tryHook = setInterval(function () {
            const orig = document.getElementById("totalLabel");
            if (orig) {
                clearInterval(tryHook);
                const obs = new MutationObserver(function () {
                    setTimeout(moveCount, 50);
                });
                obs.observe(orig, { childList: true, characterData: true, subtree: true });
                console.log("[NotifSelect] mirror sync armed");
            }
        }, 500);
        // Stop trying after 10s
        setTimeout(function () { clearInterval(tryHook); }, 10000);
    })();

        console.log("[NotifSelect] installed");

    // =========================================================
    // SELECTION MODE CLICK INTERCEPT
    // Capture-phase listener — fires BEFORE notifications.js
    // so clicking an item in select mode does NOT open it.
    // =========================================================
    document.addEventListener("click", function (e) {
        if (!selectionMode) return;
        const item = e.target.closest && e.target.closest(".notif-item");
        if (!item) return;
        if (e.target.closest("[data-delete]")) return;
        if (e.target.closest(".icon-btn")) return;
        if (e.target.closest(".ns-check")) {
            e.stopPropagation();
            e.preventDefault();
            toggleItem(item);
            return;
        }
        // Anywhere else on the item — swallow so notifications.js doesn't open it
        e.stopPropagation();
        e.preventDefault();
        toggleItem(item);
    }, true);  // capture phase

    // =========================================================
    // SELF-HEALING LAYOUT — guarantees count + buttons stay right
    // Runs every 500ms. Cheap. Survives notifications.js re-renders.
    // =========================================================
    (function __nsSelfHeal() {
        function fix() {
            // 1. Count on the left of the row
            const orig = document.getElementById("totalLabel");
            const row  = document.querySelector(".mark-all-row");
            if (orig && row) {
                if (orig.style.display !== "none") orig.style.display = "none";
                let mirror = document.getElementById("nsCountMirror");
                if (!mirror || !mirror.parentNode) {
                    if (mirror) mirror.remove();
                    mirror = document.createElement("span");
                    mirror.id = "nsCountMirror";
                    mirror.style.cssText = "font-size:13px;color:#94A3B8;margin-right:auto;font-weight:500;";
                    row.insertBefore(mirror, row.firstChild);
                }
                const txt = (orig.textContent || "").trim();
                if (mirror.textContent !== txt) mirror.textContent = txt;
            }

            // 2. Hide the "Mark all as read" button
            const markBtn = document.getElementById("markAllBtn");
            if (markBtn && markBtn.style.display !== "none") markBtn.style.display = "none";

            // 3. Hide the per-item trash icons
            document.querySelectorAll(".notif-item .notif-actions, .notif-item [data-delete]").forEach(function (el) {
                if (el.style.display !== "none") el.style.display = "none";
            });

            // 4. Make sure our ns-wrap pushes right
            const wrap = document.querySelector(".mark-all-row .ns-wrap");
            if (wrap && wrap.style.marginLeft !== "auto") wrap.style.marginLeft = "auto";
        }
        fix();
        setInterval(fix, 500);
    })();

})();