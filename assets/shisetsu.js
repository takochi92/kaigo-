// 相談先・施設一覧：絞り込み・検索・電話/地図リンク
(function () {
  var types = window.FACILITY_TYPES || {};
  var data = window.FACILITIES || [];
  var list = document.getElementById("list");
  var chips = document.getElementById("chips");
  var q = document.getElementById("q");
  var count = document.getElementById("count");

  var params = new URLSearchParams(location.search);
  var activeType = params.get("type") || "";
  if (activeType && !types[activeType]) activeType = "";
  q.value = params.get("q") || "";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderChips() {
    var used = {};
    data.forEach(function (f) { used[f.type] = (used[f.type] || 0) + 1; });
    var html = '<button class="chip" type="button" data-type="" aria-pressed="' + (activeType === "") + '">すべて</button>';
    Object.keys(types).forEach(function (key) {
      if (!used[key]) return;
      html += '<button class="chip" type="button" data-type="' + key + '" aria-pressed="' + (activeType === key) + '">' +
        esc(types[key]) + "（" + used[key] + "）</button>";
    });
    chips.innerHTML = html;
  }

  function card(f) {
    var telHref = f.tel ? "tel:" + f.tel.replace(/[^0-9#+]/g, "").replace("#", "%23") : "";
    var rows = "";
    if (f.area) rows += "<dt>地区</dt><dd>" + esc(f.area) + "</dd>";
    if (f.address) rows += "<dt>住所</dt><dd>" + esc(f.address) + "</dd>";
    if (f.tel) rows += "<dt>電話</dt><dd>" + esc(f.tel) + "</dd>";
    if (f.hours) rows += "<dt>受付</dt><dd>" + esc(f.hours) + "</dd>";
    if (f.note) rows += "<dt>メモ</dt><dd>" + esc(f.note) + "</dd>";

    var buttons = "";
    if (f.tel && !f.sample) buttons += '<a class="btn tel" href="' + esc(telHref) + '">電話する</a>';
    if (f.address && !f.sample) {
      buttons += '<a class="btn secondary" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(f.address) + '">地図</a>';
    }
    if (f.url) buttons += '<a class="btn secondary" target="_blank" rel="noopener" href="' + esc(f.url) + '">ホームページ</a>';

    return '<article class="card facility">' +
      '<div><span class="type">' + esc(types[f.type] || f.type) + "</span>" +
      (f.sample ? '<span class="type sample-badge">サンプル（架空）</span>' : "") + "</div>" +
      "<h3>" + esc(f.name) + "</h3>" +
      (rows ? "<dl>" + rows + "</dl>" : "") +
      (buttons ? '<div class="btn-row">' + buttons + "</div>" : "") +
      "</article>";
  }

  function render() {
    var words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var hits = data.filter(function (f) {
      if (activeType && f.type !== activeType) return false;
      if (!words.length) return true;
      var hay = [f.name, f.area, f.address, f.note, types[f.type]].join(" ").toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    });
    list.innerHTML = hits.length ? hits.map(card).join("") :
      '<p class="muted">該当する相談窓口が見つかりませんでした。キーワードを変えるか、<a href="https://www.kaigokensaku.mhlw.go.jp/" target="_blank" rel="noopener">介護サービス情報公表システム</a>で検索してください。</p>';
    count.textContent = hits.length + "件を表示しています";

    var next = new URLSearchParams();
    if (activeType) next.set("type", activeType);
    if (q.value.trim()) next.set("q", q.value.trim());
    var qs = next.toString();
    history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
  }

  chips.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-type]");
    if (!btn) return;
    activeType = btn.getAttribute("data-type");
    renderChips();
    render();
  });
  q.addEventListener("input", render);

  renderChips();
  render();
})();
