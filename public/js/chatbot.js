(function () {
  const root = document.getElementById("ns-chatbot");
  if (!root) return;

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
  const sessionKey = "ns_chat_seen";
  const conversation = [];
  const quickReplies = ["Find notes", "Which courses are available?", "How do I share notes?", "Contact support"];
  let isOpen = false;
  let hasGreeted = false;
  let waitingForReply = false;
  let previousBodyOverflow = "";

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
    quickEl.replaceChildren();
    quickReplies.forEach(function (label) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ns-quick-chip";
      chip.textContent = label;
      chip.addEventListener("click", function () { sendMessage(label); });
      quickEl.appendChild(chip);
    });
  }

  async function sendMessage(text) {
    const message = text.trim();
    if (!message || waitingForReply) return;
    addMessage(message, "user");
    input.value = "";
    input.disabled = true;
    waitingForReply = true;
    showTyping();

    try {
      const captchaToken = await window.nsGetRecaptchaToken("chat");
      const response = await fetch("/api/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          message,
          history: conversation.slice(-6),
          "g-recaptcha-response": captchaToken,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "The assistant could not answer. Please try again.");
      }
      conversation.push({ role: "user", text: message }, { role: "model", text: result.reply });
      if (conversation.length > 12) conversation.splice(0, conversation.length - 12);
      hideTyping();
      addMessage(result.reply, "bot");
    } catch (error) {
      hideTyping();
      addMessage(error.message || "The assistant is temporarily unavailable.", "bot");
    } finally {
      waitingForReply = false;
      input.disabled = false;
      input.focus();
    }
  }

  function hideTeaser() {
    teaser.classList.add("hidden");
  }

  function openChat() {
    isOpen = true;
    root.classList.add("ns-chatbot-open");
    if (window.matchMedia("(max-width: 640px)").matches) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    panel.classList.remove("hidden");
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-label", "Close chat");
    iconOpen.classList.add("hidden");
    iconClose.classList.remove("hidden");
    badge.classList.add("hidden");
    hideTeaser();
    if (!hasGreeted) {
      hasGreeted = true;
      renderQuickReplies();
      addMessage("Hi! I’m the NoteSphere assistant. Ask about courses, available notes, or how to use the site.", "bot");
    }
    input.focus();
  }

  function closeChat() {
    isOpen = false;
    root.classList.remove("ns-chatbot-open");
    document.body.style.overflow = previousBodyOverflow;
    panel.classList.add("hidden");
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-label", "Open chat");
    iconOpen.classList.remove("hidden");
    iconClose.classList.add("hidden");
  }

  launcher.addEventListener("click", function () {
    isOpen ? closeChat() : openChat();
  });
  closeBtn.addEventListener("click", closeChat);
  teaserClose.addEventListener("click", function (event) {
    event.stopPropagation();
    hideTeaser();
    sessionStorage.setItem(sessionKey, "1");
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(input.value);
  });

  if (!sessionStorage.getItem(sessionKey)) {
    setTimeout(function () {
      if (!isOpen) teaser.classList.remove("hidden");
    }, 4000);
  }
})();
