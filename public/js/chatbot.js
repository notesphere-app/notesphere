/**
 * NoteSphere Assistant — chat widget behavior.
 *
 * This file only talks to the DOM markup in includes/chatbot.ejs.
 * Right now `getBotReply()` is a small rule-based dummy — no network
 * call, no real AI. When the real chat backend exists, replace just
 * that one function with a fetch() to your endpoint (see the TODO
 * inside it) and nothing else here needs to change.
 */

(function () {
  const root = document.getElementById("ns-chatbot");
  if (!root) return; // widget not on this page

  const launcher = document.getElementById("ns-chat-launcher");
  const iconOpen = document.getElementById("ns-chat-icon-open");
  const iconClose = document.getElementById("ns-chat-icon-close");
  const badge = document.getElementById("ns-chat-badge");
  const panel = document.getElementById("ns-chat-panel");
  const closeBtn = document.getElementById("ns-chat-close");
  const teaser = document.getElementById("ns-chat-teaser");
  const teaserClose = document.getElementById("ns-chat-teaser-close");
  const messagesEl = document.getElementById("ns-chat-messages");
  const quickEl = document.getElementById("ns-chat-quick");
  const form = document.getElementById("ns-chat-form");
  const input = document.getElementById("ns-chat-input");

  const SESSION_KEY = "ns_chat_seen";
  let isOpen = false;
  let hasGreeted = false;

  const quickReplies = [
    "Browse notes",
    "How does publishing work?",
    "Pricing",
    "Talk to a human",
  ];

  /* Dummy rule-based responses, checked in order — first keyword match
     wins. TODO: once a real backend exists, replace the body of
     getBotReply with something like:
       return fetch('/api/chat', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ message: userText }),
       }).then(res => res.json()).then(data => data.reply);
     and make the caller (handleSend) await it. */
  const rules = [
    { keywords: ["hello", "hi", "hey"], reply: "Hey! I'm the NoteSphere assistant (demo mode for now). Ask me about notes, courses, or publishing." },
    { keywords: ["note", "notes"], reply: "You can browse notes by course and year from the homepage, or head straight to the Notes page from the navbar." },
    { keywords: ["course", "b.tech", "btech", "b.a", "b.sc", "b.com", "bba"], reply: "Notes are organized by course — B.Tech, B.A., B.Sc., B.Com. and BBA — then by year within each course." },
    { keywords: ["publish", "blog"], reply: "Any note can be published as a blog post in one click, right from the note editor — no separate blog tool needed." },
    { keywords: ["price", "pricing", "cost", "free"], reply: "NoteSphere is free for your first 100 notes. Paid plans are on the way for larger note collections." },
    { keywords: ["login", "log in", "sign up", "signup", "account"], reply: "Use the Login or Get Started button in the top navigation — both open right here without leaving the page." },
    { keywords: ["human", "support", "contact", "help"], reply: "This assistant is a demo right now, so for real support use the Contact page — a human will get back to you there." },
  ];

  function getBotReply(userText) {
    const lower = userText.toLowerCase();
    const match = rules.find(function (rule) {
      return rule.keywords.some(function (kw) { return lower.indexOf(kw) !== -1; });
    });
    return match ? match.reply : "I'm just a demo for now, so I don't have a real answer for that yet — try asking about notes, courses, publishing, or pricing.";
  }

  /* ---------------------------------------
     Rendering helpers
  --------------------------------------- */
  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(text, sender) {
    const bubble = document.createElement("div");
    bubble.className = "ns-msg " + sender;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    scrollToBottom();
  }

  function showTyping() {
    const typing = document.createElement("div");
    typing.className = "ns-msg bot ns-typing";
    typing.id = "ns-chat-typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(typing);
    scrollToBottom();
  }

  function hideTyping() {
    const typing = document.getElementById("ns-chat-typing");
    if (typing) typing.remove();
  }

  function renderQuickReplies() {
    quickEl.innerHTML = "";
    quickReplies.forEach(function (label) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ns-quick-chip";
      chip.textContent = label;
      chip.addEventListener("click", function () { sendMessage(label); });
      quickEl.appendChild(chip);
    });
  }

  function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    addMessage(trimmed, "user");
    input.value = "";
    showTyping();

    // Small delay so the typing indicator feels real; swap for an
    // awaited fetch() once getBotReply talks to a real backend.
    setTimeout(function () {
      hideTyping();
      addMessage(getBotReply(trimmed), "bot");
    }, 700 + Math.random() * 500);
  }

  /* ---------------------------------------
     Open / close
  --------------------------------------- */
  function openChat() {
    isOpen = true;
    panel.classList.remove("hidden");
    panel.style.display = "flex";
    iconOpen.classList.add("hidden");
    iconClose.classList.remove("hidden");
    badge.classList.add("hidden");
    hideTeaser();

    if (!hasGreeted) {
      hasGreeted = true;
      renderQuickReplies();
      showTyping();
      setTimeout(function () {
        hideTyping();
        addMessage("Hi! I'm the NoteSphere assistant (demo). Ask me anything about notes, courses, or publishing.", "bot");
      }, 500);
    }

    input.focus();
  }

  function closeChat() {
    isOpen = false;
    panel.classList.add("hidden");
    iconOpen.classList.remove("hidden");
    iconClose.classList.add("hidden");
  }

  function hideTeaser() {
    teaser.classList.add("hidden");
  }

  launcher.addEventListener("click", function () {
    isOpen ? closeChat() : openChat();
  });
  closeBtn.addEventListener("click", closeChat);

  teaserClose.addEventListener("click", function (e) {
    e.stopPropagation();
    hideTeaser();
    sessionStorage.setItem(SESSION_KEY, "1");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    sendMessage(input.value);
  });

  /* ---------------------------------------
     Teaser bubble — once per browser session,
     a few seconds after the page loads.
  --------------------------------------- */
  if (!sessionStorage.getItem(SESSION_KEY)) {
    setTimeout(function () {
      if (!isOpen) teaser.classList.remove("hidden");
    }, 4000);
  }
})();