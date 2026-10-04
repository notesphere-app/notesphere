//validation of comments
//validate comment function
const Filter = require("bad-words");
const sanitizeHtml = require("sanitize-html");
const filter = new Filter({ placeHolder: "*" });
/* ---------------- ABUSIVE WORDS ---------------- */

// English + Hinglish + Hindi + Urdu slang
filter.addWords(
  "mc",
  "bc",
  "madarchod",
  "bhenchod",
  "chutiya",
  "chut",
  "lund",
  "gaand",
  "randi",
  "bhosdi",
  "harami",
  "kamina",
  "saala",
  "kutti",
  "kutta",
  "fuck",
  "fucker",
  "fucking",
  "asshole",
  "bitch",
  "slut",
  "whore",
  "dick",
  "pussy",
  "cock",
  "cunt",
  "bastard",
  "gandu",
  "lodu",
  "lavde",
  "chodu",
  "jhant",
  "jhatu",
  "gaandmar",
  "chodna",
  "chodu",
);

/* ---------------- ADULT KEYWORDS ---------------- */

const adultKeywords = [
  // English
  "porn",
  "sex",
  "xxx",
  "nude",
  "naked",
  "boobs",
  "breast",
  "vagina",
  "penis",
  "anal",
  "blowjob",
  "handjob",
  "hardcore",
  "fetish",
  "orgasm",
  "escort",

  // Hinglish / Hindi
  "chut",
  "lund",
  "gaand",
  "sambhog",
  "nagna",
  "ashleel",
  "yaun",
  "balatkar",
  "sexvideo",
  "sexchat",

  // Urdu / Arabic common adult terms
  "jism",
  "farj",
  "ham-bistar",

  // Leetspeak / variations
  "s3x",
  "p0rn",
  "n00d",
  "fuk",
  "phuck",
];

/* ---------------- ADULT DOMAINS & TLDs ---------------- */

const adultDomains = [
  "pornhub",
  "xvideos",
  "xnxx",
  "redtube",
  "youporn",
  "brazzers",
  "onlyfans",
  "fansly",
  "chaturbate",
  "stripchat",
  "playboy",
  "adultfriendfinder",
];

const blockedTLDs = [".xxx", ".sex", ".porn", ".adult", ".cam"];

/* ---------------- EMOJI BASED FILTER ---------------- */

const sexualEmojis = ["🍆", "🍑", "🍒", "💦", "👅", "😈", "🔥"];

/* ---------------- HELPERS ---------------- */

const normalizeText = (text) => {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/[^\w\s]/gi, " ") // symbols
    .replace(/\s+/g, " ")
    .toLowerCase();
};

const containsSplitWords = (text, word) => {
  const pattern = word.split("").join("\\s*");
  return new RegExp(pattern, "i").test(text);
};

/* ---------------- MAIN VALIDATOR ---------------- */

module.exports.validateComment = (text) => {
  // 1. Sanitize HTML
  let cleanText = sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

  if (!cleanText || cleanText.length < 3) {
    return { valid: false, reason: "too-short" };
  }

  if (cleanText.length > 1000) {
    return { valid: false, reason: "too-long" };
  }

  const normalized = normalizeText(cleanText);

  // 2. Profanity filter
  if (filter.isProfane(normalized)) {
    return { valid: false, reason: "abusive" };
  }

  // 3. Adult keywords & split-words
  for (let word of adultKeywords) {
    if (normalized.includes(word) || containsSplitWords(normalized, word)) {
      return { valid: false, reason: "adult-content" };
    }
  }

  // 4. Emoji sexual signals
  for (let emoji of sexualEmojis) {
    if (cleanText.includes(emoji)) {
      return { valid: false, reason: "adult-emoji" };
    }
  }

  // domain logic
  const domainRegex =
    /\b([a-z0-9-]+\.)+(com|net|org|in|xyz|site|online|xxx|porn|adult)\b/gi;

  // 4️ Plain domain detection (xnxx.com, pornhub.com)
  const domainMatches = cleanText.match(domainRegex) || [];

  for (let domainText of domainMatches) {
    const lowerDomain = domainText.toLowerCase();

    for (let domain of adultDomains) {
      if (lowerDomain.includes(domain)) {
        return { valid: false, reason: "adult-link" };
      }
    }
  }
  // 5. URL detection
  const urlRegex = /(https?:\/\/|www\.)[^\s]+/gi;
  const urls = cleanText.match(urlRegex) || [];

  if (urls.length > 2) {
    return { valid: false, reason: "too-many-links" };
  }

  for (let url of urls) {
    const lowerUrl = url.toLowerCase();

    // Adult domains
    for (let domain of adultDomains) {
      if (lowerUrl.includes(domain)) {
        return { valid: false, reason: "adult-link" };
      }
    }

    // Block adult TLDs
    for (let tld of blockedTLDs) {
      if (lowerUrl.endsWith(tld)) {
        return { valid: false, reason: "adult-tld" };
      }
    }

    // Block raw IP URLs
    if (/https?:\/\/\d+\.\d+\.\d+\.\d+/.test(lowerUrl)) {
      return { valid: false, reason: "ip-link" };
    }
  }

  // 6. Repeated characters abuse (spaaaam / fuuuck)
  if (/(.)\1{4,}/.test(normalized)) {
    return { valid: false, reason: "spam-pattern" };
  }

  return { valid: true, text: cleanText };
};
