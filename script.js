
'use strict';

// DEMO ONLY: localStorage is not secure authentication.
// Never use this pattern for real accounts or sensitive information.
const USERS_KEY = 'enchantedForestDemoUsers';
const SESSION_KEY = 'enchantedForestDemoSession';
const PET_MOOD_IMAGES = {
  thirsty: 'images/pet-thirsty.png',
  stomachDiscomfort: 'images/pet-stomach-discomfort.png',
  bloated: 'images/pet-bloated.png',
  drowsy: 'images/pet-drowsy.png',
  healthy: 'images/pet-healthy.png',
  lost: 'images/pet-lost.png'
};
const PET_MOOD_PHRASES = {
  thirsty: 'is thirsty',
  stomachDiscomfort: 'has stomach discomfort',
  bloated: 'is bloated',
  drowsy: 'is drowsy',
  healthy: 'is healthy',
  lost: 'is lost'
};

const $ = (id) => document.getElementById(id);

let currentUsername = null;
let currentUser = null;
let selectedDate = localDateString(new Date());
let selectedFoodForMeal=null;
let draftMealItems=[];

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function cleanUsername(value) {
  return value.trim().toLowerCase();
}

function showAuthTab(tab) {
  const isLogin = tab === 'login';
  $('loginForm').classList.toggle('hidden', !isLogin);
  $('signupForm').classList.toggle('hidden', isLogin);
  $('showLoginButton').classList.toggle('active', isLogin);
  $('showSignupButton').classList.toggle('active', !isLogin);
  $('showLoginButton').setAttribute('aria-selected', String(isLogin));
  $('showSignupButton').setAttribute('aria-selected', String(!isLogin));
  $('loginMessage').textContent = '';
  $('signupMessage').textContent = '';
}

function showMessage(id, message, success = false) {
  const element = $(id);
  element.textContent = message;
  element.classList.toggle('success', success);
}

function signUp(event) {
  event.preventDefault();

  const usernameInput = $('signupUsername').value.trim();
  const username = cleanUsername(usernameInput);
  const password = $('signupPassword').value;
  const petName = $('signupPetName').value.trim();

  if (username.length < 3) {
    showMessage('signupMessage', 'Your username needs at least 3 characters.');
    return;
  }

  if (password.length < 4) {
    showMessage('signupMessage', 'Your demo password needs at least 4 characters.');
    return;
  }

  if (!petName) {
    showMessage('signupMessage', 'Please choose a name for your pet.');
    return;
  }

  const users = getUsers();

  if (users[username]) {
    showMessage('signupMessage', 'That username already exists. Try logging in or choose another.');
    return;
  }

  users[username] = {
    username: usernameInput,
    password: password, // Plain text for demo only; not safe for a real website.
    petName: petName.slice(0, 20),
    meals: [],
    drinks: [],
    createdAt: new Date().toISOString()
  };

  saveUsers(users);
  $('signupForm').reset();
  startSession(username);
}

function logIn(event) {
  event.preventDefault();

  const username = cleanUsername($('loginUsername').value);
  const password = $('loginPassword').value;
  const users = getUsers();

  if (!users[username] || users[username].password !== password) {
    showMessage(
      'loginMessage',
      'Username or password not found. Check your details or create an account.'
    );
    return;
  }

  $('loginForm').reset();
  startSession(username);
}

function startSession(username) {
  const users = getUsers();

  if (!users[username]) return;

  currentUsername = username;
  currentUser = users[username];

  localStorage.setItem(SESSION_KEY, username);

  $('authPanel').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('accountBar').classList.remove('hidden');

  $('welcomeText').textContent = `Welcome, ${currentUser.username}!`;
  $('petNameDisplay').textContent = currentUser.petName || 'Momo';
  $('newPetName').value = currentUser.petName || 'Momo';

  $('selectedDate').value = selectedDate;
  $('mealDate').value = selectedDate;
  $('drinkDate').value = selectedDate;

  renderAll();
}

function logOut() {
  currentUsername = null;
  currentUser = null;

  localStorage.removeItem(SESSION_KEY);

  $('app').classList.add('hidden');
  $('accountBar').classList.add('hidden');
  $('authPanel').classList.remove('hidden');

  $('loginForm').reset();
  $('signupForm').reset();

  showAuthTab('login');
}

function saveCurrentUser() {
  if (!currentUsername || !currentUser) return;

  const users = getUsers();
  users[currentUsername] = currentUser;

  saveUsers(users);
}

function renamePet(event) {
  event.preventDefault();

  const name = $('newPetName').value.trim();

  if (!name) {
    showMessage('petMessageStatus', 'Enter a pet name first.');
    return;
  }

  currentUser.petName = name.slice(0, 20);
  saveCurrentUser();

  $('petNameDisplay').textContent = currentUser.petName;

  showMessage(
    'petMessageStatus',
    `Your pet is now called ${currentUser.petName}!`,
    true
  );

  updatePet();
}
function renderPetImage(mood) {
  const image = $('petImage');
  const emoji = $('petEmoji');
  const avatar = $('petAvatar');

  if (!image || !emoji || !avatar) {
    console.error('找不到青蛙图片相关元素');
    return;
  }

  const imagePath =
    PET_MOOD_IMAGES[mood] || PET_MOOD_IMAGES.healthy;

  // 先隐藏图片，避免旧图片状态干扰
  image.classList.add('hidden');

  image.onload = () => {
    image.classList.remove('hidden');
    emoji.classList.add('hidden');
    avatar.classList.add('has-image');
  };

  image.onerror = () => {
    image.classList.add('hidden');
    emoji.classList.remove('hidden');
    avatar.classList.remove('has-image');
    console.error('青蛙图片加载失败：', imagePath);
  };

  // 图片路径相同时也确保重新检查显示状态
  if (image.src === new URL(imagePath, document.baseURI).href && image.complete) {
    if (image.naturalWidth > 0) {
      image.classList.remove('hidden');
      emoji.classList.add('hidden');
      avatar.classList.add('has-image');
    } else {
      image.onerror();
    }
  } else {
    image.src = imagePath;
  }
}

function optionalNumber(id) {
  const raw = $(id).value.trim();

  if (raw === '') return null;

  const value = Number(raw);

  return Number.isFinite(value) && value >= 0 ? value : null;
}

function addMeal(event) {
  event.preventDefault();

  const meal = {
    id: makeId(),
    date: $('mealDate').value,
    time: $('mealTime').value,
    type: $('mealType').value,
    name: $('mealName').value.trim(),
    ingredients:[
      $('ingredients').value.trim(),
      ...draftMealItems.map(
      item => `${item.name} (${item.grams} g)`
      )
    ].filter(Boolean).join(';'),
    foodItems: draftMealItems.map(item => ({
      fdcId: item.fdcId,
      name: item.name,
      dataType: item.dataType,
      grams: item.grams
    })),
    seasonings: $('seasonings').value.trim(),
    portion: $('portion').value.trim(),
    method: $('cookingMethod').value,
    calories: optionalNumber('calories'),
    carbs: optionalNumber('carbs'),
    sodium: optionalNumber('sodium'),
    satFat: optionalNumber('satFat')
  };

  if (!meal.date || !meal.time || !meal.name) {
    showMessage(
      'mealFormMessage',
      'Please add a date, time, and meal name.'
    );
    return;
  }

  currentUser.meals.push(meal);
  saveCurrentUser();

  selectedDate = meal.date;
  $('selectedDate').value = selectedDate;

  $('mealForm').reset();
  $('mealDate').value = selectedDate;
  $('mealTime').value = currentTimeString();
  $('mealType').value = 'Breakfast';
  draftMealItems = [];
  selectedFoodForMeal = null;
  $('foodSearchResults').replaceChildren();
  $('foodSearchMessage').textContent = '';
  renderDraftMealItems();

  showMessage('mealFormMessage', 'Meal added to your journal. 🌿', true);

  renderAll();
}

function addDrink(event) {
  event.preventDefault();

  const date = $('drinkDate').value;
  const amount = Number($('drinkAmount').value);

  if (!date || !Number.isFinite(amount) || amount <= 0) {
    showMessage(
      'drinkFormMessage',
      'Enter a date and an amount greater than zero.'
    );
    return;
  }

  currentUser.drinks.push({
    id: makeId(),
    date,
    type: $('drinkType').value,
    amount
  });

  saveCurrentUser();

  $('drinkAmount').value = '';

  selectedDate = date;
  $('selectedDate').value = date;

  showMessage('drinkFormMessage', 'Drink added to your journal. 💧', true);

  renderAll();
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function currentTimeString() {
  const now = new Date();

  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
}

function formatDate(dateString) {
  if (!dateString) return '';

  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function renderMeals() {
  const meals = currentUser.meals
    .filter((meal) => meal.date === selectedDate)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  $('mealListDate').textContent = formatDate(selectedDate);

  $('mealCount').textContent =
    `${meals.length} ${meals.length === 1 ? 'entry' : 'entries'}`;

  if (!meals.length) {
    $('mealList').innerHTML =
      '<div class="empty-state">No meals logged for this date yet. Add your first entry above. 🍃</div>';
    return;
  }

  $('mealList').innerHTML = meals.map((meal) => {
    const nutrition = [];

    if (meal.calories !== null && meal.calories !== undefined) {
      nutrition.push(`${meal.calories} kcal`);
    }

    if (meal.carbs !== null && meal.carbs !== undefined) {
      nutrition.push(`${meal.carbs} g carbs`);
    }

    if (meal.sodium !== null && meal.sodium !== undefined) {
      nutrition.push(`${meal.sodium} mg sodium`);
    }

    if (meal.satFat !== null && meal.satFat !== undefined) {
      nutrition.push(`${meal.satFat} g saturated fat`);
    }

    const details = [
      meal.ingredients
        ? `<div class="meal-details"><strong>Ingredients:</strong> ${escapeHTML(meal.ingredients)}</div>`
        : '',

      meal.seasonings
        ? `<div class="meal-details"><strong>Seasonings:</strong> ${escapeHTML(meal.seasonings)}</div>`
        : '',

      meal.portion
        ? `<div class="meal-details"><strong>Portion:</strong> ${escapeHTML(meal.portion)}</div>`
        : '',

      meal.method
        ? `<div class="meal-details"><strong>Method:</strong> ${escapeHTML(meal.method)}</div>`
        : '',

      nutrition.length
        ? `<div class="nutrition-chips">${nutrition
            .map((item) => `<span class="nutrition-chip">${escapeHTML(item)}</span>`)
            .join('')}</div>`
        : ''
    ].join('');

    return `<article class="meal-card">
      <div>
        <h4>${escapeHTML(meal.name)}</h4>
        <div class="meal-meta">${escapeHTML(meal.time || '')} · ${escapeHTML(meal.type || 'Meal')}</div>
        ${details}
      </div>
      <button class="delete-button" type="button"
        data-delete-meal="${escapeHTML(meal.id)}"
        aria-label="Delete ${escapeHTML(meal.name)}">Delete</button>
    </article>`;
  }).join('');
}

function renderHydration() {
  const drinks = currentUser.drinks.filter(
    (drink) => drink.date === selectedDate
  );

  const total = drinks.reduce(
    (sum, drink) => sum + Number(drink.amount || 0),
    0
  );

  $('waterTotal').textContent = `${Math.round(total).toLocaleString()} mL`;

  if (!drinks.length) {
    $('drinkList').innerHTML =
      '<div class="empty-state">No drinks logged for this date yet. Keep track of what you choose to record. 💧</div>';
    return;
  }

  $('drinkList').innerHTML = drinks.map((drink) => `
    <article class="drink-card">
      <div>
        <strong>${escapeHTML(drink.type)}</strong>
        <div class="meal-meta">${Number(drink.amount).toLocaleString()} mL</div>
      </div>
      <button class="delete-button" type="button"
        data-delete-drink="${escapeHTML(drink.id)}"
        aria-label="Delete drink">Delete</button>
    </article>
  `).join('');
}

function sumKnown(meals, key) {
  const known = meals.filter((meal) =>
    meal[key] !== null &&
    meal[key] !== undefined &&
    Number.isFinite(Number(meal[key]))
  );

  if (!known.length) return null;

  return known.reduce((sum, meal) => sum + Number(meal[key]), 0);
}

function displayNumber(value, suffix = '') {
  return value === null
    ? '—'
    : `${Math.round(value * 10) / 10}${suffix}`;
}

function renderAnalysis() {
  const meals = currentUser.meals.filter(
    (meal) => meal.date === selectedDate
  );

  const calories = sumKnown(meals, 'calories');
  const carbs = sumKnown(meals, 'carbs');
  const sodium = sumKnown(meals, 'sodium');
  const satFat = sumKnown(meals, 'satFat');

  $('dailyCalories').textContent = displayNumber(calories);
  $('dailyCarbs').textContent = displayNumber(carbs);
  $('dailySodium').textContent = displayNumber(sodium);
  $('dailySatFat').textContent = displayNumber(satFat);

  const missing =
    meals.length === 0 ||
    ['calories', 'carbs', 'sodium', 'satFat'].some(
      (key) => sumKnown(meals, key) === null
    );

  $('analysisNote').textContent = meals.length === 0
    ? 'Add meals with nutrition information to see a daily summary.'
    : missing
      ? 'Totals include only values you entered. A dash means no value was recorded for that nutrient; it does not mean zero.'
      : 'These totals summarize the nutrition values you entered. They may be incomplete if a meal or ingredient was not recorded.';
}

function getLastSevenDates() {
  const dates = [];
  const now = new Date();

  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - offset
    );

    dates.push(localDateString(date));
  }

  return dates;
}

function getFoodGroups(meals) {
  const text = meals
    .map((meal) => `${meal.name || ''} ${meal.ingredients || ''}`)
    .join(' ')
    .toLowerCase();

  const patterns = {
    fruit: /\b(apple|banana|berries|berry|orange|fruit|pear|grape|melon|mango|peach|pineapple)\b/,

    vegetables: /\b(spinach|broccoli|carrot|vegetable|lettuce|peas|pepper|tomato|cucumber|kale|cabbage|onion|mushroom|zucchini)\b/,

    grains: /\b(oats|oatmeal|rice|bread|pasta|quinoa|whole grain|cereal|tortilla|noodle|barley)\b/,

    protein: /\b(egg|chicken|fish|beans|lentils|tofu|beef|turkey|pork|chickpea|tempeh|nuts|peanut butter)\b/,

    dairyOrFortifiedAlternative: /\b(milk|yogurt|yoghurt|cheese|fortified soy|soy milk|kefir)\b/
  };

  return Object.values(patterns).filter(
    (pattern) => pattern.test(text)
  ).length;
}

function renderForestRhythm() {
  const dates = getLastSevenDates();

  const daysWithMeals = dates.filter((date) =>
    currentUser.meals.some((meal) => meal.date === date)
  ).length;

  const regularDays = dates.filter((date) => {
    const types = new Set(
      currentUser.meals
        .filter((meal) => meal.date === date)
        .map((meal) => meal.type)
    );

    return (
      types.has('Breakfast') &&
      types.has('Lunch') &&
      types.has('Dinner')
    );
  }).length;

  const varietyDays = dates.filter((date) => {
    const meals = currentUser.meals.filter(
      (meal) => meal.date === date
    );

    return meals.length > 0 && getFoodGroups(meals) >= 3;
  }).length;

  $('steadyDays').textContent = `${daysWithMeals}/7`;
  $('regularDays').textContent = `${regularDays}/7`;
  $('varietyDays').textContent = `${varietyDays}/7`;

  let status = 'Beginning';
  let message =
    'Every record is a little clue about your routine. Start wherever you are.';

  if (daysWithMeals >= 5) {
    status = 'Flourishing';
    message =
      'You have records across much of the week. Look for patterns that feel useful to you.';
  } else if (daysWithMeals >= 2) {
    status = 'Growing';
    message =
      'Your journal is taking shape. A few more entries may make weekly patterns easier to notice.';
  }

  $('rhythmStatus').textContent = status;
  $('rhythmMessage').textContent = message;
}

function updatePet() {
  const today = localDateString(new Date());

  const todayMeals = currentUser.meals.filter(
    (meal) => meal.date === today
  ).length;

  const todayDrinks = currentUser.drinks.filter(
    (drink) => drink.date === today
  ).length;

  if (todayMeals + todayDrinks >= 3) {
    $('petEmoji').textContent = '🐸';
    $('petMood').textContent = 'is happily exploring';
    $('petMessage').textContent =
      `${currentUser.petName} is glad you're taking time to keep your journal.`;
  } else if (todayMeals + todayDrinks > 0) {
    $('petEmoji').textContent = '🐸';
    $('petMood').textContent = 'is curious';
    $('petMessage').textContent =
      `${currentUser.petName} is here to encourage gentle, pressure-free tracking.`;
  } else {
    $('petEmoji').textContent = '🐸';
    $('petMood').textContent = 'is resting among the mushrooms';
    $('petMessage').textContent =
      'Add an entry whenever you like. Your pet is never disappointed in you.';
  }

  
  renderPetImage('healthy');
}

function renderAll() {
  if (!currentUser) return;

  renderMeals();
  renderHydration();
  renderAnalysis();
  renderForestRhythm();
  updatePet();
}

function handleDelete(event) {
  const mealId = event.target.dataset.deleteMeal;
  const drinkId = event.target.dataset.deleteDrink;

  if (mealId) {
    currentUser.meals = currentUser.meals.filter(
      (meal) => meal.id !== mealId
    );

    saveCurrentUser();
    renderAll();
  }

  if (drinkId) {
    currentUser.drinks = currentUser.drinks.filter(
      (drink) => drink.id !== drinkId
    );

    saveCurrentUser();
    renderAll();
  }
}

function changeSelectedDate() {
  selectedDate =
    $('selectedDate').value || localDateString(new Date());

  $('mealDate').value = selectedDate;
  $('drinkDate').value = selectedDate;

  renderAll();
}

const USDA_NUTRIENT_SPECS = {
  calories: {
    pattern: /energy/i,
    unit: 'kcal'
  },
  carbs: {
    pattern: /carbohydrate.*(by difference|total)|total carbohydrate/i,
    unit: 'g'
  },
  sodium: {
    pattern: /sodium/i,
    unit: 'mg'
  },
  satFat: {
    pattern: /fatty acids, total saturated|saturated fat/i,
    unit: 'g'
  }
};

function readNutrientPer100g(nutrients, spec) {
  if (!Array.isArray(nutrients)) return null;

  const candidates = nutrients.filter((item) => {
    // 兼容不同形式的 USDA 营养素数据
    const nutrient = item.nutrient || item;
    const name = String(nutrient.name || '');
    const unit = String(
      nutrient.unitName || nutrient.unit || ''
    ).trim().toLowerCase();

    const amount = item.amount ?? nutrient.amount;

    return (
      spec.pattern.test(name) &&
      unit === spec.unit.toLowerCase() &&
      amount !== null &&
      amount !== undefined &&
      Number.isFinite(Number(amount))
    );
  });

  return candidates.length
    ? Number(candidates[0].amount ?? candidates[0].nutrient?.amount)
    : null;
}

async function searchFoodsForMeal() {
  const queryInput = $('foodSearchQuery');
  const message = $('foodSearchMessage');
  const results = $('foodSearchResults');
  const controls = $('selectedFoodControls');

  if (!queryInput || !message || !results || !controls) return;

  const query = queryInput.value.trim();

  if (query.length < 2) {
    message.textContent = 'Please enter at least 2 characters.';
    return;
  }

  message.textContent = 'Searching USDA...';
  results.replaceChildren();
  controls.classList.add('hidden');
  selectedFoodForMeal = null;

  try {
    const response = await fetch(
      `/api/foods/search?q=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Food search failed.');
    }

    const foods = Array.isArray(data.foods) ? data.foods : [];

    if (!foods.length) {
      message.textContent = 'No matching foods found.';
      return;
    }

    message.textContent =
      'Select the food that best matches your ingredient.';

    foods.forEach((food) => {
      const button = document.createElement('button');

      button.type = 'button';
      button.className = 'button button-secondary food-search-result';
      button.textContent =
        `${food.description} (${food.dataType || 'Food record'})`;

      button.addEventListener('click', () => {
        selectedFoodForMeal = food;

        $('selectedIngredientName').textContent = food.description;
        $('foodAmountGrams').value = '100';
        controls.classList.remove('hidden');
      });

      results.appendChild(button);
    });
  } catch (error) {
    message.textContent = error.message || 'Food search failed.';
  }
}

function renderDraftMealItems() {
  const container = $('mealFoodItems');
  if (!container) return;

  container.replaceChildren();

  if (!draftMealItems.length) {
    const empty = document.createElement('p');
    empty.className = 'small-note';
    empty.textContent = 'No USDA ingredients added yet.';
    container.appendChild(empty);
    return;
  }

  draftMealItems.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'draft-food-item';

    const info = document.createElement('div');
    const name = document.createElement('strong');
    const details = document.createElement('p');

    name.textContent = item.name;
    details.textContent =
      `${item.grams} g · ${item.dataType || 'USDA food'}`;

    info.append(name, details);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'delete-button';
    removeButton.textContent = 'Remove';

    removeButton.addEventListener('click', () => {
      draftMealItems = draftMealItems.filter(
        (food) => food.id !== item.id
      );

      renderDraftMealItems();
      updateNutritionInputsFromDraft();
    });

    row.append(info, removeButton);
    container.appendChild(row);
  });
}

function updateNutritionInputsFromDraft() {
  const fields = [
    { key: 'calories', id: 'calories' },
    { key: 'carbs', id: 'carbs' },
    { key: 'sodium', id: 'sodium' },
    { key: 'satFat', id: 'satFat' }
  ];

  const missing = [];

  fields.forEach((field) => {
    const input = $(field.id);
    if (!input) return;

    if (!draftMealItems.length) {
      if (input.dataset.usdaAuto === 'true') {
        input.value = '';
      }

      delete input.dataset.usdaAuto;
      return;
    }

    const values = draftMealItems.map((item) =>
      item.nutrientsPer100g
        ? item.nutrientsPer100g[field.key]
        : null
    );

    const complete = values.every(
      (value) =>
        typeof value === 'number' &&
        Number.isFinite(value)
    );

    if (!complete) {
      input.value = '';
      input.dataset.usdaAuto = 'true';
      missing.push(field.key);
      return;
    }

    const total = draftMealItems.reduce(
      (sum, item) =>
        sum +
        item.nutrientsPer100g[field.key] * item.grams / 100,
      0
    );

    input.value = String(Math.round(total * 10) / 10);
    input.dataset.usdaAuto = 'true';
  });

  const message = $('foodSearchMessage');
  if (!message) return;

  if (!draftMealItems.length) {
    message.textContent = 'Search for ingredients to begin.';
  } else if (missing.length) {
    message.textContent =
      'Some nutrition values are unavailable. Affected totals are blank, not zero.';
  } else {
    message.textContent =
      'Nutrition totals calculated for the selected ingredients.';
  }
}

async function addSelectedFoodToDraft() {
  if (!selectedFoodForMeal) {
    showFoodSearchMessage('Search and select a food first.');
    return;
  }

  const grams = Number($('foodAmountGrams').value);

  if (!Number.isFinite(grams) || grams <= 0 || grams > 10000) {
    showFoodSearchMessage(
      'Enter an amount greater than 0 and no more than 10,000 grams.'
    );
    return;
  }

  const selected = selectedFoodForMeal;
  const button = $('addFoodToMealButton');

  if (button) button.disabled = true;

  showFoodSearchMessage('Loading nutrition details from USDA...');

  try {
    const response = await fetch(
      `/api/foods/${encodeURIComponent(selected.fdcId)}`
    );

    const details = await response.json();

    if (!response.ok) {
      throw new Error(
        details.error || 'Unable to retrieve food details.'
      );
    }

    const nutrients = Array.isArray(details.foodNutrients)
      ? details.foodNutrients
      : [];

    const nutrientsPer100g = {};

    Object.entries(USDA_NUTRIENT_SPECS).forEach(([key, spec]) => {
      nutrientsPer100g[key] =
        readNutrientPer100g(nutrients, spec);
    });

    draftMealItems.push({
      id: makeId(),
      fdcId: details.fdcId ?? selected.fdcId,
      name: details.description || selected.description || 'Selected food',
      dataType: details.dataType || selected.dataType || 'Unknown',
      grams,
      nutrientsPer100g
    });

    selectedFoodForMeal = null;
    $('selectedFoodControls').classList.add('hidden');

    renderDraftMealItems();
    updateNutritionInputsFromDraft();
  } catch (error) {
    showFoodSearchMessage(
      error.message || 'Unable to retrieve food details.'
    );
  } finally {
    if (button) button.disabled = false;
  }
}

function showFoodSearchMessage(message) {
  const element = $('foodSearchMessage');
  if (element) element.textContent = message;
}

function initialize() {
  $('showLoginButton').addEventListener(
    'click',
    () => showAuthTab('login')
  );

  $('showSignupButton').addEventListener(
    'click',
    () => showAuthTab('signup')
  );

  $('signupForm').addEventListener('submit', signUp);
  $('loginForm').addEventListener('submit', logIn);
  $('logoutButton').addEventListener('click', logOut);
  $('renamePetForm').addEventListener('submit', renamePet);
  $('mealForm').addEventListener('submit', addMeal);
  $('foodSearchButton').addEventListener('click',searchFoodsForMeal);
  $('foodSearchQuery').addEventListener('keydown',event=>{
    if(event.key==='Enter'){
      event.preventDefault();
      searchFoodsForMeal();
    }
  });
  $('addFoodToMealButton').addEventListener('click',addSelectedFoodToDraft);
  renderDraftMealItems();
  $('drinkForm').addEventListener('submit', addDrink);

  $('selectedDate').addEventListener(
    'change',
    changeSelectedDate
  );

  $('mealList').addEventListener('click', handleDelete);
  $('drinkList').addEventListener('click', handleDelete);

  selectedDate = localDateString(new Date());

  $('selectedDate').value = selectedDate;
  $('mealDate').value = selectedDate;
  $('drinkDate').value = selectedDate;
  $('mealTime').value = currentTimeString();

  const savedSession = localStorage.getItem(SESSION_KEY);
  const users = getUsers();

  if (savedSession && users[savedSession]) {
    startSession(savedSession);
  } else {
    localStorage.removeItem(SESSION_KEY);
    showAuthTab('login');
  }
}

document.addEventListener('DOMContentLoaded', initialize);