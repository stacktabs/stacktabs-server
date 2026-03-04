const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

const POLAR_SECRET = process.env.POLAR_SECRET;

/* YOUR POLAR CHECKOUT LINK */
const CHECKOUT_LINK = "polar_cl_g2hL2pi9scVGQGw8JAz36Fuvq2RMKYpFHejr23CzaZ5";

router.get("/polar/create-checkout", async (req, res) => {

  const device = req.query.device;

  if (!device) {
    return res.status(400).json({ error: "Missing device id" });
  }

  try {

    const polarRes = await fetch("https://api.polar.sh/v1/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${POLAR_SECRET}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        checkout_link: CHECKOUT_LINK,
        metadata: {
          device: device
        }
      })
    });

    const data = await polarRes.json();

    if (!data.url) {
      console.log("Polar error:", data);
      return res.status(500).json({ error: "Polar checkout creation failed" });
    }

    res.json({
      url: data.url
    });

  } catch (err) {

    console.log("Checkout error:", err);

    res.status(500).json({
      error: "checkout error"
    });
  }

});

module.exports = router;
