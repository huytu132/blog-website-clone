// ── Theme Manager ─────────────────────────────────────────────
(function () {
    const THEME_KEY = "quiz_theme";
    const root = document.documentElement;

    // Apply saved theme immediately (before render) to avoid flash
    const saved = localStorage.getItem(THEME_KEY) || "dark";
    root.setAttribute("data-theme", saved);

    window.toggleTheme = function () {
        const current = root.getAttribute("data-theme") || "dark";
        const next = current === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        localStorage.setItem(THEME_KEY, next);
        updateToggleBtns(next);
    };

    window.updateToggleBtns = function (theme) {
        document.querySelectorAll(".theme-toggle").forEach(btn => {
            btn.textContent = theme === "dark" ? "☀️" : "🌙";
            btn.title = theme === "dark" ? "Chuyển sang Light mode" : "Chuyển sang Dark mode";
        });
    };

    // Run after DOM is ready
    document.addEventListener("DOMContentLoaded", () => {
        updateToggleBtns(root.getAttribute("data-theme") || "dark");
    });
})();
