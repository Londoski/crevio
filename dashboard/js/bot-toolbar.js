// =========================================================
// CREVIO BOT TOOLBAR
// File: dashboard/js/bot-toolbar.js
// =========================================================
(function () {
    if (window.__crevioBotToolbarInstalled) return;
    window.__crevioBotToolbarInstalled = true;
    console.log("[Bot Toolbar] v4 loaded");

    function api(path, opts) {
        if (window.apiFetch) return window.apiFetch(path, opts);
        var token = localStorage.getItem("token");
        return fetch(path, Object.assign({
            headers: {
                "Content-Type": "application/json",
                "Authorization": token ? "Bearer " + token : ""
            }
        }, opts || {}));
    }

    function toast(msg, isErr) {
        var t = document.getElementById("toast");
        if (!t) { console.log("[Bot Toolbar] toast:", msg); return; }
        t.textContent = msg;
        t.classList.toggle("error", !!isErr);
        t.classList.add("show");
        clearTimeout(t.__tm);
        t.__tm = setTimeout(function () { t.classList.remove("show"); }, 2600);
    }

    function refreshIcons() {
        if (typeof lucide !== "undefined") {
            try { lucide.createIcons(); } catch (e) {}
        }
    }

    function getBubbleText(bubble) {
        var body = bubble.querySelector(".msg-body") || bubble;
        var clone = body.cloneNode(true);
        clone.querySelectorAll(".msg-time, .msg-toolbar, .msg-check, .msg-expand-btn").forEach(function (el) { el.remove(); });
        return (clone.innerText || clone.textContent || "").trim();
    }

    function buildToolbar() {
        var el = document.createElement("div");
        el.className = "msg-toolbar";
        el.innerHTML =
            '<button class="msg-tool" data-act="copy" aria-label="Copy"><i data-lucide="copy"></i><span class="tool-tip">Copy</span></button>' +
            '<button class="msg-tool" data-act="rate" aria-label="Rate"><i data-lucide="thumbs-up"></i><span class="tool-tip">Rate</span></button>' +
            '<button class="msg-tool" data-act="share" aria-label="Share"><i data-lucide="share-2"></i><span class="tool-tip">Share</span></button>' +
            '<button class="msg-tool" data-act="regen" aria-label="Regenerate"><i data-lucide="refresh-cw"></i><span class="tool-tip">Regenerate</span></button>' +
            '<button class="msg-tool" data-act="more" aria-label="More"><i data-lucide="more-horizontal"></i><span class="tool-tip">More</span></button>';
        return el;
    }

       function ensureToolbars() {
        document.querySelectorAll(".msg-bubble.bot").forEach(function (bubble) {
            var wrap = bubble.closest(".message");
            if (!wrap) return;
            if (wrap.querySelector(".msg-toolbar")) return;
            var body = bubble.querySelector(".msg-body");
            if (!body || !body.textContent.trim()) return;
            if (bubble.querySelector(".typing")) return;
            wrap.appendChild(buildToolbar());
        });
        refreshIcons();
    }
    function closeAllPopovers() {
        document.querySelectorAll(".rate-popover").forEach(function (p) { p.remove(); });
    }

    function buildPopover(html) {
        var pop = document.createElement("div");
        pop.className = "rate-popover";
        pop.style.cssText = "position:fixed;background:#1E293B;border:1px solid #334155;border-radius:10px;padding:4px;min-width:200px;box-shadow:0 14px 36px rgba(0,0,0,0.6);z-index:999999;display:flex;flex-direction:column;gap:2px;";
        pop.innerHTML = html;
        return pop;
    }

    function styleOption(b, danger) {
        b.style.cssText = "display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border-radius:7px;border:none;background:transparent;color:#F1F5F9;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;text-align:left;";
        b.addEventListener("mouseenter", function () {
            b.style.background = danger ? "rgba(239,68,68,0.18)" : "rgba(37,99,235,0.18)";
            b.style.color = danger ? "#EF4444" : "#2563EB";
        });
        b.addEventListener("mouseleave", function () {
            b.style.background = "transparent";
            b.style.color = "#F1F5F9";
        });
    }

    function positionPopover(pop, btn) {
        var r = btn.getBoundingClientRect();
        var w = 200;
        var h = pop.offsetHeight || 90;
        var left = Math.min(r.left, window.innerWidth - w - 12);
        if (left < 12) left = 12;
        var top = (r.top - h - 10 > 10) ? (r.top - h - 10) : (r.bottom + 10);
        pop.style.left = left + "px";
        pop.style.top = top + "px";
    }

       function openRatePopover(btn) {
        console.log("[Bot Toolbar] openRatePopover firing");
        closeAllPopovers();

        var pop = document.createElement("div");
        pop.className = "rate-popover";
        pop.setAttribute("data-crevio-popover", "1");

        // Hard-set every property with !important via cssText
        pop.style.cssText =
            "position:fixed !important;" +
            "background:#1E293B !important;" +
            "color:#F1F5F9 !important;" +
            "border:1px solid #334155 !important;" +
            "border-radius:10px !important;" +
            "padding:6px !important;" +
            "min-width:220px !important;" +
            "box-shadow:0 20px 48px rgba(0,0,0,0.7) !important;" +
            "z-index:2147483647 !important;" +
            "display:flex !important;" +
            "flex-direction:column !important;" +
            "gap:2px !important;" +
            "opacity:1 !important;" +
            "visibility:visible !important;" +
            "pointer-events:auto !important;";

        pop.innerHTML =
            '<button type="button" data-r="good" style="display:flex !important;align-items:center !important;gap:10px !important;width:100% !important;padding:11px 14px !important;border-radius:7px !important;border:none !important;background:transparent !important;color:#F1F5F9 !important;font-size:13.5px !important;font-weight:600 !important;font-family:inherit !important;cursor:pointer !important;text-align:left !important;">' +
                '<i data-lucide="thumbs-up" style="width:15px !important;height:15px !important;"></i> Good response' +
            '</button>' +
            '<button type="button" data-r="bad" style="display:flex !important;align-items:center !important;gap:10px !important;width:100% !important;padding:11px 14px !important;border-radius:7px !important;border:none !important;background:transparent !important;color:#F1F5F9 !important;font-size:13.5px !important;font-weight:600 !important;font-family:inherit !important;cursor:pointer !important;text-align:left !important;">' +
                '<i data-lucide="thumbs-down" style="width:15px !important;height:15px !important;"></i> Bad response' +
            '</button>';

        document.body.appendChild(pop);
        console.log("[Bot Toolbar] appended, body children:", document.body.children.length);

        // Position with fail-safes: if anything goes wrong, place at a safe fallback
        try {
            var r = btn.getBoundingClientRect();
            var ph = pop.getBoundingClientRect().height || 100;
            var pw = pop.getBoundingClientRect().width || 220;

            var left = r.left;
            if (left + pw > window.innerWidth - 12) left = window.innerWidth - pw - 12;
            if (left < 12) left = 12;

            var top;
            if (r.top - ph - 12 > 12) {
                top = r.top - ph - 12;
            } else if (r.bottom + ph + 12 < window.innerHeight - 12) {
                top = r.bottom + 12;
            } else {
                // Fallback: center of viewport
                top = Math.max(12, (window.innerHeight - ph) / 2);
                left = Math.max(12, (window.innerWidth - pw) / 2);
            }

            pop.style.setProperty("left", left + "px", "important");
            pop.style.setProperty("top", top + "px", "important");
            console.log("[Bot Toolbar] positioned at", left, top, "size", pw, "x", ph);
        } catch (err) {
            console.warn("[Bot Toolbar] position error, using fallback:", err);
            pop.style.setProperty("left", "50%", "important");
            pop.style.setProperty("top", "50%", "important");
            pop.style.setProperty("transform", "translate(-50%, -50%)", "important");
        }

        refreshIcons();

        // Hover + click on each option
        pop.querySelectorAll("button").forEach(function (b) {
            b.addEventListener("mouseenter", function () {
                b.style.setProperty("background", b.dataset.r === "good" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)", "important");
                b.style.setProperty("color", b.dataset.r === "good" ? "#22C55E" : "#EF4444", "important");
            });
            b.addEventListener("mouseleave", function () {
                b.style.setProperty("background", "transparent", "important");
                b.style.setProperty("color", "#F1F5F9", "important");
            });
            b.addEventListener("click", function (e) {
                e.stopPropagation();
                e.preventDefault();
                console.log("[Bot Toolbar] rated:", b.dataset.r);
                toast(b.dataset.r === "good" ? "Thanks for the feedback" : "Noted — we'll improve");
                pop.remove();
            }, true);
        });

        // Outside-click close — registered later via setTimeout so this click doesn't close it
        setTimeout(function () {
            var closeHandler = function (ev) {
                if (!pop.contains(ev.target) && ev.target !== btn && !btn.contains(ev.target)) {
                    pop.remove();
                    document.removeEventListener("click", closeHandler, true);
                }
            };
            document.addEventListener("click", closeHandler, true);
        }, 200);

        // Safety: auto-close if it somehow gets orphaned
        setTimeout(function () {
            if (pop && !document.body.contains(pop)) return;
        }, 100);
    }

    function openMorePopover(btn, wrap) {
        closeAllPopovers();
        var pop = buildPopover('<button data-a="delete"><i data-lucide="trash-2" style="width:15px;height:15px;"></i> Delete message</button>');
        document.body.appendChild(pop);
        positionPopover(pop, btn);
        refreshIcons();
        var del = pop.querySelector('[data-a="delete"]');
        styleOption(del, true);
        del.addEventListener("click", function (e) {
            e.stopPropagation(); e.preventDefault();
            pop.remove();
            var msgId = wrap.dataset.messageId;
            var convId = window.__activeConvId;
            if (!msgId || !convId) { wrap.remove(); return; }
            api("/api/bot/conversations/" + convId + "/messages/" + msgId, { method: "DELETE" })
                .then(function (r) { return r.json(); })
                .then(function (d) {
                    if (!d.success) throw new Error(d.message || "Failed");
                    wrap.remove();
                    toast("Message deleted");
                })
                .catch(function () { toast("Could not delete", true); });
        });
        setTimeout(function () {
            document.addEventListener("click", function onDoc(ev) {
                if (!pop.contains(ev.target) && !btn.contains(ev.target)) {
                    pop.remove();
                    document.removeEventListener("click", onDoc);
                }
            }, true);
        }, 100);
    }

    function fallbackCopy(text) {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0;";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
    }

    function doCopy(bubble, btn) {
        var text = getBubbleText(bubble);
        var done = function () {
            var tip = btn.querySelector(".tool-tip");
            var icon = btn.querySelector("i, svg");
            var old = tip ? tip.textContent : "";
            if (tip) tip.textContent = "Copied";
            if (icon) icon.outerHTML = '<i data-lucide="check"></i>';
            refreshIcons();
            setTimeout(function () {
                if (tip) tip.textContent = old || "Copy";
                var ic2 = btn.querySelector("i, svg");
                if (ic2) ic2.outerHTML = '<i data-lucide="copy"></i>';
                refreshIcons();
            }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
        } else { fallbackCopy(text); done(); }
    }

    function doShare(bubble) {
        var text = getBubbleText(bubble);
        if (navigator.share) {
            navigator.share({ text: text }).catch(function () { fallbackCopy(text); toast("Copied to clipboard"); });
        } else { fallbackCopy(text); toast("Copied to clipboard"); }
    }

        function doRegen(wrap, btn) {
        var convId = window.__activeConvId;
        if (!convId) {
            var active = document.querySelector(".bot-conv-item.active");
            if (active) convId = active.dataset.id;
        }
        if (!convId) { toast("No active conversation", true); return; }
        btn.disabled = true;
        api("/api/bot/regenerate", {
            method: "POST",
            body: JSON.stringify({ conversation_id: parseInt(convId, 10) })
        })
            .then(function (r) { return r.json(); })
            .then(function (d) {
                if (!d.success) throw new Error(d.message || "Failed");
                wrap.remove();
                if (typeof window.__botResend === "function") window.__botResend(d.prompt);
                else location.reload();

                // Poll for the new reply for 20 seconds, re-injecting the toolbar
                // as soon as the streaming completes.
                var elapsed = 0;
                var timer = setInterval(function () {
                    elapsed += 400;
                    if (typeof window.__ensureToolbars === "function") window.__ensureToolbars();
                    if (elapsed >= 20000) clearInterval(timer);
                }, 400);
            })
            .catch(function (e) {
                toast("Could not regenerate: " + e.message, true);
                btn.disabled = false;
            });
    }
    document.addEventListener("click", function (e) {
        var btn = e.target.closest(".msg-tool");
        if (!btn) return;
        var wrap = btn.closest(".message");
        var bubble = wrap ? wrap.querySelector(".msg-bubble.bot") : null;
        if (!bubble) return;
        var act = btn.dataset.act;
        if (act === "copy")  { e.stopPropagation(); doCopy(bubble, btn); }
        else if (act === "rate")  { e.stopPropagation(); openRatePopover(btn); }
        else if (act === "share") { e.stopPropagation(); doShare(bubble); }
        else if (act === "regen") { e.stopPropagation(); doRegen(wrap, btn); }
        else if (act === "more")  { e.stopPropagation(); openMorePopover(btn, wrap); }
    }, true);

    var container = document.getElementById("messages");
    if (container && window.MutationObserver) {
        var t;
        new MutationObserver(function () {
            clearTimeout(t);
            t = setTimeout(ensureToolbars, 250);
        }).observe(container, { childList: true, subtree: true, characterData: true });
    }
       // Expose for external triggers (regenerate, manual refresh, etc.)
    window.__ensureToolbars = ensureToolbars;

    window.addEventListener("load", function () { setTimeout(ensureToolbars, 500); });
    setTimeout(ensureToolbars, 1200);
})();