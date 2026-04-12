// ── Config ────────────────────────────────────────────────────
const ALL_DATASETS = [
    { file: "questions.json", label: "📋 Tổng hợp (TM + CT + HCKT)" },
    { file: "congtacthammuu.json", label: "📌 Công tác Tham mưu" },
    { file: "chinhtri.json", label: "🏛 Chính trị" },
    { file: "hckt.json", label: "🔧 Hậu cần Kỹ thuật" },
    { file: "taichinh.json", label: "💰 Tài chính" },
    { file: "canbodoangioi.json", label: "🎓 Cán bộ Đoàn Giỏi" },
    { file: "canbodoangioi2.json", label: "🎓 Cán bộ Đoàn Giỏi 2026"}
];

const OPTION_LABELS = ["A", "B", "C", "D", "E"];
const LAST_TAB_KEY = "quiz_last_tab";

// ── State ─────────────────────────────────────────────────────
let datasets = {};      // { filename: data }
let loadedCount = 0;
let currentTab = localStorage.getItem(LAST_TAB_KEY) || ALL_DATASETS[0].file;

// Practice mode state
let practiceSection = null;
let practiceIndex = 0;
let practiceOptions = [];   // shuffled options for current question

// ── Load all datasets ─────────────────────────────────────────
ALL_DATASETS.forEach(ds => {
    fetch(ds.file)
        .then(r => r.json())
        .then(data => {
            datasets[ds.file] = data;
        })
        .catch(err => console.warn(`⚠ Không tải được ${ds.file}:`, err))
        .finally(() => {
            loadedCount++;
            if (loadedCount === ALL_DATASETS.length) onAllLoaded();
        });
});

function onAllLoaded() {
    buildNavTabs();
    switchTab(currentTab);
    initSnowflakes();
}

// ── Build sidebar nav tabs ────────────────────────────────────
function buildNavTabs() {
    const navList = document.getElementById("nav-list");
    navList.innerHTML = ALL_DATASETS.map(ds => `
        <button class="nav-tab" id="tab-${ds.file}"
                onclick="switchTab('${ds.file}')">
            ${ds.label}
        </button>
    `).join("");
}

// ── Switch tab ────────────────────────────────────────────────
function switchTab(tabId) {
    currentTab = tabId;
    localStorage.setItem(LAST_TAB_KEY, tabId);

    // Update active tab style
    document.querySelectorAll(".nav-tab").forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.getElementById(`tab-${tabId}`);
    if (activeBtn) activeBtn.classList.add("active");

    // Hide all panels
    document.getElementById("dataset-panel").classList.add("hidden");
    document.getElementById("quiz-panel").classList.add("hidden");
    document.getElementById("history-panel").classList.add("hidden");

    if (tabId === "history") {
        renderHistory();
        document.getElementById("history-panel").classList.remove("hidden");
    } else {
        renderDataset(tabId);
        document.getElementById("dataset-panel").classList.remove("hidden");
    }

    closeMobileNav();
}

// ── Render dataset panel ──────────────────────────────────────
function renderDataset(file) {
    const panel = document.getElementById("dataset-panel");
    const data = datasets[file];

    if (!data) {
        panel.innerHTML = `<p style="color:#f87171">❌ Không tải được dữ liệu</p>`;
        return;
    }

    const ds = ALL_DATASETS.find(d => d.file === file);
    const totalQ = data.sections.flatMap(s => s.questions).length;

    panel.innerHTML = `
        <h1>${data.title || ds.label}</h1>
        <p class="ds-desc">${data.description || `${totalQ} câu hỏi`}</p>

        <div class="section-group">
            <h3>📖 Luyện tập theo phần</h3>
            <div class="section-buttons">
                ${data.sections.map(sec => `
                    <button class="btn btn-section" onclick="startPracticeSection('${file}','${sec.id}')">
                        ${sec.title}
                        <small style="opacity:0.7;font-size:11px;margin-left:4px">${sec.questions.length} câu</small>
                    </button>
                `).join("")}
                <button class="btn btn-section" onclick="startPracticeAll('${file}')">
                    📝 Luyện tất cả (${totalQ} câu)
                </button>
            </div>
        </div>

        <div class="section-group">
            <h3>🎯 Kiểm tra</h3>
            <div class="exam-card">
                <div class="exam-card-info">
                    <strong>Thi ngẫu nhiên 40 câu</strong>
                    <p>Trộn thứ tự câu hỏi và đáp án · Đếm giờ 60 phút</p>
                </div>
                <a href="exam.html?dataset=${encodeURIComponent(file)}" class="btn btn-primary">
                    🎯 Bắt đầu thi
                </a>
            </div>
        </div>
    `;
}

// ── Practice mode ─────────────────────────────────────────────
function startPracticeSection(file, sectionId) {
    const data = datasets[file];
    if (!data) return;
    const section = data.sections.find(s => s.id === sectionId);
    if (!section) return;

    practiceSection = {
        title: section.title,
        questions: shuffle([...section.questions])
    };
    practiceIndex = 0;
    openPracticePanel();
}

function startPracticeAll(file) {
    const data = datasets[file];
    if (!data) return;
    practiceSection = {
        title: `Tất cả - ${data.title}`,
        questions: shuffle(data.sections.flatMap(s => s.questions))
    };
    practiceIndex = 0;
    openPracticePanel();
}

function openPracticePanel() {
    document.getElementById("dataset-panel").classList.add("hidden");
    document.getElementById("history-panel").classList.add("hidden");

    const panel = document.getElementById("quiz-panel");
    panel.classList.remove("hidden");
    document.getElementById("quiz-section-title").textContent = practiceSection.title;

    showPracticeQuestion();
}

function exitPractice() {
    document.getElementById("quiz-panel").classList.add("hidden");
    renderDataset(currentTab);
    document.getElementById("dataset-panel").classList.remove("hidden");
}

function showPracticeQuestion() {
    const q = practiceSection.questions[practiceIndex];
    const total = practiceSection.questions.length;

    // Build shuffled options
    practiceOptions = q.options.map((opt, i) => ({ text: opt, isCorrect: i === q.correct }));
    shuffle(practiceOptions);

    const optHtml = practiceOptions.map((opt, i) => `
        <div class="option" id="opt${i}" onclick="checkPractice(${i})">
            <span class="opt-label">${OPTION_LABELS[i] || i + 1}</span>
            <span class="opt-text">${opt.text}</span>
        </div>
    `).join("");

    document.getElementById("quiz-body").innerHTML = `
        <div class="practice-card">
            <p>
                <b>Câu ${practiceIndex + 1}/${total}</b> —
                ${q.question}
            </p>
            ${optHtml}
            <div id="practice-nav"></div>
        </div>
    `;
}

function checkPractice(choice) {
    const opts = document.querySelectorAll(".option");
    opts.forEach((el, i) => {
        if (practiceOptions[i].isCorrect) el.classList.add("correct");
        if (i === choice && !practiceOptions[i].isCorrect) el.classList.add("wrong");
        el.style.pointerEvents = "none";
    });

    const total = practiceSection.questions.length;
    const nav = document.getElementById("practice-nav");
    nav.innerHTML = `
        <div id="practice-nav" style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
            <button class="btn btn-back" onclick="showPracticeQuestion()">↩ Làm lại</button>
            ${practiceIndex > 0
            ? `<button class="btn btn-back" onclick="practiceIndex--;showPracticeQuestion()">← Câu trước</button>`
            : ""}
            ${practiceIndex < total - 1
            ? `<button class="btn btn-primary" onclick="practiceIndex++;showPracticeQuestion()">Câu tiếp →</button>`
            : `<button class="btn btn-danger-soft" onclick="exitPractice()">✅ Kết thúc</button>`}
        </div>
    `;
}

// ── History ───────────────────────────────────────────────────
function renderHistory() {
    const history = JSON.parse(localStorage.getItem("quizHistory") || "[]");
    const panel = document.getElementById("history-list");

    if (history.length === 0) {
        panel.innerHTML = `<p style="color:rgba(199,210,254,0.5)">Chưa có lịch sử thi.</p>`;
        return;
    }

    panel.innerHTML = history.map(h => {
        const badgeCls = h.pct >= 80 ? "badge-good" : h.pct >= 65 ? "badge-ok" : "badge-fail";
        const badgeTxt = h.pct >= 80 ? "🏆 Giỏi" : h.pct >= 65 ? "✅ Đạt" : "❌ Chưa đạt";
        return `
            <div class="history-item">
                <span class="history-title">${h.title}</span>
                <span class="history-score">${h.score}/${h.total} (${h.pct}%)</span>
                <span class="history-badge ${badgeCls}">${badgeTxt}</span>
                <span class="history-date">${h.date}</span>
            </div>
        `;
    }).join("");
}

function clearHistory() {
    if (!confirm("Xóa toàn bộ lịch sử thi?")) return;
    localStorage.removeItem("quizHistory");
    renderHistory();
}

// ── Mobile nav ────────────────────────────────────────────────
const navToggle = document.getElementById("nav-toggle");
const navEl = document.getElementById("dataset-nav");
const navOverlay = document.getElementById("nav-overlay");

navToggle.addEventListener("click", () => {
    navEl.classList.toggle("open");
    navOverlay.classList.toggle("show");
});

function closeMobileNav() {
    navEl.classList.remove("open");
    navOverlay.classList.remove("show");
}

navOverlay.addEventListener("click", closeMobileNav);

// ── Shuffle ───────────────────────────────────────────────────
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ── Snowflakes ────────────────────────────────────────────────
function initSnowflakes() {
    const container = document.getElementById("snowflakes");
    for (let i = 0; i < 18; i++) {
        const el = document.createElement("div");
        el.className = "snowflake";
        el.textContent = "❄";
        el.style.left = Math.random() * 100 + "vw";
        el.style.fontSize = (Math.random() * 16 + 8) + "px";
        el.style.animationDuration = (Math.random() * 6 + 6) + "s";
        el.style.animationDelay = Math.random() * 6 + "s";
        container.appendChild(el);
    }
}