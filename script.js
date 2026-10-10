// DOM Elements
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const mealsContainer = document.getElementById("meals");
const resultHeading = document.getElementById("result-heading");
const errorContainer = document.getElementById("error-container");
const mealDetails = document.getElementById("meal-details");
const mealDetailsContent = document.querySelector(".meal-details-content");
const backBtn = document.getElementById("back-btn");
const themeSwitcher = document.getElementById("theme-switcher");
const langToggle = document.getElementById("lang-toggle");

const BASE_URL = "https://www.themealdb.com/api/json/v1/1/";
const SEARCH_URL = `${BASE_URL}search.php?s=`;
const LOOKUP_URL = `${BASE_URL}lookup.php?i=`;

let lastSearchTerm = "";
let lastMeals = [];
let lastSelectedMeal = null;
let currentError = null; // { key, args } so the message can be re-translated

// Tokens: used to ignore slow responses that arrive after a newer request
let searchToken = 0;
let cardsToken = 0;
let clickToken = 0;
let detailsToken = 0;

// Escape text before putting it inside innerHTML
function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showError(key, ...args) {
  currentError = { key, args };
  errorContainer.textContent = t(key, ...args);
  errorContainer.classList.remove("hidden");
  // the message sits at the top of the page: bring it into view so the user always sees it
  errorContainer.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideError() {
  currentError = null;
  errorContainer.classList.add("hidden");
}

searchBtn.addEventListener("click", searchMeals);

mealsContainer.addEventListener("click", handleMealClick);

backBtn.addEventListener("click", () => {
  mealDetails.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchMeals();
});

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  storageSet("theme", theme);

  themeSwitcher.querySelectorAll(".theme-dot").forEach((dot) => {
    dot.classList.toggle("active", dot.dataset.theme === theme);
  });
}

themeSwitcher.addEventListener("click", (e) => {
  const dot = e.target.closest(".theme-dot");
  if (!dot) return;
  applyTheme(dot.dataset.theme);
});

applyTheme(storageGet("theme") || "orange");

langToggle.addEventListener("click", async () => {
  const newLang = currentLang === "en" ? "ar" : "en";
  setLanguage(newLang);
  await retranslateDynamicContent();
});

applyStaticTranslations();

async function retranslateDynamicContent() {
  if (currentError && !errorContainer.classList.contains("hidden")) {
    errorContainer.textContent = t(currentError.key, ...currentError.args);
  }

  if (!mealDetails.classList.contains("hidden") && lastSelectedMeal) {
    await renderMealDetails(lastSelectedMeal);
  } else if (lastMeals.length) {
    if (lastSearchTerm) {
      resultHeading.textContent = t("resultsFor", lastSearchTerm);
    }
    await renderMealCards(lastMeals);
  }
}

async function searchMeals() {
  const searchTerm = searchInput.value.trim();

  if (!searchTerm) {
    showError("pleaseEnter");
    return;
  }

  // close the on-screen keyboard so the results are visible (iOS keeps it open after tapping the button)
  searchInput.blur();

  const token = ++searchToken;

  try {
    resultHeading.textContent = t("searching", searchTerm);
    mealsContainer.innerHTML = "";
    hideError();

    const response = await fetch(`${SEARCH_URL}${encodeURIComponent(searchTerm)}`);
    const data = await response.json();

    if (token !== searchToken) return;

    if (data.meals === null) {
      resultHeading.textContent = "";
      mealsContainer.innerHTML = "";
      lastMeals = [];
      showError("notFoundFor", searchTerm);
    } else {
      lastSearchTerm = searchTerm;
      lastMeals = data.meals;
      resultHeading.textContent = t("resultsFor", searchTerm);
      await renderMealCards(data.meals);
      if (token !== searchToken) return;
      searchInput.value = "";
    }
  } catch (error) {
    if (token !== searchToken) return;
    resultHeading.textContent = "";
    showError("genericError");
  }
}

async function renderMealCards(meals) {
  const token = ++cardsToken;
  mealsContainer.innerHTML = "";

  const cards = await Promise.all(
    meals.map(async (meal) => {
      let title = meal.strMeal;
      let category = meal.strCategory;

      if (currentLang === "ar") {
        [title, category] = await Promise.all([
          translateText(meal.strMeal, "ar"),
          category ? translateText(meal.strCategory, "ar") : Promise.resolve(category),
        ]);
      }

      return `
        <div class="meal" data-meal-id="${escapeHTML(meal.idMeal)}">
          <img src="${escapeHTML(meal.strMealThumb)}" alt="${escapeHTML(meal.strMeal)}" loading="lazy">
          <div class="meal-info">
            <h3 class="meal-title">${escapeHTML(title)}</h3>
            ${category ? `<div class="meal-category">${escapeHTML(category)}</div>` : ""}
          </div>
        </div>
      `;
    })
  );

  // a newer render started while we were translating: drop this one
  if (token !== cardsToken) return;

  mealsContainer.innerHTML = cards.join("");
}

async function handleMealClick(e) {
  const mealEl = e.target.closest(".meal");
  if (!mealEl) return;

  const mealId = mealEl.getAttribute("data-meal-id");
  const token = ++clickToken;
  mealEl.classList.add("loading");

  try {
    const response = await fetch(`${LOOKUP_URL}${encodeURIComponent(mealId)}`);
    const data = await response.json();

    if (token !== clickToken) return;

    if (data.meals && data.meals[0]) {
      lastSelectedMeal = data.meals[0];
      await renderMealDetails(lastSelectedMeal);

      if (token !== clickToken) return;

      hideError();
      mealDetails.classList.remove("hidden");
      mealDetails.scrollIntoView({ behavior: "smooth" });
    }
  } catch (error) {
    if (token !== clickToken) return;
    showError("detailsError");
  } finally {
    mealEl.classList.remove("loading");
  }
}

async function renderMealDetails(meal) {
  const token = ++detailsToken;
  const ingredients = [];

  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    if (name && name.trim() !== "") {
      ingredients.push({
        ingredient: name.trim(),
        measure: (meal[`strMeasure${i}`] || "").trim(),
      });
    }
  }

  let title = meal.strMeal;
  let category = meal.strCategory || t("uncategorized");
  let instructions = meal.strInstructions;
  let ingredientNames = ingredients.map((item) => item.ingredient);
  let measures = ingredients.map((item) => item.measure);

  if (currentLang === "ar") {
    const [translatedTitle, translatedCategory, translatedInstructions, translatedIngredients, translatedMeasures] =
      await Promise.all([
        translateText(meal.strMeal, "ar"),
        meal.strCategory ? translateText(meal.strCategory, "ar") : Promise.resolve(t("uncategorized")),
        translateText(meal.strInstructions, "ar"),
        Promise.all(ingredientNames.map((name) => translateText(name, "ar"))),
        Promise.all(measures.map((measure) => translateText(measure, "ar"))),
      ]);

    title = translatedTitle;
    category = translatedCategory;
    instructions = translatedInstructions;
    ingredientNames = translatedIngredients;
    measures = translatedMeasures;
  }

  // a newer render started while we were translating: drop this one
  if (token !== detailsToken) return;

  const youtubeUrl = /^https?:\/\//i.test(meal.strYoutube || "") ? meal.strYoutube : "";

  mealDetailsContent.innerHTML = `
       <img src="${escapeHTML(meal.strMealThumb)}" alt="${escapeHTML(meal.strMeal)}" class="meal-details-img">
       <h2 class="meal-details-title">${escapeHTML(title)}</h2>
       <div class="meal-details-category">
         <span>${escapeHTML(category)}</span>
       </div>
       <div class="meal-details-instructions">
         <h3>${t("instructions")}</h3>
         <p>${escapeHTML(instructions)}</p>
       </div>
       <div class="meal-details-ingredients">
         <h3>${t("ingredients")}</h3>
         <ul class="ingredients-list">
           ${ingredientNames
             .map(
               (name, i) => `
             <li><i class="fas fa-check-circle"></i> ${escapeHTML([measures[i], name].filter(Boolean).join(" "))}</li>
           `
             )
             .join("")}
         </ul>
       </div>
       ${
         youtubeUrl
           ? `
         <a href="${escapeHTML(youtubeUrl)}" target="_blank" rel="noopener noreferrer" class="youtube-link">
           <i class="fab fa-youtube"></i> ${t("watchVideo")}
         </a>
       `
           : ""
       }
     `;
}
