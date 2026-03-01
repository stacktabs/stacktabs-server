const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 3000;

/* ======================================================
   IMPORTANT: BODY PARSER MUST BE FIRST (POLAR WEBHOOK)
====================================================== */
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* ======================================================
   SIMPLE FILE DATABASE
====================================================== */

const DB_FILE = "./licenses.json";

/* create safe db */
function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { deviceLicenses: {} };
    }
    const raw = fs.readFileSync(DB_FILE);
    const parsed = JSON.parse(raw);

    if (!parsed.deviceLicenses) parsed.deviceLicenses = {};
    return parsed;

  } catch (e) {
    console.log("DB reset due to corruption");
    return { deviceLicenses: {} };
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/* ======================================================
   DEVICE LICENSE CHECK  (EXTENSION CALLS THIS)
====================================================== */

app.get("/license/check", (req, res) => {

  const device = req.query.device;

  if (!device) {
    return res.json({ active: false });
  }

  const db = loadDB();
  const record = db.deviceLicenses[device];

  if (!record) {
    return res.json({ active: false });
  }

  /* expired subscription */
  if (Date.now() > record.expiresAt) {
    delete db.deviceLicenses[device];
    saveDB(db);
    return res.json({ active: false });
  }

  return res.json({
    active: true,
    expiresAt: record.expiresAt
  });
});

/* ======================================================
   POLAR WEBHOOK (THIS ACTIVATES PRO)
====================================================== */

app.post("/polar/webhook", (req, res) => {

  try {
    const event = req.body;

    console.log("Polar event received:", event.type);

    /* subscription purchased OR renewed */
    if (event.type === "checkout.completed") {

      /* VERY IMPORTANT — correct metadata field */
      const device = event.data.metadata_device;

      if (!device) {
        console.log("No device metadata in checkout");
        return res.sendStatus(200);
      }

      const db = loadDB();

      /* subscription duration = 30 days */
      const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);

      db.deviceLicenses[device] = {
        expiresAt
      };

      saveDB(db);

      console.log("✅ PRO ACTIVATED for device:", device);
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

/* ======================================================
   HEALTH CHECK (Render requires this)
====================================================== */

app.get("/", (req, res) => {
  res.send("StackTabs License Server Running");
});

/* ======================================================
   START SERVER
====================================================== */

app.listen(PORT, () => {
  console.log("StackTabs license server running on port", PORT);
});
