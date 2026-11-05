/**
 * LINE Login 純前端示範（LIFF）。
 *
 * 這支程式沒有任何後端呼叫：登入、取 profile、取 ID token 都由 LIFF SDK 完成。
 * 對照組是本機 linelogin 的 FastAPI 版（那套需要 client_secret 換 token）。
 */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var show = function (el) { if (el) el.classList.remove("is-hidden"); };
  var hide = function (el) { if (el) el.classList.add("is-hidden"); };

  function pill(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = "pill " + kind;
  }

  function setText(id, value) {
    var el = $(id);
    if (el) el.textContent = value == null || value === "" ? "—" : String(value);
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatUnix(seconds) {
    if (typeof seconds !== "number") return "—";
    var d = new Date(seconds * 1000);
    return (
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds())
    );
  }

  function fail(title, message, hint) {
    setText("error-title", title);
    setText("error-message", message);
    setText("error-hint", hint);
    show($("card-error"));
  }

  function describe(error) {
    if (!error) return "未知錯誤";
    if (typeof error === "string") return error;
    var parts = [];
    if (error.code) parts.push(error.code);
    if (error.message) parts.push(error.message);
    return parts.length ? parts.join(" / ") : String(error);
  }

  var LABELS = {
    iss: "iss（發行者）",
    sub: "sub（userId）",
    aud: "aud（channel ID）",
    name: "name（顯示名稱）",
    given_name: "given_name",
    family_name: "family_name",
    picture: "picture（頭像）",
    email: "email",
    iat: "iat（簽發時間）",
    exp: "exp（到期時間）",
    nonce: "nonce",
    amr: "amr（登入方式）",
    auth_time: "auth_time"
  };

  var KNOWN = ["iss", "sub", "aud", "name", "given_name", "family_name",
    "picture", "email", "iat", "exp", "nonce", "amr", "auth_time"];

  function renderTokenRow(key, value) {
    var tr = document.createElement("tr");
    var tdKey = document.createElement("td");
    var tdValue = document.createElement("td");

    tdKey.textContent = LABELS[key] || key;

    if (key === "iat" || key === "exp" || key === "auth_time") {
      tdValue.textContent = formatUnix(value);
    } else if (key === "picture" && typeof value === "string") {
      tdValue.textContent = value.length > 56 ? value.slice(0, 56) + "…" : value;
    } else if (Array.isArray(value)) {
      tdValue.textContent = value.join(", ");
    } else {
      tdValue.textContent = value == null ? "（無）" : String(value);
    }

    tr.appendChild(tdKey);
    tr.appendChild(tdValue);
    return tr;
  }

  function renderToken(claims) {
    var body = $("token-body");
    if (!body || !claims) return;

    body.textContent = "";

    KNOWN.forEach(function (key) {
      var value = claims[key];
      if (key === "email" && value == null) {
        value = "（未取得，需在 Scope 勾 email）";
      }
      if (key === "picture" && value == null) {
        value = "（無）";
      }
      body.appendChild(renderTokenRow(key, value));
    });

    Object.keys(claims).forEach(function (key) {
      if (KNOWN.indexOf(key) !== -1) return;
      body.appendChild(renderTokenRow(key, claims[key]));
    });

    setText("issued-at", formatUnix(claims.iat));
  }

  function mountCopy(userId) {
    var button = $("btn-copy");
    if (!button) return;

    button.addEventListener("click", function () {
      var done = function () {
        var original = button.textContent;
        button.textContent = "已複製";
        button.disabled = true;
        setTimeout(function () {
          button.textContent = original;
          button.disabled = false;
        }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(userId).then(done, function () {
          fallback(userId, done);
        });
      } else {
        fallback(userId, done);
      }
    });
  }

  function fallback(text, done) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand("copy");
      done();
    } catch (error) {
      /* 複製失敗就讓使用者自己選 */
    }
    document.body.removeChild(area);
  }

  /** 把 LIFF 設定卡裡示範用的網址換成目前這一頁的實際位址。 */
  function fillExpectedEndpoint() {
    var path = location.pathname.replace(/index\.html$/, "");
    var endpoint = location.origin + path;
    setText("expected-endpoint", endpoint);
  }

  async function main() {
    setText("env-url", location.href);
    fillExpectedEndpoint();

    if (typeof liff === "undefined") {
      pill($("badge-env"), "SDK 載入失敗", "pill-bad");
      fail(
        "LIFF SDK 沒載入",
        "static.line-scdn.net 的 sdk.js 取不到。",
        "可能是網路或廣告封鎖器攔住了 CDN，重新整理再試一次。"
      );
      return;
    }

    setText("env-os", liff.getOS());
    setText("env-version", liff.getVersion());
    setText("env-in-client", liff.isInClient() ? "是（LIFF 瀏覽器）" : "否（外部瀏覽器）");

    var params = new URLSearchParams(location.search);
    var liffId = (params.get("liffId") || window.LIFF_ID || "").trim();

    if (!liffId) {
      setText("env-liff-id", "（未設定）");
      pill($("badge-liff"), "LIFF ID 未設定", "pill-bad");
      pill($("badge-env"), "未初始化", "pill-idle");
      show($("card-setup"));
      return;
    }

    setText("env-liff-id", liffId);
    pill($("badge-liff"), "LIFF ID 已設定", "pill-ok");

    try {
      await liff.init({ liffId: liffId });
    } catch (error) {
      pill($("badge-env"), "初始化失敗", "pill-bad");
      fail(
        "liff.init() 失敗",
        describe(error),
        "常見原因：Endpoint URL 與這一頁不是同一個前綴、LIFF ID 打錯、或 LIFF app 已刪除。"
      );
      return;
    }

    pill(
      $("badge-env"),
      liff.isInClient() ? "LIFF 瀏覽器" : "外部瀏覽器",
      "pill-ok"
    );
    setText("env-in-client", liff.isInClient() ? "是（LIFF 瀏覽器）" : "否（外部瀏覽器）");

    if (!liff.isLoggedIn()) {
      show($("card-login"));

      if (liff.isInClient()) {
        setText(
          "login-note",
          "在 LIFF 瀏覽器裡 init() 會自動完成登入；停在這裡通常表示授權被取消，重新整理再試一次。"
        );
      }

      $("btn-login").addEventListener("click", function () {
        liff.login({ redirectUri: location.origin + location.pathname + location.search });
      });
      return;
    }

    var profile = null;
    try {
      profile = await liff.getProfile();
    } catch (error) {
      fail(
        "拿不到 profile",
        describe(error),
        "請到 LINE Developers Console → LIFF 分頁 → Scope，勾選 profile。"
      );
    }

    var claims = null;
    try {
      claims = liff.getDecodedIDToken();
    } catch (error) {
      fail(
        "拿不到 ID token",
        describe(error),
        "請到 LINE Developers Console → LIFF 分頁 → Scope，勾選 openid。"
      );
    }

    if (profile) {
      setText("display-name", profile.displayName);
      setText("status-message", profile.statusMessage || "（沒有狀態訊息）");
      setText("user-id", profile.userId);

      var avatar = $("avatar");
      if (profile.pictureUrl) {
        avatar.src = profile.pictureUrl;
        avatar.alt = profile.displayName + " 的大頭貼";
      } else {
        hide(avatar);
      }

      mountCopy(profile.userId);
    }

    if (claims) {
      renderToken(claims);
    }

    $("btn-logout").addEventListener("click", function () {
      liff.logout();
      location.reload();
    });

    show($("card-profile"));
  }

  main().catch(function (error) {
    fail("未預期的錯誤", describe(error), "重新整理再試一次。");
  });
})();
