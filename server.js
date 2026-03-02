const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

/* ---------------- HEALTH ROUTE (CRITICAL FOR RENDER) ---------------- */
app.get("/", (req, res) => {
  res.send("StackTabs License Server Running");
});

/* ---------------- DATABASE ---------------- */

const DB_FILE = "./licenses.json";

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ deviceLicenses:{} }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/* ================= LICENSE CHECK ================= */

app.get("/license/check", (req, res) => {

  const device = req.query.device;
  if (!device) return res.json({ active:false });

  const db = loadDB();
  const record = db.deviceLicenses[device];

  if (!record) return res.json({ active:false });

  if (Date.now() > record.expiresAt) {
    delete db.deviceLicenses[device];
    saveDB(db);
    return res.json({ active:false });
  }

  res.json({
    active:true,
    expiresAt:record.expiresAt
  });
});

/* ================= POLAR WEBHOOK (MOST IMPORTANT PART) ================= */

app.post("/polar/webhook", (req, res) => {

  try {

    const event = req.body;

    /* Polar successful payment event */
    if (event.type === "checkout.completed") {

      const device = event.data.metadata.device;

      if (!device) {
        console.log("No device metadata");
        return res.sendStatus(200);
      }

      const db = loadDB();

      /* subscription expiry (monthly default) */
      let expiresAt = Date.now() + (30*24*60*60*1000);

      /* if Polar provides subscription end date */
      if (event.data.subscription && event.data.subscription.current_period_end) {
        expiresAt = new Date(event.data.subscription.current_period_end).getTime();
      }

      db.deviceLicenses[device] = { expiresAt };
      saveDB(db);

      console.log("PRO ACTIVATED FOR DEVICE:", device);
    }

    res.sendStatus(200);

  } catch(e) {
    console.log("Webhook error:", e);
    res.sendStatus(500);
  }
});

/* ---------------- SUCCESS PAGE ---------------- */

app.get("/polar/success", (req, res) => {
  res.send(`
    <html>
      <body style="font-family:sans-serif;text-align:center;margin-top:80px;">
        <h2>Payment Successful ✓</h2>
        <p>You can close this tab and return to StackTabs.</p>
      </body>
    </html>
  `);
});

const PORT = 3000;
app.listen(PORT, () => console.log("StackTabs server running on port", PORT));
