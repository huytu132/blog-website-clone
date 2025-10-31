let quizData = null;
let currentSection = null;
let answers = {};
let shuffledQuestions = [];
let timerInterval = null;
let timeLeft = 60 * 60; 

fetch("questions.json")
    .then(res => res.json())
    .then(data => {
        quizData = data;
        const urlParams = new URLSearchParams(window.location.search);
        const sectionId = urlParams.get("section");

        if (sectionId) {
            const section = quizData.sections.find(s => s.id === sectionId);
            if (section) {
                currentSection = {
                    id: section.id,
                    title: section.title,
                    questions: shuffle([...section.questions]).slice(0, section.questions.length)
                };
                showExam();
                return;
            }
        }
        startFortyQuestions();
    })
    .catch(err => console.error("❌ Lỗi tải dữ liệu:", err));


function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startFortyQuestions() {
    const data = shuffle(quizData.sections.flatMap(s => s.questions)).slice(0, 40);
    currentSection = { id: "40", title: "40 câu ngẫu nhiên", questions: data };
    showExam();
}

function showExam() {
    const quizDiv = document.getElementById("quiz");
    quizDiv.innerHTML = `<h2>${currentSection.title}</h2>`;

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
        qDiv.innerHTML = `
            <p><b>Câu ${idx + 1}:</b> ${q.question}</p>
            <div id="opts${idx}">
                ${q.options.map((opt, i) =>
                    `<div class="option" onclick="selectOption(${idx},${i}, this)">${opt.text}</div>`
                ).join("")}
            </div>`;
        quizDiv.appendChild(qDiv);
    });

    renderSidebar();
    initTimer(); 
}

function selectOption(qIndex, optIndex, el) {
    answers[qIndex] = optIndex;
    const optionsDiv = document.getElementById(`opts${qIndex}`);
    optionsDiv.querySelectorAll(".option").forEach((o, i) => {
        o.classList.toggle("selected", i === optIndex);
    });
    renderSidebar();
}

function renderSidebar() {
    const nav = document.getElementById("questionNav");
    nav.innerHTML = "";
    for (let i = 0; i < currentSection.questions.length; i++) {
        let cls = "sidebar-btn";
        if (answers[i] !== undefined) cls += " answered";
        const btn = document.createElement("div");
        btn.className = cls;
        btn.textContent = i + 1;
        btn.onclick = () => {
            document.getElementById(`q${i-1}`).scrollIntoView({ behavior: "smooth" });
            closeSidebar();
        };
        nav.appendChild(btn);
    }
}

function submitExam(auto = false) {
    clearInterval(timerInterval);
    if (!auto && Object.keys(answers).length < shuffledQuestions.length) {
        document.getElementById("resultText").textContent =
            `⚠️ Vui lòng trả lời đầy đủ ${shuffledQuestions.length} câu trước khi nộp!`;
        document.getElementById("resultModal").classList.add("show");
        return;
    }

    let score = 0;
    shuffledQuestions.forEach((q, idx) => {
        const optsDiv = document.getElementById(`opts${idx}`);
        optsDiv.querySelectorAll(".option").forEach((o, i) => {
            if (q.options[i].isCorrect) o.classList.add("correct");
            if (answers[idx] === i && !q.options[i].isCorrect) o.classList.add("wrong");
        });
        if (answers[idx] !== undefined && q.options[answers[idx]].isCorrect) score++;
    });

    document.getElementById("resultText").textContent =
        `✅ Bạn làm đúng ${score}/${shuffledQuestions.length} câu`;
    document.getElementById("resultModal").classList.add("show");

    const submitBtn = document.querySelector("#sidebar button");
    submitBtn.classList.add("btn-yellow");
    submitBtn.textContent = "Làm bài mới";
    submitBtn.onclick = restartExam;

    updateSidebarResult();
    closeSidebar();
}

function updateSidebarResult() {
    const nav = document.getElementById("questionNav");
    nav.querySelectorAll(".sidebar-btn").forEach((btn, idx) => {
        btn.classList.remove("answered");
        if (answers[idx] !== undefined) {
            const isCorrect = shuffledQuestions[idx].options[answers[idx]].isCorrect;
            btn.classList.add(isCorrect ? "sidebar-correct" : "sidebar-wrong");
        }
        else {
            btn.classList.add("sidebar-unanswered");
        }
    });
}

function restartExam() {
    clearInterval(timerInterval);
    answers = {};
    timeLeft = 60 * 60;
    startFortyQuestions();

    const submitBtn = document.querySelector("#sidebar button");
    submitBtn.classList.remove("btn-yellow");
    submitBtn.textContent = "Nộp bài";
    submitBtn.onclick = submitExam;
    closeSidebar();
}

function closeModal() {
    document.getElementById("resultModal").classList.remove("show");
}

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuToggle = document.getElementById("menuToggle");

function openSidebar() {
    sidebar.classList.add("show");
    overlay.style.display = "block";
}
function closeSidebar() {
    sidebar.classList.remove("show");
    overlay.style.display = "none";
}

menuToggle.addEventListener("click", openSidebar);
overlay.addEventListener("click", closeSidebar);


const timerDisplay = document.getElementById("exam-timer");

function initTimer() {
    if (timerInterval) clearInterval(timerInterval);
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    if (timeLeft === 5 * 60) timerDisplay.style.backgroundColor = "rgba(255, 69, 58, 0.8)";

    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        alert("⏰ Hết giờ! Bài thi sẽ được nộp tự động.");
        submitExam(true);
        return;
    }
    timeLeft--;
}
