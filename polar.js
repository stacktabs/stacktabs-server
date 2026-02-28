const express = require("express");
const router = express.Router();

const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

const POLAR_API = "https://api.polar.sh";
const POLAR_SECRET = process.env.POLAR_SECRET;

/* ===== callback after login ===== */

router.get("/polar/callback", async (req, res) => {
  const token = req.query.token;
  const ext = req.query.ext;

  if (!token) {
    return res.send("Login failed");
  }

  res.send(`
    <script>
      chrome.runtime.sendMessage("${ext}", {
        type: "POLAR_TOKEN",
        token: "${token}"
      });
      document.body.innerHTML = "<h2>StackTabs connected successfully. You can close this tab.</h2>";
    </script>
  `);
});

/* ===== verify user ===== */

router.get("/me", async (req, res) => {

  const auth = req.headers.authorization;
  if (!auth) return res.json({ pro:false });

  const token = auth.replace("Bearer ", "");

  try {
    const r = await fetch(POLAR_API + "/v1/customers/me", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const customer = await r.json();

    const subs = await fetch(POLAR_API + "/v1/subscriptions", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const subData = await subs.json();

    const active = subData.data.some(s => s.status === "active");

    res.json({ pro: active });

  } catch {
    res.json({ pro:false });
  }
});

module.exports = router;
