
require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = (process.env.FDC_API_KEY || "").trim();
// Create a local folder and SQLite database.
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(
  path.join(dataDir, "mushroomfrog.sqlite")
);

db.pragma("journal_mode = WAL");

// Create the users table automatically if it does not exist.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    pet_name TEXT NOT NULL DEFAULT 'Momo',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    petName: row.pet_name,
    createdAt: row.created_at
  };
}
console.log("FDC_API_KEY loaded:", Boolean(API_KEY));
async function fetchWithRetry(url, options, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      console.warn(
        `USDA connection failed. Retrying (${attempt + 1}/${maxAttempts})...`
      );

      await new Promise(resolve =>
        setTimeout(resolve, attempt * 1000)
      );
    }
  }
}

app.use(express.json());
if (!process.env.SESSION_SECRET) {
  throw new Error("Missing SESSION_SECRET in .env");
}

app.use(
  session({
    name: "mushroomfrog.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

function startUserSession(req, res, user, statusCode = 200) {
  req.session.regenerate((error) => {
    if (error) {
      console.error("Session error:", error);
      return res.status(500).json({
        error: "Could not start login session."
      });
    }

    req.session.userId = user.id;

    req.session.save((saveError) => {
      if (saveError) {
        console.error("Session save error:", saveError);
        return res.status(500).json({
          error: "Could not save login session."
        });
      }

      return res.status(statusCode).json({
        user: publicUser(user)
      });
    });
  });
}
// Register a new account.
app.post("/api/auth/register", async (req, res) => {
  const username = String(req.body?.username || "")
    .trim()
    .toLowerCase();

  const password = String(req.body?.password || "");
  const petName = String(req.body?.petName || "").trim();

  if (!/^[a-z0-9_-]{3,24}$/.test(username)) {
    return res.status(400).json({
      error: "Username must be 3-24 letters, numbers, underscores or hyphens."
    });
  }

  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({
      error: "Password must be 8-128 characters."
    });
  }

  if (!petName || petName.length > 20) {
    return res.status(400).json({
      error: "Pet name must be 1-20 characters."
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = db.prepare(`
      INSERT INTO users (username, password_hash, pet_name)
      VALUES (?, ?, ?)
    `).run(username, passwordHash, petName);

    const user = db.prepare(`
      SELECT id, username, pet_name, created_at
      FROM users
      WHERE id = ?
    `).get(result.lastInsertRowid);

    return startUserSession(req, res, user, 201);
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "That username already exists."
      });
    }

    console.error("Registration error:", error);
    return res.status(500).json({
      error: "Could not create account."
    });
  }
});


// Log in to an existing account.
app.post("/api/auth/login", async (req, res) => {
  const username = String(req.body?.username || "")
    .trim()
    .toLowerCase();

  const password = String(req.body?.password || "");

  try {
    const user = db.prepare(`
      SELECT id, username, password_hash, pet_name, created_at
      FROM users
      WHERE username = ?
    `).get(username);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        error: "Username or password is incorrect."
      });
    }

    return startUserSession(req, res, user);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: "Could not log in."
    });
  }
});


// Restore the current login after refreshing the page.
app.get("/api/auth/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      error: "Not logged in."
    });
  }

  const user = db.prepare(`
    SELECT id, username, pet_name, created_at
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

  if (!user) {
    return res.status(401).json({
      error: "Account not found."
    });
  }

  res.json({ user: publicUser(user) });
});


// Update the profile field already present in the app.
app.patch("/api/profile", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({
      error: "Please log in first."
    });
  }

  const petName = String(req.body?.petName || "").trim();

  if (!petName || petName.length > 20) {
    return res.status(400).json({
      error: "Pet name must be 1-20 characters."
    });
  }

  db.prepare(`
    UPDATE users
    SET pet_name = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(petName, req.session.userId);

  const user = db.prepare(`
    SELECT id, username, pet_name, created_at
    FROM users
    WHERE id = ?
  `).get(req.session.userId);

  res.json({ user: publicUser(user) });
});


// Log out.
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Logout error:", error);
      return res.status(500).json({
        error: "Could not log out."
      });
    }

    res.clearCookie("mushroomfrog.sid");
    res.json({ ok: true });
  });
});

// Serve your existing HTML, CSS and JavaScript files.
app.use(express.static(path.join(__dirname, "public")));

// Check that the server is running.
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Search foods using the USDA FoodData Central API.
app.get("/api/foods/search", async (req, res) => {
  const query = String(req.query.q || "").trim();

  if (query.length < 2) {
    return res.status(400).json({
      error: "Please enter at least 2 characters."
    });
  }

  if (query.length > 100) {
    return res.status(400).json({
      error: "Search query is too long."
    });
  }

  if (!API_KEY) {
    return res.status(500).json({
      error: "API key is missing. Check your .env file."
    });
  }

  try {
    const url = new URL(
      "https://api.nal.usda.gov/fdc/v1/foods/search"
    );

    url.searchParams.set("api_key", API_KEY);

    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        pageSize: 10,
        dataType: [
          "Foundation",
          "SR Legacy",
          "Survey (FNDDS)",
          "Branded"
        ]
      })
    });

    if (!response.ok) {
      console.error("USDA API status:", response.status);

      return res.status(502).json({
        error: `USDA search failed (HTTP ${response.status}).`
      });
    }

    const data = await response.json();

    // Return only the fields needed for food selection.
    const foods = (data.foods || []).map(food => ({
      fdcId: food.fdcId,
      description: food.description,
      dataType: food.dataType,
      brandOwner: food.brandOwner || null
    }));

    res.json({ foods });
  } catch (error) {
    console.error("Food search error:", error);
    console.error("Underlying cause:", error.cause);

    res.status(500).json({
      error: "Could not connect to the food database."
    });
  }
});

app.get("/api/foods/:fdcId", async (req, res) => {
  const fdcId = req.params.fdcId;

  // FDC IDs should be numeric.
  if (!/^\d+$/.test(fdcId)) {
    return res.status(400).json({
      error: "Invalid food ID."
    });
  }

  if (!API_KEY) {
    return res.status(500).json({
      error: "API key is missing."
    });
  }

  try {
    const url = new URL(
      `https://api.nal.usda.gov/fdc/v1/food/${fdcId}`
    );

    url.searchParams.set("api_key", API_KEY);

    const response = await fetch(url);

    if (!response.ok) {
      console.error("USDA detail status:", response.status);

      return res.status(502).json({
        error: "Could not retrieve food details."
      });
    }

    const food = await response.json();

    const nutrients = (food.foodNutrients || [])
      .map(item => {
        const nutrient = item.nutrient || item;

        return {
          name: nutrient.name || "",
          unit: nutrient.unitName || nutrient.unit || "",
          amount: item.amount ?? item.value ?? null
        };
      })
      .filter(item => item.name);

    res.json({
      fdcId: food.fdcId,
      description: food.description,
      dataType: food.dataType,
      foodNutrients: nutrients
    });
  } catch (error) {
    console.error("Food detail error:", error.message);

    res.status(500).json({
      error: "Could not connect to USDA."
    });
  }
});


app.listen(PORT, () => {
  console.log(`Mushroom Frog is running at http://localhost:${PORT}`);
});
