const express = require("express");
const router = express.Router();

const CHECKOUT_LINK =
  "https://buy.polar.sh/polar_cl_dRYWJwOVoWKCyN6KeeUKZYeT98wlVvMn7P9ED3tfxeu";

router.get("/polar/create-checkout", (req, res) => {

  const device = req.query.device;

  if (!device) {
    return res.status(400).json({ error: "Missing device id" });
  }

  const url =
    CHECKOUT_LINK + "?metadata_device=" + encodeURIComponent(device);

  res.json({ url });

});

module.exports = router;
