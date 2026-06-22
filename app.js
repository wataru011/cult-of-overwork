/* 長時間労働診断 — アプリ本体 */
(function () {
  "use strict";

  const TYPE_ORDER = [
    "sacrifice",
    "service",
    "dream",
    "lover",
    "doom",
    "expression",
    "revenge",
    "companylove",
    "familylove",
    "lonewolf",
    "blackhole",
    "whitehole",
    "seeker",
    "king",
    "elf",
    "timetraveler",
  ];

  const state = {
    index: 0,
    answers: [], // 各設問で選んだ選択肢のindex
  };

  const screens = {
    start: document.getElementById("screen-start"),
    quiz: document.getElementById("screen-quiz"),
    loading: document.getElementById("screen-loading"),
    result: document.getElementById("screen-result"),
  };

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("is-active"));
    screens[name].classList.add("is-active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- start ---------- */
  function initStart() {
    const preview = document.getElementById("type-preview");
    preview.innerHTML = TYPE_ORDER.map((id) => {
      const t = TYPES[id];
      return `<li>${t.emoji} ${t.name}</li>`;
    }).join("");

    document.getElementById("q-total").textContent = QUESTIONS.length;
    document.getElementById("start-btn").addEventListener("click", startQuiz);
    document.getElementById("retry-btn").addEventListener("click", startQuiz);
    document.getElementById("back-btn").addEventListener("click", goBack);
    document.getElementById("share-btn").addEventListener("click", share);
  }

  function startQuiz() {
    state.index = 0;
    state.answers = [];
    renderQuestion();
    showScreen("quiz");
  }

  /* ---------- quiz ---------- */
  function renderQuestion() {
    const q = QUESTIONS[state.index];
    document.getElementById("q-text").textContent = q.q;
    document.getElementById("q-current").textContent = state.index + 1;

    const pct = (state.index / QUESTIONS.length) * 100;
    document.getElementById("progress-bar").style.width = pct + "%";

    const back = document.getElementById("back-btn");
    back.classList.toggle("show", state.index > 0);

    const box = document.getElementById("options");
    box.innerHTML = "";
    q.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.type = "button";
      btn.textContent = opt.label;
      if (state.answers[state.index] === i) btn.classList.add("is-selected");
      btn.addEventListener("click", () => selectOption(i));
      box.appendChild(btn);
    });
  }

  function selectOption(optionIndex) {
    state.answers[state.index] = optionIndex;
    // 選択フィードバックを少し見せてから次へ
    const buttons = document.querySelectorAll("#options .option");
    buttons.forEach((b, i) => b.classList.toggle("is-selected", i === optionIndex));

    setTimeout(() => {
      if (state.index < QUESTIONS.length - 1) {
        state.index++;
        renderQuestion();
      } else {
        finish();
      }
    }, 220);
  }

  function goBack() {
    if (state.index > 0) {
      state.index--;
      renderQuestion();
    }
  }

  /* ---------- scoring ---------- */
  function computeScores() {
    const scores = {};
    TYPE_ORDER.forEach((id) => (scores[id] = 0));
    state.answers.forEach((optIdx, qIdx) => {
      const opt = QUESTIONS[qIdx].options[optIdx];
      if (!opt) return;
      Object.entries(opt.scores).forEach(([id, v]) => {
        scores[id] = (scores[id] || 0) + v;
      });
    });
    return scores;
  }

  function pickWinner(scores) {
    // 最高得点。同点なら設問での選択が早かった順（出現順）で決める。
    let best = null;
    let bestScore = -1;
    TYPE_ORDER.forEach((id) => {
      if (scores[id] > bestScore) {
        bestScore = scores[id];
        best = id;
      }
    });
    return best;
  }

  /* ---------- finish & loading ---------- */
  function finish() {
    document.getElementById("progress-bar").style.width = "100%";
    showScreen("loading");
    setTimeout(() => {
      renderResult();
      showScreen("result");
    }, 1400);
  }

  /* ---------- result ---------- */
  function renderResult() {
    const scores = computeScores();
    const winnerId = pickWinner(scores);
    const t = TYPES[winnerId];

    document.documentElement.style.setProperty("--primary", t.color);

    document.getElementById("result-emoji").textContent = t.emoji;
    document.getElementById("result-name").textContent = t.name;
    document.getElementById("result-catch").textContent = "“" + t.catch + "”";
    document.getElementById("result-desc").textContent = t.description;

    fillList("result-strengths", t.strengths);
    fillList("result-risks", t.risks);
    document.getElementById("result-advice").textContent = t.advice;

    const comp = TYPES[t.compatible];
    document.getElementById("result-compatible").innerHTML =
      `🤝 一緒にいると元気をもらえる相性タイプ<br><b>${comp.emoji} ${comp.name}</b>`;

    renderBars(scores);
    state._lastType = t;
  }

  function fillList(id, items) {
    document.getElementById(id).innerHTML = items
      .map((x) => `<li>${x}</li>`)
      .join("");
  }

  function renderBars(scores) {
    const max = Math.max(1, ...TYPE_ORDER.map((id) => scores[id]));
    // 全16タイプは多いので、得点上位6タイプのみ表示する
    const sorted = [...TYPE_ORDER]
      .sort((a, b) => scores[b] - scores[a])
      .slice(0, 6);
    const box = document.getElementById("result-bars");
    box.innerHTML = sorted
      .map((id) => {
        const t = TYPES[id];
        const pct = Math.round((scores[id] / max) * 100);
        return (
          `<div class="bar-row">` +
          `<span class="bar-name">${t.emoji} ${t.name}</span>` +
          `<span class="bar-track"><span class="bar-fill" data-pct="${pct}" style="background:${t.color}"></span></span>` +
          `<span class="bar-pct">${pct}%</span>` +
          `</div>`
        );
      })
      .join("");
    // アニメーションのため次フレームで幅を設定
    requestAnimationFrame(() => {
      box.querySelectorAll(".bar-fill").forEach((el) => {
        el.style.width = el.dataset.pct + "%";
      });
    });
  }

  /* ---------- share ---------- */
  function share() {
    const t = state._lastType;
    if (!t) return;
    const url = location.href.split("#")[0];
    const text =
      `私の長時間労働タイプは「${t.emoji} ${t.name}」でした！\n` +
      `“${t.catch}”\n#長時間労働診断\n${url}`;

    if (navigator.share) {
      navigator
        .share({ title: "長時間労働診断", text: text, url: url })
        .catch(() => {});
    } else {
      copyText(text);
    }
  }

  function copyText(text) {
    const done = () => showToast();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, cb) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(ta);
    cb && cb();
  }

  function showToast() {
    const toast = document.getElementById("copied-toast");
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }

  /* ---------- boot ---------- */
  initStart();
})();
