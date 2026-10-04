const translations = {
  en: {
    title: "Recipe Finder",
    subtitle: "Find delicious recipes from around the world",
    dataFrom: "Data from",
    searchPlaceholder: "Search for meals or keywords",
    searchBtn: "Search",
    noMeals: "No meals found. Try another search term!",
    backBtn: "Back to recipes",
    searching: (term) => `Searching for "${term}"...`,
    resultsFor: (term) => `Search results for "${term}":`,
    notFoundFor: (term) => `No recipes found for "${term}". Try another search term!`,
    pleaseEnter: "Please enter a search term",
    genericError: "Something went wrong. Please try again later.",
    detailsError: "Could not load recipe details. Please try again later.",
    instructions: "Instructions",
    ingredients: "Ingredients",
    watchVideo: "Watch Video",
    uncategorized: "Uncategorized",
  },
  ar: {
    title: "بحّاثة الوصفات",
    subtitle: "اكتشف وصفات شهية من كل أنحاء العالم",
    dataFrom: "البيانات من",
    searchPlaceholder: "ابحث عن أكلة أو كلمة مفتاحية",
    searchBtn: "بحث",
    noMeals: "لا توجد وصفات. جرب كلمة بحث أخرى!",
    backBtn: "رجوع للوصفات",
    searching: (term) => `جاري البحث عن "${term}"...`,
    resultsFor: (term) => `نتائج البحث عن "${term}":`,
    notFoundFor: (term) => `لا توجد وصفات لـ "${term}". جرب كلمة أخرى!`,
    pleaseEnter: "من فضلك اكتب كلمة للبحث",
    genericError: "حصل خطأ ما. حاول مرة أخرى لاحقاً.",
    detailsError: "تعذر تحميل تفاصيل الوصفة. حاول مرة أخرى لاحقاً.",
    instructions: "طريقة التحضير",
    ingredients: "المكونات",
    watchVideo: "شاهد الفيديو",
    uncategorized: "غير مصنف",
  },
};

// localStorage can throw on iOS Safari (e.g. "Block All Cookies"), so wrap it
function storageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    return null;
  }
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    /* ignore */
  }
}

let currentLang = storageGet("lang");
if (!translations[currentLang]) currentLang = "en";

function t(key, ...args) {
  const entry = translations[currentLang][key] || translations.en[key];
  return typeof entry === "function" ? entry(...args) : entry;
}

function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[currentLang][key]) {
      el.textContent = translations[currentLang][key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[currentLang][key]) {
      el.placeholder = translations[currentLang][key];
    }
  });

  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";

  const langLabel = document.getElementById("lang-label");
  if (langLabel) langLabel.textContent = currentLang === "en" ? "AR" : "EN";
}

function setLanguage(lang) {
  currentLang = lang;
  storageSet("lang", lang);
  applyStaticTranslations();
}

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

// Remember successful translations so toggling languages doesn't re-request them
const translationCache = new Map();

// MyMemory sometimes returns HTML entities (e.g. &#39;). Turn them back into plain text.
function decodeEntities(str) {
  const doc = new DOMParser().parseFromString(str, "text/html");
  return doc.documentElement.textContent || "";
}

// Returns the translated text, or null if the translation failed
async function translateChunk(chunk, langPair) {
  try {
    const res = await fetch(`${MYMEMORY_URL}?q=${encodeURIComponent(chunk)}&langpair=${langPair}`);
    const data = await res.json();
    const translated = data?.responseData?.translatedText;

    // When the free daily quota is used up, MyMemory still answers with a warning text.
    // Only accept the answer when the status is 200.
    if (Number(data?.responseStatus) === 200 && translated && !/MYMEMORY WARNING/i.test(translated)) {
      return decodeEntities(translated);
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function translateText(text, targetLang) {
  if (!text || !String(text).trim() || targetLang === "en") return text;

  const cacheKey = `${targetLang}|${text}`;
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey);

  const chunks = splitIntoChunks(text, 450);
  const parts = await Promise.all(chunks.map((chunk) => translateChunk(chunk, `en|${targetLang}`)));

  const allTranslated = parts.every((part) => part !== null);
  const result = parts.map((part, i) => (part !== null ? part : chunks[i])).join(" ");

  if (allTranslated) translationCache.set(cacheKey, result);
  return result;
}

// Splits text into pieces below maxLen characters (MyMemory accepts ~500 per request).
// Note: no regex lookbehind here, because iOS Safari older than 16.4 can't parse it.
function splitIntoChunks(text, maxLen) {
  const sentences = text.match(/[\s\S]+?(?:[.!?]+(?=\s|$)|$)\s*/g) || [text];
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    // a single very long sentence: split it by words
    if (sentence.length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = "";

      let part = "";
      for (const word of sentence.split(/\s+/)) {
        if ((part + " " + word).length > maxLen) {
          if (part.trim()) chunks.push(part.trim());
          part = word;
        } else {
          part += " " + word;
        }
      }
      if (part.trim()) chunks.push(part.trim());
      continue;
    }

    if ((current + sentence).length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}