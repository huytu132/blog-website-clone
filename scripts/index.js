let quizData = null;
let currentSection = null;
let currentIndex = 0;
let shuffledOptions = []; 

const menuDiv = document.getElementById("menu");
const quizDiv = document.getElementById("quiz");

fetch("questions.json")
    .then(res => res.json())
    .then(data => {
        quizData = data;
        showMenu();
    })
    .catch(err => {
        menuDiv.innerHTML = "<p style='color:red'>Lỗi tải file questions.json</p>";
        console.error(err);
    });

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function showMenu() {
    quizDiv.classList.add("hidden");
    menuDiv.innerHTML = `
        <h2>${quizData.title}</h2>
        <p>${quizData.description}</p>
        <h3>Chọn mục để làm bài</h3>
        ${quizData.sections.map(sec =>
        `<button class="btn btn-yellow" onclick="startSection('${sec.id}')">${sec.title}</button>`
    ).join("")}
        <button class="btn btn-yellow" onclick="startAll()">Làm tất cả</button>
        <h3>Kiểm tra</h3>
        <button class="btn btn-yellow""><a href="exam.html">Chọn ngẫu nhiên 40 câu</a></button>
      `;
}

function startSection(id) {
    window.location.href = `exam.html?section=${id}`;
}

function startAll() {
    currentSection = {
        id: "all",
        title: "Tất cả câu hỏi",
        questions: shuffle(quizData.sections.flatMap(s => s.questions)) 
    };
    currentIndex = 0;
    showQuestion();
}

function showQuestion() {
    menuDiv.innerHTML = "";
    quizDiv.classList.remove("hidden");

    const q = currentSection.questions[currentIndex];

    shuffledOptions = q.options.map((opt, i) => ({
        text: opt,
        isCorrect: i === q.correct
    }));

    shuffle(shuffledOptions);

    quizDiv.innerHTML = `
        <h3>${currentSection.title}</h3>
        <p><b>Câu ${currentIndex + 1}:</b> ${q.question}</p>
        <div id="options">
          ${shuffledOptions.map((opt, i) =>
        `<div class="option" onclick="checkAnswer(${i})">${opt.text}</div>`
    ).join("")}
        </div>
        <div id="nav"></div>
      `;
}

function checkAnswer(choice) {
    const optionsDiv = document.getElementById("options");
    const optionEls = optionsDiv.querySelectorAll(".option");

    optionEls.forEach((el, i) => {
        if (shuffledOptions[i].isCorrect) el.classList.add("correct");
        if (i === choice && !shuffledOptions[i].isCorrect) el.classList.add("wrong");
        el.style.pointerEvents = "none";
    });

    document.getElementById("nav").innerHTML = `
        <button class="btn btn-blue" onclick="retry()">Làm lại</button>
        ${currentIndex > 0 ? `<button class="btn btn-blue" onclick="prev()">Quay lại</button>` : ""}
        ${currentIndex < currentSection.questions.length - 1
            ? `<button class="btn btn-green" onclick="next()">Next</button>`
            : `<button class="btn btn-red" onclick="showMenu()">Kết thúc</button>`}
      `;
}

for (let i = 0; i < 20; i++) {
  const snow = document.createElement('div');
  snow.className = 'snowflake';
  snow.textContent = '❄';
  snow.style.left = Math.random() * 100 + 'vw';
  snow.style.fontSize = (Math.random() * 20 + 10) + 'px';
  snow.style.animationDuration = (Math.random() * 5 + 5) + 's';
  snow.style.animationDelay = Math.random() * 5 + 's';
  document.body.appendChild(snow);
}

function retry() { showQuestion(); }
function next() { currentIndex++; showQuestion(); }
function prev() { currentIndex--; showQuestion(); }