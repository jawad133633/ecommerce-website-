const requireUser = require("./requireUser");

function optionalUser(req, res, next) {
  if (!req.get("authorization")) return next();
  return requireUser(req, res, next);
}

module.exports = optionalUser;
