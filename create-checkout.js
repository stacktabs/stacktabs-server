const express = require("express");
const router = express.Router();

const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

const POLAR_SECRET = process.env.POLAR_SECRET;

router.get("/polar/create-checkout", async (req, res) => {

  const device = req.query.device;
  const productId = req.query.product;

  if (!device || !productId) {
    return res.status(400).send("Missing device or product");
  }

  try {

    const r = await fetch("https://api.polar.sh/v1/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${POLAR_SECRET}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        product_id: productId,
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
