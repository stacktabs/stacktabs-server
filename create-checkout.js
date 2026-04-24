const express = require("express");
const router = express.Router();

const CHECKOUT_LINK =
  "https://buy.polar.sh/polar_cl_dRYWJwOVoWKCyN6KeeUKZYeT98wlVvMn7P9ED3tfxeu";

router.get("/polar/create-checkout", (req, res) => {

  let email = req.query.email;

  if (email) {
    email = email.toLowerCase().trim();
  }

  if (!email) {
    return res.status(400).json({ error: "Missing email" });
  }

  const url =
    CHECKOUT_LINK + "?customer_email=" + encodeURIComponent(email);

  res.json({ url });

});

module.exports = router;
