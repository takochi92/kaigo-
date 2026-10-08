// Claude 作業ログ ダッシュボード
(function () {
  var L = window.ClaudeLog;
  var esc = L.esc;
  var $ = function (id) { return document.getElementById(id); };
  var SEEN_KEY = "claude-log-seen";
  var NOTIFY_KEY = "claude-log-notify";
  var KIND_ORDER = ["page", "data", "design", "ops", "docs"];
  var STATUS = { done: "完了", auto: "自動", active: "進行中", idea: "候補" };

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 5000);
  }

  // 数字をカウントアップ
  function countUp(el, to) {
    var start = performance.now();
    var dur = 900;
    (function step(now) {
      var p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  function weekdayJa(date) {
    return "日月火水木金土".charAt(new Date(date + "T00:00:00Z").getUTCDay());
  }

  function fileChip(f, status) {
    var name = f.path.split("/").pop() || f.path;
    var dir = f.path.slice(0, f.path.length - name.length);
    return '<a class="file ' + (status || f.status || "") + '" title="' + esc(f.path) + '" href="https://github.com/' + L.repo + "/blob/HEAD/" + esc(f.path) + '" target="_blank" rel="noopener">' +
      (dir ? "<b>" + esc(dir) + "</b>" : "") + esc(name) + "</a>";
  }

  // ---------------------------------------------------------------- 描画

  function renderHero(log) {
    var today = L.todayJst();
    var d = log.days.find(function (x) { return x.date === today; });
    var latest = log.days[0];
    $("hero-date").textContent = "TODAY · " + today + " (" + weekdayJa(today) + ")";
    if (d) {
      var last = d.commits[0];
      $("hero-title").innerHTML = '今日は <span class="grad">' + d.commits.length + "件</span> つくりました";
      $("hero-sub").textContent = "最新: " + last.time + " " + last.title;
    } else if (latest) {
      $("hero-title").innerHTML = '今日はまだ <span class="grad">おやすみ中</span>';
      $("hero-sub").textContent = "最後の作業: " + latest.date + " " + latest.commits[0].time + " " + latest.commits[0].title;
    } else {
      $("hero-title").textContent = "まだ記録がありません";
    }
    countUp($("s-today"), d ? d.commits.length : 0);
    countUp($("s-created"), d ? d.created.length : 0);
    countUp($("s-streak"), log.totals.streak);
    countUp($("s-total"), log.totals.commits);
  }

  function renderHeat(log) {
    var days = L.series(log, 84);
    // 先頭を日曜にそろえる
    var pad = days[0].weekday;
    var html = "";
    for (var i = 0; i < pad; i++) html += '<i style="visibility:hidden"></i>';
    var today = L.todayJst();
    html += days.map(function (d) {
      var lv = d.count === 0 ? 0 : d.count <= 2 ? 1 : d.count <= 5 ? 2 : d.count <= 9 ? 3 : 4;
      return '<i data-l="' + lv + '"' + (d.date === today ? ' class="today"' : "") + ' title="' + d.date + "：" + d.count + '件"></i>';
    }).join("");
    $("heat").innerHTML = html;
    $("heat-from").textContent = days[0].date.slice(5).replace("-", "/");
  }

  function renderBars(log) {
    var k = log.totals.kinds || {};
    var max = Math.max.apply(null, KIND_ORDER.map(function (x) { return k[x] || 0; }).concat(1));
    $("bars").innerHTML = KIND_ORDER.map(function (x) {
      return '<div class="bar k-' + x + '"><span>' + esc(log.kinds[x] || x) + '</span><div class="track"><div class="fill" data-w="' + ((k[x] || 0) / max * 100) + '"></div></div><span class="n">' + (k[x] || 0) + "</span></div>";
    }).join("");
    $("kinds-total").textContent = log.totals.created + " files / +" + log.totals.add.toLocaleString() + " lines";
    requestAnimationFrame(function () {
      document.querySelectorAll(".bar .fill").forEach(function (el) { el.style.width = el.dataset.w + "%"; });
    });
  }

  function renderTasks(tasks) {
    if (!tasks) {
      $("tasks").innerHTML = '<div class="empty">tasks.json を読み込めませんでした</div>';
      return;
    }
    var total = 0;
    var done = 0;
    $("tasks").innerHTML = tasks.groups.map(function (g) {
      var gd = g.tasks.filter(function (t) { return t.status === "done" || t.status === "auto"; }).length;
      total += g.tasks.length;
      done += gd;
      return '<div class="tgroup"><h3><span>' + esc(g.icon || "") + "</span>" + esc(g.title) + '<span class="prog">' + gd + "/" + g.tasks.length + "</span></h3><ul>" +
        g.tasks.map(function (t) {
          return '<li class="' + esc(t.status) + '"><span class="st st-' + esc(t.status) + '">' + (STATUS[t.status] || esc(t.status)) + '</span><span class="t">' + esc(t.title) + "</span></li>";
        }).join("") + "</ul></div>";
    }).join("");
    $("tasks-count").textContent = done + " / " + total + " 完了・稼働中";
  }

  var currentFilter = "all";
  function renderTimeline(log) {
    var seen = store(SEEN_KEY);
    var today = L.todayJst();
    var html = log.days.map(function (d) {
      var commits = d.commits.filter(function (c) { return currentFilter === "all" || c.kind === currentFilter; });
      if (!commits.length) return "";
      var fresh = seen && d.commits.some(function (c) { return c.time && d.date + c.time > seen; });
      return '<article class="day' + (d.date === today ? " is-today" : "") + '" id="' + d.date + '">' +
        '<div class="day-head"><h3>' + d.date + " (" + weekdayJa(d.date) + ")</h3>" +
        '<span class="meta">' + d.commits.length + ' commits · <span class="add">+' + d.add + '</span> <span class="del">−' + d.del + "</span></span>" +
        (fresh ? '<span class="new-badge">NEW</span>' : "") + "</div>" +
        (d.created.length && currentFilter === "all"
          ? '<div class="created-row"><span class="label">つくったファイル ' + d.created.length + '</span><div class="files">' + d.created.map(function (f) { return fileChip(f, "A"); }).join("") + "</div></div>"
          : "") +
        commits.map(function (c) {
          return '<div class="commit k-' + c.kind + '"><div class="commit-top"><span class="time">' + esc(c.time) + '</span><span class="title">' + esc(c.title) + '</span><span class="kind">' + esc(log.kinds[c.kind] || c.kind) + "</span></div>" +
            '<details><summary>' + c.files.length + " files · " + esc(c.hash) + " · " + esc(c.branch) + "</summary>" +
            (c.body ? '<div class="body">' + esc(c.body) + "</div>" : "") +
            '<div class="files">' + c.files.map(function (f) { return fileChip(f); }).join("") + "</div></details></div>";
        }).join("") + "</article>";
    }).join("");
    $("timeline").innerHTML = html || '<div class="empty">この種類の作業はまだありません</div>';
    $("tl-count").textContent = log.totals.days + " days";
  }

  function renderFilters(log) {
    var opts = [["all", "すべて"]].concat(KIND_ORDER.filter(function (k) { return (log.totals.kinds || {})[k]; }).map(function (k) { return [k, log.kinds[k]]; }));
    $("filters").innerHTML = opts.map(function (o) {
      return '<button class="chip" type="button" data-k="' + o[0] + '" aria-pressed="' + (o[0] === currentFilter) + '">' + esc(o[1]) + "</button>";
    }).join("");
    $("filters").onclick = function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      currentFilter = b.dataset.k;
      renderFilters(log);
      renderTimeline(log);
    };
  }

  // ---------------------------------------------------------------- 通知

  function latestStamp(log) {
    var d = log.days[0];
    return d ? d.date + d.commits[0].time : "";
  }

  function newSince(log, seen) {
    var n = 0;
    log.days.forEach(function (d) {
      d.commits.forEach(function (c) { if (d.date + c.time > seen) n++; });
    });
    return n;
  }

  function notifyNew(log) {
    var seen = store(SEEN_KEY);
    var stamp = latestStamp(log);
    if (seen && stamp > seen) {
      var n = newSince(log, seen);
      var msg = "前回から新しい作業が " + n + " 件あります";
      toast("✨ " + msg);
      if (store(NOTIFY_KEY) === "on" && "Notification" in window && Notification.permission === "granted") {
        try { new Notification("Claude 作業ログ", { body: msg + "：" + log.days[0].commits[0].title, icon: "icon.svg", tag: "claude-log" }); } catch (e) { /* iOS など */ }
      }
    }
    // 少し見てから既読にする
    setTimeout(function () { if (stamp) store(SEEN_KEY, stamp); }, 4000);
  }

  function setupNotifyButton() {
    var btn = $("notify-btn");
    var on = store(NOTIFY_KEY) === "on" && "Notification" in window && Notification.permission === "granted";
    btn.setAttribute("aria-pressed", String(on));
    btn.textContent = on ? "🔔 通知オン" : "🔕 通知オフ";
    btn.onclick = function () {
      if (btn.getAttribute("aria-pressed") === "true") {
        store(NOTIFY_KEY, "off");
        return setupNotifyButton();
      }
      if (!("Notification" in window)) {
        toast("このブラウザは通知に対応していません。ホーム画面に追加するか、毎朝の GitHub Issue 通知を使ってください。");
        return;
      }
      Notification.requestPermission().then(function (p) {
        if (p === "granted") {
          store(NOTIFY_KEY, "on");
          toast("通知をオンにしました。開いている間、10分ごとに新しい作業を確認します。");
        } else {
          toast("通知が許可されませんでした");
        }
        setupNotifyButton();
      });
    };
  }

  // ---------------------------------------------------------------- 起動

  function refresh(first) {
    return L.load().then(function (log) {
      renderHero(log);
      if (first) {
        renderHeat(log);
        renderBars(log);
        renderFilters(log);
      }
      renderTimeline(log);
      notifyNew(log);
      var at = new Date(log.generatedAt);
      $("updated").textContent = "LIVE · " + at.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) + " 更新";
      $("foot").textContent = log.repo + " · " + log.totals.branches + " sessions · " + log.totals.touched + " files touched";
      if (first && location.hash) {
        var el = document.querySelector(location.hash);
        if (el) el.scrollIntoView();
      }
    }).catch(function (e) {
      $("hero-title").textContent = "ログを読み込めませんでした";
      $("hero-sub").textContent = e.message;
    });
  }

  setupNotifyButton();
  fetch("tasks.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(renderTasks).catch(function () { renderTasks(null); });
  refresh(true);
  setInterval(function () { if (!document.hidden) refresh(false); }, 10 * 60 * 1000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(false); });
})();
