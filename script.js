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

searchBtn.addEventListener("click", searchMeals);

mealsContainer.addEventListener("click", handleMealClick);

backBtn.addEventListener("click", () => {
  mealDetails.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchMeals();
});

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  themeSwitcher.querySelectorAll(".theme-dot").forEach((dot) => {
    dot.classList.toggle("active", dot.dataset.theme === theme);
  });
}

themeSwitcher.addEventListener("click", (e) => {
  const dot = e.target.closest(".theme-dot");
  if (!dot) return;
  applyTheme(dot.dataset.theme);
});

applyTheme(localStorage.getItem("theme") || "orange");

langToggle.addEventListener("click", async () => {
  const newLang = currentLang === "en" ? "ar" : "en";
  setLanguage(newLang);
  await retranslateDynamicContent();
});

applyStaticTranslations();

async function retranslateDynamicContent() {
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
    errorContainer.textContent = t("pleaseEnter");
    errorContainer.classList.remove("hidden");
    return;
  }

  try {
    resultHeading.textContent = t("searching", searchTerm);
    mealsContainer.innerHTML = "";
    errorContainer.classList.add("hidden");

    const response = await fetch(`${SEARCH_URL}${searchTerm}`);
    const data = await response.json();

    if (data.meals === null) {
      resultHeading.textContent = "";
      mealsContainer.innerHTML = "";
      lastMeals = [];
      errorContainer.textContent = t("notFoundFor", searchTerm);
      errorContainer.classList.remove("hidden");
    } else {
      lastSearchTerm = searchTerm;
      lastMeals = data.meals;
      resultHeading.textContent = t("resultsFor", searchTerm);
      await renderMealCards(data.meals);
      searchInput.value = "";
    }
  } catch (error) {
    errorContainer.textContent = t("genericError");
    errorContainer.classList.remove("hidden");
  }
}

async function renderMealCards(meals) {
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
        <div class="meal" data-meal-id="${meal.idMeal}">
          <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
          <div class="meal-info">
            <h3 class="meal-title">${title}</h3>
            ${category ? `<div class="meal-category">${category}</div>` : ""}
          </div>
        </div>
      `;
    })
  );

  mealsContainer.innerHTML = cards.join("");
}

async function handleMealClick(e) {
  const mealEl = e.target.closest(".meal");
  if (!mealEl) return;

  const mealId = mealEl.getAttribute("data-meal-id");

  try {
    const response = await fetch(`${LOOKUP_URL}${mealId}`);
    const data = await response.json();

    if (data.meals && data.meals[0]) {
      lastSelectedMeal = data.meals[0];
      await renderMealDetails(lastSelectedMeal);

      mealDetails.classList.remove("hidden");
      mealDetails.scrollIntoView({ behavior: "smooth" });
    }
  } catch (error) {
    errorContainer.textContent = t("detailsError");
    errorContainer.classList.remove("hidden");
  }
}

async function renderMealDetails(meal) {
  const ingredients = [];

  for (let i = 1; i <= 20; i++) {
    if (meal[`strIngredient${i}`] && meal[`strIngredient${i}`].trim() !== "") {
      ingredients.push({
        ingredient: meal[`strIngredient${i}`],
        measure: meal[`strMeasure${i}`],
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

  mealDetailsContent.innerHTML = `
       <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="meal-details-img">
       <h2 class="meal-details-title">${title}</h2>
       <div class="meal-details-category">
         <span>${category}</span>
       </div>
       <div class="meal-details-instructions">
         <h3>${t("instructions")}</h3>
         <p>${instructions}</p>
       </div>
       <div class="meal-details-ingredients">
         <h3>${t("ingredients")}</h3>
         <ul class="ingredients-list">
           ${ingredientNames
             .map(
               (name, i) => `
             <li><i class="fas fa-check-circle"></i> ${measures[i]} ${name}</li>
           `
             )
             .join("")}
         </ul>
       </div>
       ${
         meal.strYoutube
           ? `
         <a href="${meal.strYoutube}" target="_blank" class="youtube-link">
           <i class="fab fa-youtube"></i> ${t("watchVideo")}
         </a>
       `
           : ""
       }
     `;
}