const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");

// ================= GOOGLE LOGIN =================

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();

        if (!email) {
          return done(
            new Error("Google account se email nahi mila.")
          );
        }

        let user = await User.findOne({ email });

        if (!user) {
          const randomPassword = crypto.randomBytes(32).toString("hex");
          const hashedPassword = await bcrypt.hash(randomPassword, 10);

          user = await User.create({
            name: profile.displayName || "Google User",
            email,
            password: hashedPassword
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// ================= FACEBOOK LOGIN =================

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "http://localhost:5000/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails"]
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();

        if (!email) {
          return done(
            new Error(
              "Facebook se email nahi mila. Email access allow karein."
            )
          );
        }

        let user = await User.findOne({ email });

        if (!user) {
          const randomPassword = crypto.randomBytes(32).toString("hex");
          const hashedPassword = await bcrypt.hash(randomPassword, 10);

          user = await User.create({
            name: profile.displayName || "Facebook User",
            email,
            password: hashedPassword
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

module.exports = passport;