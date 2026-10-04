/**
 * NoteSphere — lightweight client-side navigation ("SPA-lite").
 *
 * Express keeps rendering every page as complete HTML, so refresh, direct
 * links, SEO and link previews all work exactly as before. This script only
 * intercepts clicks on internal links, fetches that URL, and swaps the
 * contents of <main id="app-main">. The navbar, footer and chatbot are never
 * re-rendered, so the chat conversation, theme and open modals survive.
 *
 * If anything goes wrong (network error, non-HTML response, a page without
 * #app-main) it falls back to a normal full page load, so a link can never
 * end up dead.
 *
 * Rules for page scripts (like the <script> at the bottom of home.ejs):
 *   - Wrap them in an IIFE. They run again on every visit, and top-level
 *     let/const/class would throw "already declared" the second time.
 *   - Timers should stop themselves when their element leaves the DOM:
 *       if (!document.body.contains(el)) { clearInterval(id); return; }
 *   - Bindings on elements inside <main> must be re-created on each visit
 *     (page scripts do this automatically). Anything bound to main-content
 *     elements from /js/script.js should use event delegation, or listen
 *     for the "ns:navigated" event below.
 *
 * Events dispatched on document:
 *   ns:before-swap  - just before the old page content is removed
 *   ns:navigated    - after the new content is in place (detail: { url })
 *                     good place for analytics page views, ad refreshes, etc.
 *
 * Opt a link out with data-no-spa (e.g. <a href="/export" data-no-spa>).
 */
(function () {
  "use strict";

  var MAIN_ID = "app-main";
  var main = document.getElementById(MAIN_ID);
  if (!main || !window.fetch || !window.history.pushState) return;

  window.NS = window.NS || {};
  history.scrollRestoration = "manual";

  // Paths that must always be full page loads (API, logout, files...).
  var SKIP_PATH = /^\/(api|logout|auth|uploads|download)(\/|$)/;
  var FILE_LIKE = /\.\w{2,5}$/; // /files/notes.pdf, /images/a.png, ...

  var currentController = null;
  var currentKey = location.pathname + location.search;
  var scrollTimer = null;

  /* ---------------------------------------
     Keep each history entry's scroll position
     so Back/Forward can restore it.
  --------------------------------------- */
  window.addEventListener("scroll", function () {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      try {
        history.replaceState(Object.assign({}, history.state, { scrollY: window.scrollY }), "");
      } catch (e) { /* replaceState can be rate-limited; safe to ignore */ }
    }, 120);
  }, { passive: true });

  /* ---------------------------------------
     Top loading bar
  --------------------------------------- */
  var bar = null;

  function startProgress() {
    if (!bar) {
      bar = document.createElement("div");
      bar.style.cssText =
        "position:fixed;top:0;left:0;height:3px;width:0;background:#0878E8;" +
        "z-index:9999;pointer-events:none;transition:width .3s ease,opacity .3s ease;";
      document.body.appendChild(bar);
    }
    bar.style.opacity = "1";
    bar.style.width = "0";
    requestAnimationFrame(function () { bar.style.width = "70%"; });
  }

  function endProgress() {
    if (!bar) return;
    bar.style.width = "100%";
    setTimeout(function () { bar.style.opacity = "0"; }, 200);
  }

  /* ---------------------------------------
     Swapping content
  --------------------------------------- */

  // Scripts inserted through innerHTML never execute, so recreate them.
  function activateScripts(root) {
    root.querySelectorAll("script").forEach(function (old) {
      var fresh = document.createElement("script");
      for (var i = 0; i < old.attributes.length; i++) {
        fresh.setAttribute(old.attributes[i].name, old.attributes[i].value);
      }
      fresh.textContent = old.textContent;
      old.parentNode.replaceChild(fresh, old);
    });
  }

  // Server renders aria-current from the URL; mirror that rule on the client.
  function updateActiveLinks() {
    var path = location.pathname;
    document.querySelectorAll("[data-nav-link], .nav-link, .mobile-nav-link").forEach(function (a) {
      var linkPath = new URL(a.getAttribute("href"), location.origin).pathname;
      var active = linkPath === "/"
        ? path === "/"
        : path === linkPath || path.indexOf(linkPath + "/") === 0;
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function swapContent(nextMain, doc) {
    document.dispatchEvent(new CustomEvent("ns:before-swap"));

    main.innerHTML = nextMain.innerHTML;

    if (doc.title) document.title = doc.title;
    var newDesc = doc.querySelector('meta[name="description"]');
    var curDesc = document.querySelector('meta[name="description"]');
    if (newDesc && curDesc) curDesc.setAttribute("content", newDesc.getAttribute("content"));

    activateScripts(main);
  }

  function afterSwap(url, scrollY) {
    clearTimeout(scrollTimer);
    updateActiveLinks();
    if (window.NS.initReveal) window.NS.initReveal(main);

    var hash = new URL(url, location.href).hash;
    var target = null;
    if (hash.length > 1) {
      try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch (e) { /* bad hash */ }
    }

    if (typeof scrollY === "number") window.scrollTo(0, scrollY);
    else if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);

    // Let screen readers know the page changed.
    main.setAttribute("tabindex", "-1");
    main.style.outline = "none";
    main.focus({ preventScroll: true });

    document.dispatchEvent(new CustomEvent("ns:navigated", { detail: { url: url } }));
  }

  /* ---------------------------------------
     Navigation
  --------------------------------------- */
  function navigate(href, opts) {
    opts = opts || {};

    if (currentController) currentController.abort(); // newest click wins
    var controller = new AbortController();
    currentController = controller;
    startProgress();

    return fetch(href, {
      credentials: "same-origin",
      headers: { "Accept": "text/html", "X-Requested-With": "ns-nav" },
      signal: controller.signal
    })
      .then(function (res) {
        var type = res.headers.get("content-type") || "";
        if (!res.ok || type.indexOf("text/html") === -1) throw new Error("fallback");
        return res.text().then(function (html) { return { html: html, url: res.url || href }; });
      })
      .then(function (result) {
        var doc = new DOMParser().parseFromString(result.html, "text/html");
        var nextMain = doc.getElementById(MAIN_ID);
        if (!nextMain) throw new Error("fallback"); // page doesn't use our layout

        if (opts.push) history.pushState({ scrollY: 0 }, "", result.url);
        currentKey = location.pathname + location.search;

        swapContent(nextMain, doc);
        afterSwap(result.url, opts.scrollY);
      })
      .catch(function (err) {
        if (err && err.name === "AbortError") return; // superseded by a newer click
        window.location.href = href;                  // graceful fallback
      })
      .then(function () {
        if (controller === currentController) endProgress();
      });
  }

  /* ---------------------------------------
     Intercept internal link clicks
  --------------------------------------- */
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // "open in new tab" etc.

    var a = e.target.closest("a[href]");
    if (!a) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download") || a.hasAttribute("data-no-spa")) return;

    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (SKIP_PATH.test(url.pathname) || FILE_LIKE.test(url.pathname)) return;

    var samePage = url.pathname === location.pathname && url.search === location.search;
    if (samePage) {
      if (url.hash) return; // in-page anchor: let the browser scroll
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    e.preventDefault();
    navigate(url.href, { push: true });
  });

  /* ---------------------------------------
     Back / Forward
  --------------------------------------- */
  window.addEventListener("popstate", function (e) {
    var key = location.pathname + location.search;
    if (key === currentKey) return; // only the #hash changed; browser handles it
    navigate(location.href, {
      push: false,
      scrollY: (e.state && typeof e.state.scrollY === "number") ? e.state.scrollY : 0
    });
  });
})();