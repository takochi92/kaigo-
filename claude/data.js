// Claude 作業ログの読み込み（ダッシュボードとウィジェットで共通）
// 毎日の GitHub Actions が claude-log ブランチに書き出す最新の log.json と、
// サイト公開時に一緒に置かれた log.json の両方を読み、新しいほうを使う。
(function () {
  var REPO = "takochi92/kaigo-";
  var LIVE = "https://raw.githubusercontent.com/" + REPO + "/claude-log/log.json";
  var LOCAL = "log.json";

  function get(url) {
    return fetch(url + "?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function todayJst() {
    return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  }

  window.ClaudeLog = {
    repo: REPO,
    todayJst: todayJst,
    load: function () {
      return Promise.all([get(LIVE), get(LOCAL)]).then(function (res) {
        var list = res.filter(Boolean);
        if (!list.length) throw new Error("log.json を読み込めませんでした");
        list.sort(function (a, b) { return a.generatedAt < b.generatedAt ? 1 : -1; });
        return list[0];
      });
    },
    // 直近 n 日分の日付ごとのコミット数（古い順）
    series: function (log, n) {
      var map = {};
      log.days.forEach(function (d) { map[d.date] = d.commits.length; });
      var out = [];
      var base = new Date(todayJst() + "T00:00:00Z");
      for (var i = n - 1; i >= 0; i--) {
        var d = new Date(base);
        d.setUTCDate(d.getUTCDate() - i);
        var key = d.toISOString().slice(0, 10);
        out.push({ date: key, count: map[key] || 0, weekday: d.getUTCDay() });
      }
      return out;
    },
    esc: function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
  };
})();
