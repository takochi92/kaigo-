// 全国の介護事業所検索（scripts/build.mjs が生成した data/*.json を読み込む）
(function () {
  var PAGE = 50;
  var prefSel = document.getElementById("pref");
  var citySel = document.getElementById("city");
  var q = document.getElementById("q");
  var catsBox = document.getElementById("cats");
  var status = document.getElementById("status");
  var results = document.getElementById("results");
  var more = document.getElementById("more");
  var nearBtn = document.getElementById("near");

  var areas = null;
  var data = null; // 選択中の都道府県データ
  var activeCat = "";
  var hits = [];
  var shown = 0;
  var here = null; // 現在地 [lat, lng]

  var params = new URLSearchParams(location.search);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function getJson(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function distanceKm(a, b) {
    var R = 6371, toRad = Math.PI / 180;
    var dLat = (b[0] - a[0]) * toRad, dLng = (b[1] - a[1]) * toRad;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a[0] * toRad) * Math.cos(b[0] * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function renderCats() {
    var html = '<button class="chip" type="button" data-cat="" aria-pressed="' + (activeCat === "") + '">すべて</button>';
    areas.categories.forEach(function (c, i) {
      html += '<button class="chip" type="button" data-cat="' + i + '" aria-pressed="' + (activeCat === String(i)) + '">' + esc(c.label) + "</button>";
    });
    catsBox.innerHTML = html;
  }

  function card(row) {
    var f = {};
    data.fields.forEach(function (k, i) { f[k] = row[i]; });
    var city = data.cities[f.city];
    var rows = "<dt>住所</dt><dd>" + esc(f.address) + "</dd>";
    if (f.tel) rows += "<dt>電話</dt><dd>" + esc(f.tel) + "</dd>";
    if (f.fax) rows += "<dt>FAX</dt><dd>" + esc(f.fax) + "</dd>";
    if (f.corp) rows += "<dt>法人</dt><dd>" + esc(f.corp) + "</dd>";
    if (f.capacity) rows += "<dt>定員</dt><dd>" + esc(f.capacity) + "</dd>";
    if (f.depts) rows += "<dt>診療科</dt><dd>" + esc(f.depts) + "</dd>";
    if (here && f.lat && f.lng) rows += "<dt>距離</dt><dd>約" + distanceKm(here, [f.lat, f.lng]).toFixed(1) + "km</dd>";

    var btns = "";
    if (f.tel) btns += '<a class="btn tel" href="tel:' + esc(f.tel.replace(/[^0-9+]/g, "")) + '">電話する</a>';
    var mq = f.lat && f.lng ? f.lat + "," + f.lng : f.address;
    btns += '<a class="btn secondary" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mq) + '">地図</a>';
    if (f.url) btns += '<a class="btn secondary" target="_blank" rel="noopener nofollow" href="' + esc(f.url) + '">ホームページ</a>';

    return '<article class="card facility"><div>' +
      f.services.map(function (s) { return '<span class="type">' + esc(data.services[s]) + "</span>"; }).join(" ") +
      "</div><h3>" + esc(f.name) + '</h3><p class="small muted" style="margin:0">' + esc(data.pref + (city ? city.name : "")) + "</p>" +
      "<dl>" + rows + '</dl><div class="btn-row">' + btns + "</div></article>";
  }

  function showMore() {
    var next = hits.slice(shown, shown + PAGE);
    results.insertAdjacentHTML("beforeend", next.map(card).join(""));
    shown += next.length;
    more.hidden = shown >= hits.length;
  }

  function search() {
    results.innerHTML = "";
    shown = 0;
    if (!data) { more.hidden = true; return; }
    var cityIdx = citySel.value === "" ? -1 : Number(citySel.value);
    var cat = activeCat === "" ? -1 : Number(activeCat);
    var words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var F = {};
    data.fields.forEach(function (k, i) { F[k] = i; });

    hits = data.rows.filter(function (r) {
      if (cityIdx !== -1 && r[F.city] !== cityIdx) return false;
      if (cat !== -1 && r[F.cats].indexOf(cat) === -1) return false;
      if (!words.length) return true;
      var hay = (r[F.name] + " " + r[F.corp] + " " + r[F.address] + " " +
        r[F.services].map(function (s) { return data.services[s]; }).join(" ") + " " + (r[F.depts] || "")).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    });
    if (here) {
      hits = hits.map(function (r) {
        return { r: r, d: r[F.lat] && r[F.lng] ? distanceKm(here, [r[F.lat], r[F.lng]]) : 1e9 };
      }).sort(function (a, b) { return a.d - b.d; }).map(function (x) { return x.r; });
    }
    status.textContent = data.pref + "：" + hits.length.toLocaleString() + "件見つかりました" +
      (here ? "（現在地から近い順）" : "") + "　データ取得日 " + data.builtAt;
    showMore();
    if (!hits.length) results.innerHTML = '<p class="muted">条件に合う事業所が見つかりませんでした。条件を変えてお試しください。</p>';
    updateUrl();
  }

  function updateUrl() {
    var p = new URLSearchParams();
    if (prefSel.value) p.set("pref", prefSel.value);
    if (data && citySel.value !== "") p.set("city", data.cities[Number(citySel.value)].slug);
    if (activeCat !== "") p.set("cat", areas.categories[Number(activeCat)].id);
    if (q.value.trim()) p.set("q", q.value.trim());
    var s = p.toString();
    history.replaceState(null, "", location.pathname + (s ? "?" + s : ""));
  }

  function loadPref(code, citySlug) {
    data = null;
    citySel.innerHTML = '<option value="">市区町村（すべて）</option>';
    citySel.disabled = true;
    if (!code) { status.textContent = "都道府県を選んでください。"; search(); return; }
    status.textContent = "読み込み中…";
    getJson("data/pref/" + code + ".json").then(function (d) {
      data = d;
      d.cities.forEach(function (c, i) {
        var opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = c.name;
        if (c.slug === citySlug) opt.selected = true;
        citySel.appendChild(opt);
      });
      citySel.disabled = false;
      search();
    }).catch(function () {
      status.textContent = "データを読み込めませんでした。時間をおいてもう一度お試しください。";
    });
  }

  var timer;
  q.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(search, 200); });
  citySel.addEventListener("change", search);
  prefSel.addEventListener("change", function () { loadPref(prefSel.value); });
  more.addEventListener("click", showMore);
  catsBox.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-cat]");
    if (!b) return;
    activeCat = b.getAttribute("data-cat");
    renderCats();
    search();
  });
  nearBtn.addEventListener("click", function () {
    if (!navigator.geolocation) { status.textContent = "この端末では現在地を使えません。"; return; }
    status.textContent = "現在地を確認しています…";
    navigator.geolocation.getCurrentPosition(function (pos) {
      here = [pos.coords.latitude, pos.coords.longitude];
      nearBtn.setAttribute("aria-pressed", "true");
      if (data) search(); else status.textContent = "現在地を取得しました。都道府県を選んでください。";
    }, function () {
      status.textContent = "現在地を取得できませんでした。端末の位置情報の設定をご確認ください。";
    }, { timeout: 10000 });
  });

  getJson("data/areas.json").then(function (a) {
    areas = a;
    a.prefs.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.code;
      opt.textContent = p.name + "（" + p.count.toLocaleString() + "）";
      prefSel.appendChild(opt);
    });
    var cat = params.get("cat");
    if (cat !== null) {
      var ci = a.categories.findIndex(function (c) { return c.id === cat; });
      if (ci === -1 && /^\d+$/.test(cat) && a.categories[Number(cat)]) ci = Number(cat);
      if (ci !== -1) activeCat = String(ci);
    }
    renderCats();
    q.value = params.get("q") || "";
    var pref = params.get("pref");
    if (pref && a.prefs.some(function (p) { return p.code === pref; })) {
      prefSel.value = pref;
      loadPref(pref, params.get("city"));
    }
  }).catch(function () {
    status.textContent = "事業所データがまだ準備されていません（サイトのビルド時に国のデータを取り込みます）。";
    prefSel.disabled = true;
    q.disabled = true;
  });
})();
