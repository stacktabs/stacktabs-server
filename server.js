const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");
const polarRoutes = require("./polar");

const app = express();
app.use(cors());
app.use("/", polarRoutes);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const PORT = 3000;

/* ---------------- STORAGE ---------------- */

const DB_FILE = "./licenses.json";

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ licenses: {} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/* ---------------- GUMROAD WEBHOOK ---------------- */

/*
Gumroad sends POST here AFTER real payment
*/
app.post("/gumroad-webhook", (req, res) => {
  try {
    const sale = req.body;

    // Gumroad sends purchaser email
    const email = sale.email;
    const saleId = sale.sale_id;

    if (!email || !saleId) {
      return res.status(400).send("Invalid webhook");
    }

    const db = loadDB();

    // 30 days license
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    db.licenses[email] = {
      saleId,
      expiresAt
    };

    saveDB(db);

    console.log("✅ Payment verified for:", email);

    res.status(200).send("ok");
  } catch (err) {
    console.error(err);
    res.status(500).send("server error");
  }
});

/* ---------------- LICENSE CHECK ---------------- */

/*
Extension will call this to verify user
*/
app.get("/check", (req, res) => {
  const email = req.query.email;
  if (!email) return res.json({ valid: false });

  const db = loadDB();

  const record = db.licenses[email];

  if (!record) {
    return res.json({ valid: false });
  }

  if (Date.now() > record.expiresAt) {
    delete db.licenses[email];
    saveDB(db);
    return res.json({ valid: false });
  }

  res.json({
    valid: true,
    expiresAt: record.expiresAt
  });
});

app.listen(PORT, () => {
  console.log("StackTabs license server running on port", PORT);
});
