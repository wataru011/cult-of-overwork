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

  // 同点時のレア度ランク（小さいほどレア）。
  // 基本6タイプより後発の個性派タイプを「レア」とみなし、同点なら優先する。
  const RARITY_RANK = {};
  TYPE_ORDER.forEach((id, i) => {
    RARITY_RANK[id] = TYPE_ORDER.length - 1 - i;
  });

  const state = {
    index: 0,
    answers: [], // 各設問で選んだ選択肢のindex
  };

  const screens = {
    start: document.getElementById("screen-start"),
    quiz: document.getElementById("screen-quiz"),
    loading: document.getElementById("screen-loading"),
    result: document.getElementById("screen-result"),
    types: document.getElementById("screen-types"),
  };

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("is-active"));
    screens[name].classList.add("is-active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- version ---------- */
  function showVersion() {
    const el = document.getElementById("app-version");
    if (!el) return;
    let v = window.APP_VERSION;
    // デプロイ時に置換されなかった場合（ローカル閲覧）は dev 表示
    if (!v || v.indexOf("PLACEHOLDER") !== -1) v = "dev";
    el.textContent = "version " + v;
  }

  /* ---------- start ---------- */
  function initStart() {
    document.getElementById("q-total").textContent = QUESTIONS.length;
    document.getElementById("start-btn").addEventListener("click", startQuiz);
    document.getElementById("retry-btn").addEventListener("click", startQuiz);
    document.getElementById("back-btn").addEventListener("click", goBack);
    document.getElementById("share-btn").addEventListener("click", share);
    document.getElementById("show-types-btn").addEventListener("click", openTypes);
    document
      .getElementById("back-to-result-btn")
      .addEventListener("click", () => showScreen("result"));
  }

  /* ---------- types list ---------- */
  function openTypes() {
    renderTypesList();
    showScreen("types");
  }

  function renderTypesList() {
    const curId = state._lastType ? state._lastType.id : null;
    const box = document.getElementById("types-list");
    box.innerHTML = TYPE_ORDER.map((id) => {
      const t = TYPES[id];
      const cls = "type-item" + (id === curId ? " is-current" : "");
      const badge = id === curId ? '<span class="type-you">YOU</span>' : "";
      return (
        `<div class="${cls}">` +
        `<span class="type-emoji">${t.emoji}</span>` +
        `<div class="type-info"><div class="type-name">${t.name}${badge}</div>` +
        `<div class="type-catch">${t.catch}</div></div></div>`
      );
    }).join("");
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
    // タップ後にフォーカス枠が残らないように外す
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
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

  // 各タイプが「シグネチャー設問(3点)」を選ばれた数を集計（通常0か1）
  function signatureHits() {
    const hits = {};
    TYPE_ORDER.forEach((id) => (hits[id] = 0));
    state.answers.forEach((optIdx, qIdx) => {
      const opt = QUESTIONS[qIdx] && QUESTIONS[qIdx].options[optIdx];
      if (!opt) return;
      Object.entries(opt.scores).forEach(([id, v]) => {
        if (v >= 3) hits[id] = (hits[id] || 0) + 1;
      });
    });
    return hits;
  }

  function pickWinner(scores) {
    // 1) 最高得点のタイプを集める
    let max = -Infinity;
    TYPE_ORDER.forEach((id) => {
      if (scores[id] > max) max = scores[id];
    });
    let tied = TYPE_ORDER.filter((id) => scores[id] === max);
    if (tied.length === 1) return tied[0];

    // 2) tie-break A: シグネチャー(3点)設問を選んだタイプを優先
    //    拡散的な2点の寄せ集めより、明確な強い選択を尊重する
    const sig = signatureHits();
    let maxSig = -Infinity;
    tied.forEach((id) => {
      if (sig[id] > maxSig) maxSig = sig[id];
    });
    tied = tied.filter((id) => sig[id] === maxSig);
    if (tied.length === 1) return tied[0];

    // 3) tie-break B: よりレアなタイプを優先（MBTIが同点をマイノリティ側に倒すのと同じ発想）
    tied.sort((a, b) => RARITY_RANK[a] - RARITY_RANK[b]);
    return tied[0];
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

    const img = document.getElementById("result-image");
    img.src = "cards/" + winnerId + ".svg";
    img.alt = t.name + "のイメージ";
    document.getElementById("result-name").textContent = t.name;
    document.getElementById("result-catch").textContent = "“" + t.catch + "”";
    document.getElementById("result-desc").textContent = t.description;

    fillList("result-strengths", t.strengths);
    fillList("result-risks", t.risks);
    document.getElementById("result-advice").textContent = t.advice;

    const comp = TYPES[t.compatible];
    document.getElementById("result-compatible").innerHTML =
      `🤝 一緒にいると元気をもらえる相性タイプ<br><b>${comp.emoji} ${comp.name}</b>`;

    const incomp = TYPES[t.incompatible];
    document.getElementById("result-incompatible").innerHTML =
      `⚡ 一緒だとすれ違いやすい要注意タイプ<br><b>${incomp.emoji} ${incomp.name}</b>`;

    state._lastType = t;
    // 画像つきシェア用に結果カードをPNG化しておく（対応ブラウザのみ）
    state._shareFile = null;
    buildShareFile(t);
  }

  function fillList(id, items) {
    document.getElementById(id).innerHTML = items
      .map((x) => `<li>${x}</li>`)
      .join("");
  }

  /* ---------- share ---------- */
  // 結果カードSVGをPNG化して state._shareFile に保持（Web Share Level 2 用）
  function buildShareFile(t) {
    // ファイル添付シェア非対応ならスキップ（テキスト共有にフォールバック）
    if (typeof navigator.canShare !== "function") return;
    const img = new Image();
    img.onload = function () {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 900;
        canvas.getContext("2d").drawImage(img, 0, 0, 600, 900);
        canvas.toBlob(function (blob) {
          if (!blob) return;
          const file = new File([blob], t.id + ".png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) state._shareFile = file;
        }, "image/png");
      } catch (e) {
        /* 汚染等で失敗したらテキスト共有のまま */
      }
    };
    img.src = "cards/" + t.id + ".svg";
  }

  function share() {
    const t = state._lastType;
    if (!t) return;
    const url = location.href.split("#")[0];
    const text =
      `私の長時間労働タイプは「${t.emoji} ${t.name}」でした！\n` +
      `“${t.catch}”\n#長時間労働診断\n${url}`;

    // 画像つきシェア（準備できていて対応している場合）
    const file = state._shareFile;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator
        .share({ title: "長時間労働診断", text: text, files: [file] })
        .catch(() => {});
      return;
    }

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
  showVersion();
  initStart();
})();
