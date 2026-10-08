// AI質問ページ
// /api/chat（サーバー側で Claude API を呼び出す）に接続できればAIが回答し、
// 接続できない場合（静的ホスティングのみ・APIキー未設定など）は FAQ から近い回答を探して表示します。
(function () {
  var log = document.getElementById("chat-log");
  var form = document.getElementById("chat-form");
  var input = document.getElementById("chat-input");
  var send = document.getElementById("chat-send");
  var modeNote = document.getElementById("chat-mode");
  var history = [];
  var offline = false;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 回答テキストを安全にHTML化（エスケープ → 太字・リンクだけ変換）
  function format(text) {
    return esc(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/^#{1,4}\s*(.+)$/gm, "<strong>$1</strong>")
      .replace(/(https?:\/\/[^\s<）)」]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }

  function add(role, text) {
    var div = document.createElement("div");
    div.className = "msg " + role;
    if (role === "bot") div.innerHTML = format(text);
    else div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function faqAnswer(text) {
    var faq = window.FAQ || [];
    var t = text.toLowerCase();
    var scored = faq.map(function (f) {
      var score = 0;
      (f.keywords || []).forEach(function (k) { if (t.indexOf(k.toLowerCase()) !== -1) score += 2; });
      // 質問文との2文字単位の一致もゆるく加点
      for (var i = 0; i < f.q.length - 1; i++) {
        if (t.indexOf(f.q.substr(i, 2)) !== -1) score += 0.2;
      }
      return { f: f, score: score };
    }).filter(function (s) { return s.score >= 2; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 2);

    if (!scored.length) {
      return "うまく該当する情報が見つかりませんでした。\n\n" +
        "迷ったときは、お住まいの地域の「地域包括支援センター」か市区町村の介護保険窓口に相談してください（相談無料）。\n" +
        "連絡先は「相談先・施設一覧」ページで探せます。";
    }
    return scored.map(function (s) {
      return "**Q. " + s.f.q + "**\n" + s.f.a;
    }).join("\n\n") + "\n\n（よくある質問から近い回答を表示しています）";
  }

  function setOffline() {
    offline = true;
    modeNote.textContent = "※ 現在はAIに接続されていないため、「よくある質問」から近い回答を表示しています。";
  }

  function ask(text) {
    add("user", text);
    input.value = "";

    if (offline) {
      add("bot", faqAnswer(text));
      return;
    }

    history.push({ role: "user", content: text });
    var pending = add("bot", "考えています…");
    send.disabled = true;

    fetch("api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-20) })
    })
      .then(function (res) {
        if (!res.ok) {
          var err = new Error("HTTP " + res.status);
          err.status = res.status;
          throw err;
        }
        return res.json();
      })
      .then(function (data) {
        var reply = data.reply || "回答を取得できませんでした。";
        pending.innerHTML = format(reply);
        history.push({ role: "assistant", content: reply });
      })
      .catch(function (err) {
        history.pop();
        // サーバーがない・未設定（404/405/501/503）や通信失敗はFAQモードへ切り替え
        if (!err.status || [404, 405, 501, 503].indexOf(err.status) !== -1) {
          setOffline();
          pending.innerHTML = format(faqAnswer(text));
        } else if (err.status === 429) {
          pending.innerHTML = format("ただいま混み合っています。少し時間をおいてからもう一度お試しください。");
        } else {
          pending.innerHTML = format("エラーが発生しました。時間をおいてもう一度お試しください。\n\n" + faqAnswer(text));
        }
      })
      .then(function () {
        send.disabled = false;
        log.scrollTop = log.scrollHeight;
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (text) ask(text);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) form.requestSubmit();
  });
  document.getElementById("suggest").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) ask(b.textContent);
  });

  if (location.protocol === "file:") setOffline();
  add("bot", "こんにちは。介護の制度・手続き・施設選び・介護事業の開業など、なんでも質問してください。\n例：「母が要介護1になりました。どんなサービスが使えますか？」");
})();
