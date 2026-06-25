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

let currentLang = localStorage.getItem("lang") || "en";

function t(key, ...args) {
  const entry = translations[currentLang][key];
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
  localStorage.setItem("lang", lang);
  applyStaticTranslations();
}

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

async function translateText(text, targetLang) {
  if (!text || targetLang === "en") return text;

  const sourceLang = "en";
  const langPair = `${sourceLang}|${targetLang}`;
  const chunks = splitIntoChunks(text, 450);

  try {
    const translatedChunks = await Promise.all(
      chunks.map((chunk) =>
        fetch(`${MYMEMORY_URL}?q=${encodeURIComponent(chunk)}&langpair=${langPair}`)
          .then((res) => res.json())
          .then((data) => data?.responseData?.translatedText || chunk)
          .catch(() => chunk)
      )
    );
    return translatedChunks.join(" ");
  } catch (err) {
    console.error("Translation failed:", err);
    return text;
  }
}

function splitIntoChunks(text, maxLen) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += " " + sentence;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}