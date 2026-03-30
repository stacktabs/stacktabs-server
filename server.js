
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

app.post("/polar/webhook", (req, res) => {

  try {

    const event = req.body;

    console.log("EVENT TYPE:", event.type);

    if (
      event.type === "subscription.created" ||
      event.type === "subscription.updated" ||
      event.type === "subscription.active"
    ) {

      // ✅ NEW LOGIC HERE
      const email = event?.data?.customer?.email;

      const db = loadDB();

      const device = db.emailToDevice?.[email];

      console.log("EMAIL:", email);
      console.log("DEVICE FROM DB:", device);

      if (!device) {
        console.log("❌ DEVICE NOT FOUND FROM EMAIL");
        return res.sendStatus(200);
      }

      let expiresAt = Date.now();

      if (event.data?.current_period_end) {
        expiresAt = new Date(event.data.current_period_end).getTime();
      }

      db.deviceLicenses[device] = { expiresAt };

      saveDB(db);

      console.log("✅ PRO ACTIVATED:", device);
    }

    res.sendStatus(200);

  } catch (e) {
    console.log("Webhook error:", e);
    res.sendStatus(200);
  }
});

app.post("/save-device", (req, res) => {

  const { device_id, email } = req.body;

  console.log("SAVING DEVICE:", device_id, email);

  const db = loadDB();

  db.emailToDevice = db.emailToDevice || {};
  db.emailToDevice[email] = device_id;

  saveDB(db);

  res.json({ ok: true });
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
