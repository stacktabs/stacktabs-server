const express = require("express");
const router = express.Router();

const POLAR_SECRET = process.env.POLAR_SECRET;

/* ========= AFTER PAYMENT ========= */
router.get("/polar/success", async (req, res) => {

  const checkoutId = req.query.checkout_id;
  const ext = req.query.ext;

  if (!checkoutId || !ext) {
    return res.send("Invalid payment");
  }

  try {

    /* Verify checkout with Polar */
    const verify = await fetch(
      `https://api.polar.sh/v1/checkouts/${checkoutId}`,
      {
        headers: {
          "Authorization": `Bearer ${POLAR_SECRET}`
        }
      }
    );

    const data = await verify.json();

    /* If payment not completed */
    if (!data || data.status !== "succeeded") {
      return res.send("Payment not completed");
    }

    /* subscription expiry */
    let expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);

    if (data.current_period_end) {
      expiresAt = new Date(data.current_period_end).getTime();
    }

    /* send message to extension */
    res.send(`
      <html>
      <body style="font-family:sans-serif;text-align:center;margin-top:80px;">
        <h2>StackTabs Pro Activated ✓</h2>
        <p>You can close this tab and return to the extension.</p>

        <script>
          try {
            chrome.runtime.sendMessage("${ext}", {
              type: "POLAR_PRO",
              expiresAt: ${expiresAt}
            });
          } catch(e) {}

          setTimeout(() => window.close(), 1500);
        </script>
      </body>
      </html>
    `);

  } catch (e) {
    console.log("Polar success verify error:", e);
    res.send("Verification failed");
  }
});

module.exports = router;
