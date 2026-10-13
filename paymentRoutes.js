const express = require("express");

const router = express.Router();

function isEasyPaisaConfigured() {
  return Boolean(
    process.env.EASYPAISA_ACCOUNT_TITLE?.trim() &&
      process.env.EASYPAISA_ACCOUNT_NUMBER?.trim()
  );
}

router.get("/config", (req, res) => {
  const enabled = isEasyPaisaConfigured();
  return res.json({
    cashOnDelivery: { enabled: true },
    easypaisa: {
      enabled,
      ...(enabled
        ? {
            accountTitle: process.env.EASYPAISA_ACCOUNT_TITLE.trim(),
            accountNumber: process.env.EASYPAISA_ACCOUNT_NUMBER.trim(),
          }
        : {}),
    },
  });
});

module.exports = router;
module.exports.isEasyPaisaConfigured = isEasyPaisaConfigured;
