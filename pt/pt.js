// PT国試ドリル：問題の出題・記録・マイページのグラフ・note の表示
(function () {
  "use strict";
  var KEY = "ptdrill:v1";
  var PASS = 60; // 合格の目安（得点率 60%）
  var Q = window.PT_QUESTIONS || [];
  var FIELDS = window.PT_FIELDS || [];
  var SETS = window.PT_SETS || {};
  var AREA = { common: "共通問題", pt: "専門問題" };
  var byId = {};
  Q.forEach(function (q) { byId[q.id] = q; });

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var setName = function (s) { return SETS[s] || (/^\d+$/.test(String(s)) ? "第" + s + "回" : String(s)); };
  var pct = function (ok, n) { return n ? Math.round(ok / n * 100) : 0; };
  var NUMS = ["1", "2", "3", "4", "5"];

  // ---------------------------------------------------------------- 記録（この端末のブラウザに保存）
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || "null");
      if (d && Array.isArray(d.log)) return { log: d.log, sessions: Array.isArray(d.sessions) ? d.sessions : [] };
    } catch (e) { /* 保存できない環境でも動かす */ }
    return { log: [], sessions: [] };
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; }
  }

  function stats(d) {
    var f = {}, a = { common: { n: 0, ok: 0 }, pt: { n: 0, ok: 0 } }, latest = {}, days = {}, n = 0, ok = 0;
    FIELDS.forEach(function (x) { f[x] = { n: 0, ok: 0 }; });
    d.log.forEach(function (r) {
      var q = byId[r.id];
      if (!q) return;
      n++; if (r.ok) ok++;
      f[q.field] = f[q.field] || { n: 0, ok: 0 };
      f[q.field].n++; if (r.ok) f[q.field].ok++;
      a[q.area].n++; if (r.ok) a[q.area].ok++;
      latest[r.id] = r.ok;
      days[new Date(r.t).toLocaleDateString("ja-JP")] = 1;
    });
    var wrong = Object.keys(latest).filter(function (id) { return !latest[id]; });
    return { n: n, ok: ok, fields: f, areas: a, wrong: wrong, solved: Object.keys(latest).length, days: Object.keys(days).length };
  }

  // 正答率の低い順（2問以上解いた分野）
  function weakFields(s) {
    return FIELDS.filter(function (x) { return s.fields[x].n >= 2; })
      .map(function (x) { return { field: x, n: s.fields[x].n, ok: s.fields[x].ok, p: pct(s.fields[x].ok, s.fields[x].n) }; })
      .sort(function (a, b) { return a.p - b.p || b.n - a.n; });
  }

  // ---------------------------------------------------------------- グラフ（SVG）
  function donut(parts, center, sub) {
    var r = 70, c = 2 * Math.PI * r, total = parts.reduce(function (t, p) { return t + p.v; }, 0), off = 0;
    var arcs = total ? parts.map(function (p) {
      var len = p.v / total * c, s = '<circle cx="90" cy="90" r="' + r + '" fill="none" stroke="' + p.color + '" stroke-width="26" stroke-dasharray="' + len + " " + (c - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 90 90)"/>';
      off += len; return s;
    }).join("") : "";
    return '<svg class="donut" viewBox="0 0 180 180" role="img" aria-label="' + esc(center + " " + sub) + '">' +
      '<circle cx="90" cy="90" r="' + r + '" fill="none" stroke="#f0f3ec" stroke-width="26"/>' + arcs +
      '<text x="90" y="90" text-anchor="middle" font-size="30" font-weight="800" fill="#1f2a1a">' + esc(center) + '</text>' +
      '<text x="90" y="114" text-anchor="middle" font-size="12" fill="#5d6b55">' + esc(sub) + '</text></svg>';
  }

  function bars(rows) {
    return '<div class="bars">' + rows.map(function (r) {
      if (!r.n) return '<div class="bar-row none"><span class="name">' + esc(r.name) + '</span><span class="bar-track"><span class="goal"></span></span><span class="pct">未回答</span></div>';
      var p = pct(r.ok, r.n), cls = p < 40 ? "bad" : p < PASS ? "weak" : "";
      return '<div class="bar-row"><span class="name">' + esc(r.name) + '</span><span class="bar-track" role="img" aria-label="' + esc(r.name) + " 正答率 " + p + '%"><i class="' + cls + '" style="width:' + p + '%"></i><span class="goal"></span></span><span class="pct">' + p + '%<small>' + r.ok + "/" + r.n + "問</small></span></div>";
    }).join("") + "</div>";
  }

  function okNgDonut(ok, n, label) {
    return donut([{ v: ok, color: "#8cc63f" }, { v: n - ok, color: "#e7d3d2" }], n ? pct(ok, n) + "%" : "—", label);
  }

  // ---------------------------------------------------------------- トップ：出題の条件を選ぶ
  function initTop() {
    var form = $("start-form");
    if (!form) return;
    if ($("hs-q")) $("hs-q").textContent = Q.length;
    if ($("hs-f")) $("hs-f").textContent = FIELDS.length;
    var setBox = $("opt-sets"), fieldBox = $("opt-fields");
    setBox.innerHTML = Object.keys(SETS).map(function (s) {
      var c = Q.filter(function (q) { return q.set === s; }).length;
      return '<label><input type="checkbox" name="sets" value="' + esc(s) + '" checked><span>' + esc(setName(s)) + "（" + c + "問）</span></label>";
    }).join("");
    fieldBox.innerHTML = FIELDS.map(function (f) {
      var area = (Q.filter(function (q) { return q.field === f; })[0] || {}).area;
      return '<label data-area="' + (area || "") + '"><input type="checkbox" name="fields" value="' + esc(f) + '" checked><span>' + esc(f) + "</span></label>";
    }).join("");

    var count = function () {
      var sets = checked("sets"), fields = checked("fields");
      var n = Q.filter(function (q) { return sets.indexOf(q.set) >= 0 && fields.indexOf(q.field) >= 0; }).length;
      $("pool-count").textContent = n + "問";
      $("start-btn").disabled = !n;
    };
    var checked = function (name) { return [].slice.call(form.querySelectorAll('input[name="' + name + '"]:checked')).map(function (i) { return i.value; }); };
    form.addEventListener("change", count);
    form.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-pick]");
      if (!b) return;
      e.preventDefault();
      var pick = b.getAttribute("data-pick").split(":"), name = pick[0], how = pick[1];
      form.querySelectorAll('input[name="' + name + '"]').forEach(function (i) {
        var area = i.parentNode.getAttribute("data-area");
        i.checked = how === "all" ? true : how === "none" ? false : area === how;
      });
      count();
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var p = new URLSearchParams();
      p.set("sets", checked("sets").join(","));
      p.set("fields", checked("fields").join(","));
      p.set("n", form.querySelector('[name="n"]').value);
      p.set("order", form.querySelector('input[name="order"]:checked').value);
      location.href = "quiz.html?" + p.toString();
    });
    count();

    var s = stats(load());
    if (s.n) {
      $("top-progress").hidden = false;
      $("top-progress-text").textContent = "これまで " + s.n + " 問・正答率 " + pct(s.ok, s.n) + "%。";
    }
  }

  // ---------------------------------------------------------------- 問題を解く
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function pickQuestions(p) {
    var d = load(), s = stats(d), list, title;
    var mode = p.get("mode");
    if (mode === "wrong") {
      list = s.wrong.map(function (id) { return byId[id]; }).filter(Boolean);
      title = "間違えた問題の復習";
    } else if (mode === "weak") {
      var weak = weakFields(s).filter(function (w) { return w.p < PASS; }).slice(0, 3).map(function (w) { return w.field; });
      if (!weak.length) weak = weakFields(s).slice(0, 3).map(function (w) { return w.field; });
      list = Q.filter(function (q) { return weak.indexOf(q.field) >= 0; });
      title = "苦手分野：" + weak.join("・");
    } else {
      var sets = (p.get("sets") || Object.keys(SETS).join(",")).split(","), fields = (p.get("fields") || FIELDS.join(",")).split(",");
      list = Q.filter(function (q) { return sets.indexOf(String(q.set)) >= 0 && fields.indexOf(q.field) >= 0; });
      title = fields.length === 1 ? fields[0] : sets.length === 1 ? setName(sets[0]) : fields.length + "分野の演習";
    }
    if (p.get("order") === "number") list.sort(function (a, b) { return String(a.set).localeCompare(String(b.set)) || a.no - b.no; });
    else shuffle(list);
    var n = parseInt(p.get("n"), 10);
    if (n > 0) list = list.slice(0, n);
    return { list: list, title: title };
  }

  function initQuiz() {
    var box = $("quiz");
    if (!box) return;
    var picked = pickQuestions(new URLSearchParams(location.search));
    var list = picked.list, i = 0, answers = [], selected = [], done = false;
    $("quiz-title").textContent = picked.title;
    if (!list.length) {
      box.innerHTML = '<div class="empty"><p>条件に合う問題がありません。</p><a class="btn" href="index.html#start">条件を選び直す</a></div>';
      return;
    }

    function isMulti(q) { return Array.isArray(q.answer); }
    function correctSet(q) { return isMulti(q) ? q.answer.slice().sort() : [q.answer]; }

    function render() {
      var q = list[i];
      selected = []; done = false;
      box.innerHTML =
        '<div class="quiz-top"><span>' + (i + 1) + " / " + list.length + ' 問</span><span>正解 ' + answers.filter(function (a) { return a.ok; }).length + ' 問</span></div>' +
        '<div class="progress"><i style="width:' + (i / list.length * 100) + '%"></i></div>' +
        '<div class="panel">' +
        '<div class="q-meta"><span class="tag lime">' + esc(q.field) + '</span><span class="tag">' + esc(AREA[q.area]) + '</span><span class="tag">' + esc(setName(q.set)) + " 問" + q.no + "</span></div>" +
        '<p class="q-text">' + esc(q.q) + "</p>" +
        '<ol class="choices">' + q.choices.map(function (c, k) {
          return '<li><button type="button" class="choice" data-k="' + k + '"><span class="num">' + NUMS[k] + "</span><span>" + esc(c) + "</span></button></li>";
        }).join("") + "</ol>" +
        (isMulti(q) ? '<div class="btn-row"><button type="button" class="btn" id="judge" disabled>解答する</button></div>' : "") +
        '<div id="fb"></div></div>';
      var first = box.querySelector(".choice");
      if (first && document.activeElement && document.activeElement !== document.body) first.focus();
    }

    function choose(k) {
      if (done) return;
      var q = list[i];
      if (!isMulti(q)) { selected = [k]; judge(); return; }
      var at = selected.indexOf(k);
      if (at >= 0) selected.splice(at, 1); else if (selected.length < q.answer.length) selected.push(k);
      box.querySelectorAll(".choice").forEach(function (b) { b.classList.toggle("selected", selected.indexOf(+b.getAttribute("data-k")) >= 0); });
      $("judge").disabled = selected.length !== q.answer.length;
    }

    function judge() {
      var q = list[i], right = correctSet(q), mine = selected.slice().sort();
      var ok = right.length === mine.length && right.every(function (v, x) { return v === mine[x]; });
      done = true;
      answers.push({ id: q.id, ok: ok, mine: mine });
      var d = load();
      d.log.push({ id: q.id, ok: ok, t: Date.now() });
      if (d.log.length > 20000) d.log = d.log.slice(-20000);
      save(d);
      box.querySelectorAll(".choice").forEach(function (b) {
        var k = +b.getAttribute("data-k");
        b.disabled = true;
        b.classList.remove("selected");
        if (right.indexOf(k) >= 0) b.classList.add("correct");
        else if (mine.indexOf(k) >= 0) b.classList.add("wrong");
      });
      if ($("judge")) $("judge").remove();
      var last = i === list.length - 1;
      $("fb").innerHTML = '<div class="feedback' + (ok ? "" : " ng") + '" role="status"><h3>' + (ok ? "◯ 正解" : "× 不正解　正解は " + right.map(function (k) { return NUMS[k]; }).join("・")) + "</h3><p>" + esc(q.exp) + "</p></div>" +
        '<div class="btn-row"><button type="button" class="btn" id="next">' + (last ? "結果を見る" : "次の問題へ") + "</button></div>";
      $("next").focus();
    }

    function finish() {
      var ok = answers.filter(function (a) { return a.ok; }).length, f = {};
      answers.forEach(function (a) { var q = byId[a.id]; f[q.field] = f[q.field] || { n: 0, ok: 0 }; f[q.field].n++; if (a.ok) f[q.field].ok++; });
      var d = load();
      d.sessions.push({ t: Date.now(), title: picked.title, n: answers.length, ok: ok });
      if (d.sessions.length > 200) d.sessions = d.sessions.slice(-200);
      var saved = save(d);
      var p = pct(ok, answers.length);
      box.innerHTML =
        '<div class="panel"><h2>今回の結果</h2><div class="chart-wrap">' + okNgDonut(ok, answers.length, ok + " / " + answers.length + " 問") +
        "<div><p style=\"margin:0 0 8px;font-size:18px;font-weight:700\">" + (p >= 80 ? "すばらしい！この調子です。" : p >= PASS ? "合格ライン（60%）を超えました。" : "合格ラインまであと " + (PASS - p) + " ポイント。解説を読み直しましょう。") + "</p>" +
        '<p class="note-small" style="margin:0">' + (saved ? "記録はマイページに保存しました（この端末のブラウザに保存）。" : "このブラウザでは記録を保存できませんでした（プライベートモードなど）。") + "</p></div></div>" +
        "<h3 style=\"margin:24px 0 10px\">分野ごとの正答率</h3>" + bars(Object.keys(f).map(function (k) { return { name: k, n: f[k].n, ok: f[k].ok }; })) +
        '<div class="btn-row"><a class="btn" href="mypage.html">マイページで傾向を見る</a>' + (ok < answers.length ? '<a class="btn ghost" href="quiz.html?mode=wrong">間違えた問題だけ解く</a>' : "") + '<a class="btn ghost" href="index.html#start">条件を変えて解く</a></div></div>' +
        '<div class="panel"><h2>ふりかえり</h2>' + answers.map(function (a, x) {
          var q = byId[a.id];
          return '<div class="review-item"><div class="q-meta"><span class="' + (a.ok ? "ok" : "ng") + '">' + (a.ok ? "◯" : "×") + "</span><span class=\"tag\">" + esc(q.field) + "</span></div><p style=\"margin:4px 0\"><b>" + (x + 1) + ". " + esc(q.q) + "</b></p>" +
            '<p style="margin:4px 0">正解：' + correctSet(q).map(function (k) { return NUMS[k] + ". " + esc(q.choices[k]); }).join("／") + (a.ok ? "" : '<br><span class="ng">あなたの解答：' + a.mine.map(function (k) { return NUMS[k] + ". " + esc(q.choices[k]); }).join("／") + "</span>") + "</p>" +
            '<p class="note-small" style="margin:4px 0">' + esc(q.exp) + "</p></div>";
        }).join("") + "</div>";
      window.scrollTo(0, 0);
      showNote();
    }

    box.addEventListener("click", function (e) {
      var c = e.target.closest(".choice");
      if (c && !c.disabled) return choose(+c.getAttribute("data-k"));
      if (e.target.id === "judge") return judge();
      if (e.target.id === "next") { i++; if (i < list.length) { render(); window.scrollTo(0, box.offsetTop - 70); } else finish(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey || i >= list.length) return;
      var k = NUMS.indexOf(e.key);
      if (k >= 0 && !done && list[i].choices[k] != null) { e.preventDefault(); choose(k); }
      else if (e.key === "Enter" && $("judge") && !$("judge").disabled && document.activeElement.tagName !== "BUTTON") { e.preventDefault(); judge(); }
    });
    render();
  }

  // ---------------------------------------------------------------- マイページ
  function initMypage() {
    var box = $("mypage");
    if (!box) return;
    var d = load(), s = stats(d);
    if (!s.n) {
      box.innerHTML = '<div class="empty"><p style="font-size:18px;font-weight:700;color:#1f2a1a">まだ記録がありません</p><p>問題を解くと、分野ごとの正答率や苦手分野がここに表示されます。</p><a class="btn" href="index.html#start">さっそく解いてみる</a></div>';
      return;
    }
    var weak = weakFields(s), top = weak.filter(function (w) { return w.p < PASS; }).slice(0, 3);
    if (!top.length) top = weak.slice(0, 1);
    var untouched = FIELDS.filter(function (f) { return !s.fields[f].n; });
    var total = Q.length;

    box.innerHTML =
      '<div class="kpis">' +
      '<div class="kpi"><div class="v">' + pct(s.ok, s.n) + "<small>%</small></div><div class=\"k\">全体の正答率</div></div>" +
      '<div class="kpi"><div class="v">' + s.n + "<small>問</small></div><div class=\"k\">解いた回数（のべ）</div></div>" +
      '<div class="kpi"><div class="v">' + s.solved + "<small>/ " + total + "</small></div><div class=\"k\">挑戦した問題</div></div>" +
      '<div class="kpi"><div class="v">' + s.days + "<small>日</small></div><div class=\"k\">学習した日数</div></div></div>" +

      "<h2>あなたのウィークポイント</h2>" +
      (top.length ? '<ul class="weak-list">' + top.map(function (w) {
        return '<li class="' + (w.p < 40 ? "bad" : "") + '"><span><b>' + esc(w.field) + "</b>　正答率 " + w.p + "%（" + w.ok + "/" + w.n + "問）<br><span class=\"note-small\">" + (w.p < PASS ? "合格ライン 60% まであと " + (PASS - w.p) + " ポイント" : "いちばん正答率が低い分野です") + "</span></span>" +
          '<a class="btn" href="quiz.html?fields=' + encodeURIComponent(w.field) + '&amp;n=10">この分野を解く</a></li>';
      }).join("") + "</ul>" : '<p class="lead">同じ分野を 2 問以上解くと、苦手分野がわかります。</p>') +
      (untouched.length ? '<p class="note-small">まだ解いていない分野：' + untouched.map(esc).join("、") + "</p>" : "") +
      '<div class="btn-row">' + (weak.length ? '<a class="btn" href="quiz.html?mode=weak&amp;n=10">苦手分野をまとめて解く</a>' : "") +
      (s.wrong.length ? '<a class="btn ghost" href="quiz.html?mode=wrong">間違えたままの問題（' + s.wrong.length + "問）を解く</a>" : "") + "</div>" +

      '<div class="grid grid-2" style="margin-top:32px">' +
      '<div class="panel"><h2>全体の正答率</h2><div class="chart-wrap">' + okNgDonut(s.ok, s.n, "正答率") +
      '<ul class="legend"><li><i style="background:#8cc63f"></i>正解 ' + s.ok + '問</li><li><i style="background:#e7d3d2"></i>不正解 ' + (s.n - s.ok) + "問</li></ul></div></div>" +
      '<div class="panel"><h2>共通・専門のバランス</h2>' +
      bars(["common", "pt"].map(function (a) { return { name: AREA[a], n: s.areas[a].n, ok: s.areas[a].ok }; })) +
      '<p class="note-small">縦の線は合格の目安（60%）です。</p></div></div>' +

      '<div class="panel" style="margin-top:16px"><h2>分野別の正答率</h2>' +
      bars(FIELDS.map(function (f) { return { name: f, n: s.fields[f].n, ok: s.fields[f].ok }; })) +
      '<p class="note-small">黄緑＝60%以上、オレンジ＝40〜59%、赤＝40%未満。縦の線は合格の目安（60%）です。</p></div>' +

      (d.sessions.length ? '<div class="panel" style="margin-top:16px"><h2>最近の学習</h2><div class="table-scroll"><table class="history"><thead><tr><th>日時</th><th>内容</th><th class="r">正解</th><th class="r">正答率</th></tr></thead><tbody>' +
        d.sessions.slice(-10).reverse().map(function (x) {
          var dt = new Date(x.t);
          return "<tr><td>" + (dt.getMonth() + 1) + "/" + dt.getDate() + " " + String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0") + "</td><td>" + esc(x.title) + '</td><td class="r">' + x.ok + "/" + x.n + '</td><td class="r">' + pct(x.ok, x.n) + "%</td></tr>";
        }).join("") + "</tbody></table></div></div>" : "") +

      '<p class="note-small" style="margin-top:24px">記録はこの端末のブラウザだけに保存されます（会員登録は不要です）。ブラウザのデータを消すと記録も消えます。　<button type="button" id="reset" class="btn ghost" style="padding:6px 12px;font-size:13px">記録をすべて消す</button></p>';

    $("reset").addEventListener("click", function () {
      if (!confirm("これまでの記録をすべて消します。よろしいですか？")) return;
      try { localStorage.removeItem(KEY); } catch (e) { /* 何もしない */ }
      location.reload();
    });
  }

  // ---------------------------------------------------------------- note の記事
  function showNote() {
    var box = $("note");
    if (!box || !window.fetch) return;
    fetch("note.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || !(data.items && data.items.length) && !data.profile) return;
      var limit = +box.getAttribute("data-limit") || 6;
      $("note-list").innerHTML = (data.items || []).slice(0, limit).map(function (it) {
        return '<a class="note-card" href="' + esc(it.link) + '" target="_blank" rel="noopener">' +
          (it.thumb ? '<img class="thumb" src="' + esc(it.thumb) + '" alt="" loading="lazy">' : '<span class="thumb"></span>') +
          '<span class="body"><span class="title">' + esc(it.title) + "</span>" + (it.date ? '<span class="date">' + esc(it.date) + "</span>" : "") + "</span></a>";
      }).join("");
      var cta = data.membership || data.profile;
      if (cta) {
        $("note-cta").innerHTML = '<p><b>リハビリの「なぜ？」を、国試のその先まで。</b><br><span class="note-small">臨床につながる解説を note で毎日更新中。フォロー・有料記事で応援してもらえるとうれしいです。</span></p>' +
          '<a class="btn" href="' + esc(cta) + '" target="_blank" rel="noopener">' + (data.membership ? "メンバーシップを見る" : "note をフォローする") + "</a>";
        $("note-cta").hidden = false;
      }
      box.hidden = false;
    }).catch(function () { /* note が読めなくても問題は解ける */ });
  }

  initTop();
  initQuiz();
  initMypage();
  if (!$("quiz")) showNote();
})();
