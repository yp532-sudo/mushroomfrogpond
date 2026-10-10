
require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = (process.env.FDC_API_KEY || "").trim();

app.use(express.json());

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

    const response = await fetch(url, {
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
    console.error("Food search error:", error.message);

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
