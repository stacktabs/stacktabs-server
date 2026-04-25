const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const createCheckout = require("./create-checkout");
app.use("/", createCheckout);

/* ---------------- HEALTH ROUTE ---------------- */
app.get("/", (req, res) => {
  res.send("StackTabs License Server Running");
});

/* ================= MONGODB ================= */

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

const LicenseSchema = new mongoose.Schema({
  device: { type: String, unique: true },
  email: String,
  expiresAt: Number
});

const License = mongoose.model("License", LicenseSchema);

/* ================= LICENSE CHECK ================= */

app.get("/license/check", async (req, res) => {

  const device = req.query.device;
  if (!device) return res.json({ active: false });

  const record = await License.findOne({ device });

  if (!record) {
    console.log("❌ No record for device:", device);
    return res.json({ active: false });
  }

  if (Date.now() > record.expiresAt) {
    console.log("❌ Subscription expired:", device);
    return res.json({ active: false });
  }

  console.log("✅ License valid:", device);

  res.json({
    active: true,
    expiresAt: record.expiresAt
  });
});

/* ================= SAVE DEVICE ================= */

app.post("/save-device", async (req, res) => {

  let { device_id, email } = req.body;

  if (!device_id || !email) {
    return res.status(400).json({ error: "Missing data" });
  }

  email = email.toLowerCase().trim();

  console.log("💾 SAVING DEVICE:", device_id, email);

  await License.updateOne(
    { email },
    { device: device_id },
    { upsert: true }
  );

  res.json({ ok: true });
});

/* ================= POLAR WEBHOOK ================= */

app.post("/polar/webhook", async (req, res) => {

  try {
    const event = req.body;

    console.log("📩 EVENT:", event.type);

    if (
      event.type === "subscription.created" ||
      event.type === "subscription.updated" ||
      event.type === "subscription.active"
    ) {

      let email = event?.data?.customer?.email;

      if (!email) {
        console.log("❌ No email in webhook");
        return res.sendStatus(200);
      }

      email = email.toLowerCase().trim();

      const record = await License.findOne({ email });

      if (!record) {
        console.log("⚠️ Device not found for email:", email);

        // retry after delay (race condition fix)
        setTimeout(async () => {
          const retryRecord = await License.findOne({ email });

          if (!retryRecord) {
            console.log("❌ STILL NOT FOUND:", email);
            return;
          }

          await activateLicense(retryRecord.device, email, event);
        }, 2000);

        return res.sendStatus(200);
      }

      await activateLicense(record.device, email, event);
    }

    res.sendStatus(200);

  } catch (e) {
    console.log("Webhook error:", e);
    res.sendStatus(200);
  }
});

/* ================= LICENSE ACTIVATION ================= */

async function activateLicense(device, email, event) {

  let expiresAt = Date.now();

  if (event.data?.current_period_end) {
    expiresAt = new Date(event.data.current_period_end).getTime();
  }

  await License.updateOne(
    { device },
    { email, expiresAt },
    { upsert: true }
  );

  console.log("✅ PRO ACTIVATED:", device);
}

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

/* ---------------- START SERVER ---------------- */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server running on port", PORT));
