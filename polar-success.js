const express = require("express");
const router = express.Router();

router.get("/polar/success", (req, res) => {
  res.send(`
    <html>
      <body style="font-family:sans-serif;text-align:center;margin-top:80px;">
        <h2>Payment Successful ✓</h2>
        <p>Return to StackTabs. Your Pro features will activate automatically within a few seconds.</p>
        <script>
          setTimeout(() => window.close(), 4000);
        </script>
      </body>
    </html>
  `);
});

module.exports = router;
