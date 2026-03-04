const express = require("express");
const router = express.Router();

const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

const POLAR_SECRET = process.env.POLAR_SECRET;

/* This checkout link contains ALL plans */
const CHECKOUT_LINK = "polar_cl_g2hL2pi9scVGQGw8JAz36Fuvq2RMKYpFHejr23CzaZ5";

router.get("/polar/create-checkout", async (req, res) => {

  const device = req.query.device;

  if (!device) {
    return res.status(400).send("Missing device");
  }

  try {

    const r = await fetch("https://api.polar.sh/v1/checkouts", {
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

    const data = await r.json();

    res.json({
      url: data.url
    });

  } catch (e) {
    console.log(e);
    res.status(500).send("checkout error");
  }

});

module.exports = router;
