
const express = require("express");
const cors = require("cors");
const fs = require("fs");


const app = express();
const createCheckout = require("./create-checkout");
app.use(cors({
  origin: "*"
}));
app.use(express.json());
app.use("/", createCheckout);



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

const crypto = require("crypto");

app.post("/polar/webhook", (req, res) => {

  try {

    const secret = "polar_whs_tyIMTDhm8oOu0LAsjlq9mIDUkHvDBt8tUwNvc1bOHJe";

    const signature = req.headers["polar-signature"];
    const body = JSON.stringify(req.body);

    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (signature !== expected) {
      console.log("Invalid webhook signature");
      return res.sendStatus(400);
    }

    const event = req.body;

    console.log("EVENT:", event.type);

    if (
      event.type === "subscription.created" ||
      event.type === "subscription.updated" ||
      event.type === "subscription.active"
    ) {

      let device =
        event?.data?.metadata?.device ||
        event?.data?.metadata_device ||
        event?.metadata?.device;

      if (!device) {
        console.log("No device found");
        return res.sendStatus(200);
      }

      const db = loadDB();

      let expiresAt = Date.now();

      if (event.data?.current_period_end) {
        expiresAt = new Date(event.data.current_period_end).getTime();
      }

      db.deviceLicenses[device] = { expiresAt };

      saveDB(db);

      console.log("PRO ACTIVATED:", device);
    }

    res.sendStatus(200);

  } catch (e) {
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
