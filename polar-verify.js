import express from "express";
import fetch from "node-fetch";

const router = express.Router();
const POLAR_SECRET = process.env.POLAR_SECRET;

router.get("/polar/verify", async (req, res) => {

  try {

    const r = await fetch(
      "https://api.polar.sh/v1/customers/me/subscriptions",
      {
        headers: {
          "Authorization": `Bearer ${POLAR_SECRET}`
        }
      }
    );

    const subs = await r.json();

    if (!subs.length) {
      return res.json({ active:false });
    }

    const sub = subs[0];

    res.json({
      active: sub.status === "active",
      expiresAt: new Date(sub.current_period_end).getTime()
    });

  } catch(e) {
    res.json({ active:false });
  }

});

export default router;
