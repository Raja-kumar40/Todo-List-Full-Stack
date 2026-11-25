const express = require("express");
const passport = require("../config/passport");
const jwt = require("jsonwebtoken");

const router = express.Router();

// JWT generate karne ka function
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// ================= GOOGLE AUTH =================

// Google login start
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
);

// Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/?socialError=google`
  }),
  (req, res) => {
    const token = generateToken(req.user);

    res.redirect(
      `${process.env.FRONTEND_URL}/?token=${token}&provider=google`
    );
  }
);

// ================= FACEBOOK AUTH =================

// Facebook login start
router.get(
  "/facebook",
  passport.authenticate("facebook", {
    scope: ["email"]
  })
);

// Facebook callback
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/?socialError=facebook`
  }),
  (req, res) => {
    const token = generateToken(req.user);

    res.redirect(
      `${process.env.FRONTEND_URL}/?token=${token}&provider=facebook`
    );
  }
);

module.exports = router;