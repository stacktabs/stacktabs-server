const express = require("express");
const router = express.Router();

/* your Polar checkout link */
const CHECKOUT_URL =
  "https://buy.polar.sh/polar_cl_g2hL2pi9scVGQGw8JAz36Fuvq2RMKYpFHejr23CzaZ5";

router.get("/polar/create-checkout", async (req, res) => {

  const device = req.query.device;

  if (!device) {
    return res.status(400).json({ error: "missing device id" });
  }

  try {

    /* attach device id to checkout */
    const url =
      CHECKOUT_URL + "?metadata_device=" + encodeURIComponent(device);

    res.json({
      url: url
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "checkout error"
    });
  }
});

module.exports = router;
