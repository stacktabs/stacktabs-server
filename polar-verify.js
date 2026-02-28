const express = require("express");
const router = express.Router();

router.get("/polar/verify", async (req, res) => {

  try {

    const auth = req.headers.authorization;
    if (!auth) return res.json({ active:false });

    const token = auth.replace("Bearer ", "");

    const r = await fetch(
      "https://api.polar.sh/v1/customers/me/subscriptions",
      {
        headers: {
          "Authorization": "Bearer " + token
        }
      }
    );

    const subs = await r.json();

    if (!subs.data || !subs.data.length) {
      return res.json({ active:false });
    }

    const sub = subs.data[0];

    res.json({
      active: sub.status === "active",
      expiresAt: new Date(sub.current_period_end).getTime()
    });

  } catch(e) {
    console.log("Polar verify error", e);
    res.json({ active:false });
  }

});

module.exports = router;
