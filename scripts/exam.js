// Danh sách tất cả bộ đề
const ALL_DATASETS = [
    { file: "congtacthammuu.json" },
    { file: "chinhtri.json" },
    { file: "hckt.json" },
    { file: "taichinh.json" },
    { file: "canbodoangioi.json" }
];

const OPTION_LABELS = ["A", "B", "C", "D", "E"];

let quizData = null;
let currentSection = null;
let answers = {};
let shuffledQuestions = [];
let timerInterval = null;
let timeLeft = 60 * 60;

const urlParams = new URLSearchParams(window.location.search);
const datasetParam = urlParams.get("dataset") || "all";
const sectionParam = urlParams.get("section");

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ── Load dataset(s) ──────────────────────────────────────────
if (datasetParam === "all") {
    Promise.all(ALL_DATASETS.map(ds =>
        fetch(ds.file).then(res => res.json()).catch(() => null)
    )).then(results => {
        const allQuestions = results
            .filter(Boolean)
            .flatMap(data => data.sections.flatMap(s => s.questions));
        quizData = {
            title: "Tổng hợp tất cả bộ đề",
            sections: [{ id: "all", title: "Tất cả", questions: allQuestions }]
        };
        startFortyQuestions();
    }).catch(err => console.error("❌ Lỗi tải dữ liệu:", err));
} else {
    fetch(datasetParam)
        .then(res => res.json())
        .then(data => {
            quizData = data;
            if (sectionParam) {
                const section = quizData.sections.find(s => s.id === sectionParam);
                if (section) {
                    currentSection = {
                        id: section.id,
                        title: section.title,
                        questions: shuffle([...section.questions])
                    };
                    showExam();
                    return;
                }
            }
            startFortyQuestions();
        })
        .catch(err => console.error("❌ Lỗi tải dữ liệu:", err));
}

function startFortyQuestions() {
    const allQ = quizData.sections.flatMap(s => s.questions);
    const count = Math.min(40, allQ.length);
    const data = shuffle([...allQ]).slice(0, count);
    currentSection = {
        id: "exam",
        title: quizData.title,
        questions: data
    };
    showExam();
}

// ── Render Exam ───────────────────────────────────────────────
function showExam() {
    const quizDiv = document.getElementById("quiz");
    quizDiv.innerHTML = "";

    // Set exam title in header
    const label = document.getElementById("exam-title-label");
    if (label) label.textContent = currentSection.title;

    shuffledQuestions = currentSection.questions.map((q, idx) => {
        const options = shuffle(q.options.map((opt, i) => ({
            text: opt,
            isCorrect: i === q.correct
        })));
        return { ...q, index: idx, options };
    });

    shuffledQuestions.forEach((q, idx) => {
        const qDiv = document.createElement("div");
        qDiv.className = "question";
        qDiv.id = `q${idx}`;

        const optionsHtml = q.options.map((opt, i) => `
            <div class="option" onclick="selectOption(${idx}, ${i})">
                <span class="opt-label">${OPTION_LABELS[i] || i + 1}</span>
                <span class="opt-text">${opt.text}</span>
            </div>
        `).join("");

        qDiv.innerHTML = `
            <p><b>Câu ${idx + 1}:</b> ${q.question}</p>
            <div id="opts${idx}">${optionsHtml}</div>
        `;
        quizDiv.appendChild(qDiv);
    });

    answers = {};
    renderSidebar();
    updateProgressBar();
    initTimer();
}

// ── Select Option ─────────────────────────────────────────────
function selectOption(qIndex, optIndex) {
    answers[qIndex] = optIndex;
    const optionsDiv = document.getElementById(`opts${qIndex}`);
    optionsDiv.querySelectorAll(".option").forEach((o, i) => {
        o.classList.toggle("selected", i === optIndex);
    });
    renderSidebar();
    updateProgressBar();
}

// ── Progress Bar ──────────────────────────────────────────────
function updateProgressBar() {
    const total = shuffledQuestions.length;
    const answered = Object.keys(answers).length;
    const pct = total ? Math.round((answered / total) * 100) : 0;

    const fill = document.getElementById("progress-bar-fill");
    const text = document.getElementById("progress-text");
    if (fill) fill.style.width = pct + "%";
    if (text) text.textContent = `${answered} / ${total}`;
}

// ── Sidebar ───────────────────────────────────────────────────
function renderSidebar() {
    const nav = document.getElementById("questionNav");
    nav.innerHTML = "";
    for (let i = 0; i < currentSection.questions.length; i++) {
        let cls = "sidebar-btn";
        if (answers[i] !== undefined) cls += " answered";
        const btn = document.createElement("div");
        btn.className = cls;
        btn.textContent = i + 1;
        btn.title = `Câu ${i + 1}`;
        btn.onclick = () => {
            document.getElementById(`q${i}`).scrollIntoView({ behavior: "smooth", block: "start" });
            if (window.innerWidth <= 900) closeSidebar();
        };
        nav.appendChild(btn);
    }
}

// ── Submit ────────────────────────────────────────────────────
function submitExam(auto = false) {
    clearInterval(timerInterval);

    const unanswered = shuffledQuestions.length - Object.keys(answers).length;
    if (!auto && unanswered > 0) {
        if (!confirm(`⚠️ Còn ${unanswered} câu chưa trả lời. Bạn vẫn muốn nộp bài?`)) return;
    }

    let score = 0;
    const wrongList = [];

    shuffledQuestions.forEach((q, idx) => {
        const optsDiv = document.getElementById(`opts${idx}`);
        if (!optsDiv) return;
        optsDiv.querySelectorAll(".option").forEach((o, i) => {
            if (q.options[i].isCorrect) o.classList.add("correct");
            if (answers[idx] === i && !q.options[i].isCorrect) o.classList.add("wrong");
            o.style.pointerEvents = "none";
        });
        const isCorrect = answers[idx] !== undefined && q.options[answers[idx]].isCorrect;
        if (isCorrect) {
            score++;
        } else {
            const correctOpt = q.options.find(o => o.isCorrect);
            wrongList.push({
                num: idx + 1,
                question: q.question,
                yourAnswer: answers[idx] !== undefined ? q.options[answers[idx]].text : "(Chưa trả lời)",
                correctAnswer: correctOpt ? correctOpt.text : ""
            });
        }
    });

    // Lưu lịch sử
    saveHistory(currentSection.title, score, shuffledQuestions.length, datasetParam);

    // Hiển thị kết quả
    const pct = Math.round((score / shuffledQuestions.length) * 100);
    let grade, icon;
    if (pct >= 80)      { grade = "Giỏi";       icon = "🏆"; }
    else if (pct >= 65) { grade = "Đạt";         icon = "✅"; }
    else                { grade = "Chưa đạt";    icon = "📖"; }

    document.getElementById("resultIcon").textContent = icon;
    document.getElementById("resultGrade").textContent = grade;
    document.getElementById("resultScore").textContent = `${score}/${shuffledQuestions.length}`;
    document.getElementById("resultPct").textContent = `Tỷ lệ đúng: ${pct}%`;

    const actions = document.getElementById("resultActions");
    let actHtml = `<button class="btn btn-primary" onclick="closeModal()">Xem bài</button>
                   <button class="btn btn-ghost-dark" onclick="restartExam()">Làm lại</button>`;
    if (wrongList.length > 0) {
        actHtml += `<button class="btn btn-danger" onclick="showWrongAnswers()">📋 ${wrongList.length} câu sai</button>`;
    }
    actions.innerHTML = actHtml;

    window._wrongList = wrongList;
    document.getElementById("resultModal").classList.add("show");
    updateSidebarResult();
    closeSidebar();
}

// ── Xem câu sai ──────────────────────────────────────────────
function showWrongAnswers() {
    const list = window._wrongList || [];
    if (!list.length) return;

    document.getElementById("resultModal").classList.remove("show");

    document.getElementById("wrongList").innerHTML = list.map(w => `
        <div class="wrong-item">
            <p class="q-text">Câu ${w.num}: ${w.question}</p>
            <p class="wrong-your">❌ Bạn chọn: ${w.yourAnswer}</p>
            <p class="wrong-correct">✅ Đáp án đúng: ${w.correctAnswer}</p>
        </div>
    `).join("");
    document.getElementById("wrongModal").classList.add("show");
}

function closeWrongModal() {
    document.getElementById("wrongModal").classList.remove("show");
    document.getElementById("resultModal").classList.add("show");
}

function closeModal() {
    document.getElementById("resultModal").classList.remove("show");
}

// ── LocalStorage ──────────────────────────────────────────────
function saveHistory(title, score, total, dataset) {
    const history = JSON.parse(localStorage.getItem("quizHistory") || "[]");
    history.unshift({
        date: new Date().toLocaleString("vi-VN"),
        title,
        score,
        total,
        dataset,
        pct: Math.round((score / total) * 100)
    });
    localStorage.setItem("quizHistory", JSON.stringify(history.slice(0, 20)));
}

// ── Sidebar result colors ─────────────────────────────────────
function updateSidebarResult() {
    document.getElementById("questionNav").querySelectorAll(".sidebar-btn").forEach((btn, idx) => {
        btn.classList.remove("answered");
        if (answers[idx] !== undefined) {
            btn.classList.add(shuffledQuestions[idx].options[answers[idx]].isCorrect
                ? "sidebar-correct" : "sidebar-wrong");
        } else {
            btn.classList.add("sidebar-unanswered");
        }
    });
}

// ── Restart ───────────────────────────────────────────────────
function restartExam() {
    closeModal();
    clearInterval(timerInterval);
    answers = {};
    timeLeft = 60 * 60;
    startFortyQuestions();
}

// ── Sidebar Toggle ────────────────────────────────────────────
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

function openSidebar() {
    sidebar.classList.add("show");
    overlay.style.display = "block";
}
function closeSidebar() {
    sidebar.classList.remove("show");
    overlay.style.display = "none";
}

// Close button inside sidebar
const closeBtn = document.getElementById("menuToggle");
if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

// ── Timer ─────────────────────────────────────────────────────
const timerEl = document.getElementById("exam-timer");

function initTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft = 60 * 60;
    renderTimer();
    timerInterval = setInterval(() => {
        timeLeft--;
        renderTimer();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitExam(true);
        }
    }, 1000);
}

function renderTimer() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    timerEl.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    if (timeLeft <= 5 * 60) {
        timerEl.style.background = "rgba(220,38,38,0.85)";
        timerEl.style.border = "1px solid rgba(254,202,202,0.5)";
    }
}
