import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const POLAR_SECRET = process.env.POLAR_SECRET;

/* ========= AFTER PAYMENT ========= */
router.get("/polar/success", async (req, res) => {

  const checkoutId = req.query.checkout_id;
  const ext = req.query.ext;

  if (!checkoutId) {
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

    /* If payment completed */
    if (data.status !== "succeeded") {
      return res.send("Payment not completed");
    }

    /* subscription expiry */
    const expiresAt = new Date(data.current_period_end).getTime();

    res.send(`
      <script>
        chrome.runtime.sendMessage("${ext}", {
          type: "POLAR_PRO",
          expiresAt: ${expiresAt}
        });

        document.body.innerHTML =
        "<h2>StackTabs Pro Activated ✓</h2><p>You can close this tab.</p>";
      </script>
    `);

  } catch (e) {
    res.send("Verification failed");
  }
});

export default router;
