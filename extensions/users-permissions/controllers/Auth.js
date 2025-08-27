const { sanitizeEntity } = require("strapi-utils");
const crypto = require("crypto");
const _ = require("lodash");

module.exports = {
  async forgotPassword(ctx) {
    const { email } = ctx.request.body;

    if (!email) {
      return ctx.badRequest("Email is required");
    }

    const user = await strapi
      .query("user", "users-permissions")
      .findOne({ email });

    if (!user) {
      return ctx.badRequest("This email does not exist");
    }

    // Generate reset token
    const resetPasswordToken = crypto.randomBytes(64).toString("hex");
    const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    // Update user with reset token
    await strapi
      .query("user", "users-permissions")
      .update({ id: user.id }, { resetPasswordToken, resetPasswordExpires });

    try {
      console.log("Email config check:");
      console.log("HOST:", process.env.EMAIL_SMTP_HOST);
      console.log("PORT:", process.env.EMAIL_SMTP_PORT);
      console.log("USERNAME:", process.env.EMAIL_SMTP_USERNAME);
      console.log(
        "PASSWORD:",
        process.env.EMAIL_SMTP_PASSWORD ? "SET" : "NOT SET"
      );
      console.log("FROM:", process.env.EMAIL_FROM);
      // Send email with timeout handling
      const emailPromise = strapi.plugins["email"].services.email.send({
        to: email,
        from: process.env.EMAIL_FROM || "noreply@yourapp.com",
        subject: "Reset your password",
        html: `
          <h1>Reset Password</h1>
          <p>You requested a password reset</p>
          <p>Click this <a href="${process.env.FRONTEND_URL}/account/resetPassword?token=${resetPasswordToken}">link</a> to reset your password</p>
          <p>This link will expire in 1 hour</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });

      // Add timeout (10 seconds)
      await Promise.race([
        emailPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Email timeout")), 10000)
        ),
      ]);

      ctx.send({ message: "Password reset email sent successfully" });
    } catch (err) {
      console.error("Email sending error:", err);

      // For development, still return token if email fails
      if (process.env.NODE_ENV === "development") {
        return ctx.send({
          message: "Email failed, but here is your token for testing",
          token: resetPasswordToken,
          error: err.message,
        });
      }

      return ctx.badRequest(
        "Failed to send reset email. Please try again later."
      );
    }
  },

  async resetPassword(ctx) {
    const { token, password, passwordConfirmation } = ctx.request.body;

    if (!token || !password || !passwordConfirmation) {
      return ctx.badRequest(
        "Token, password and password confirmation are required"
      );
    }

    if (password !== passwordConfirmation) {
      return ctx.badRequest("Passwords do not match");
    }

    if (password.length < 6) {
      return ctx.badRequest("Password must be at least 6 characters");
    }

    const user = await strapi.query("user", "users-permissions").findOne({
      resetPasswordToken: token,
    });

    if (!user) {
      return ctx.badRequest("Invalid token");
    }

    if (new Date() > new Date(user.resetPasswordExpires)) {
      return ctx.badRequest("Token has expired");
    }

    // Hash the new password
    const hashedPassword = await strapi.plugins[
      "users-permissions"
    ].services.user.hashPassword({ password });

    // Update user password and clear reset token
    await strapi.query("user", "users-permissions").update(
      { id: user.id },
      {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      }
    );

    ctx.send({ message: "Password has been reset successfully" });
  },

  async register(ctx) {
    const { username, email, password } = ctx.request.body;

    // Validasi input dasar
    if (!username || !email || !password) {
      return ctx.badRequest("Username, email and password are required");
    }

    if (!username || username.trim() === "") {
      return ctx.badRequest("Employee number is required");
    }

    if (password.length < 6) {
      return ctx.badRequest("Password must be at least 6 characters");
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ctx.badRequest("Invalid email format");
    }

    // Panggil service validasi eksternal
    let check;
    try {
      check = await fetch("http://10.24.0.155:3030/api/validate-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nik: username }),
      });
    } catch (err) {
      return ctx.badRequest("Validation service unavailable");
    }

    // Setelah fetch
    const checkJson = await check.json();
    if (!checkJson.success) {
      return ctx.badRequest("NIK is not valid");
    }

    // Cek user dengan username sama
    const existingUser = await strapi
      .query("user", "users-permissions")
      .findOne({ username });

    if (existingUser) {
      return ctx.badRequest("NIK is already taken");
    }

    // Cek user dengan email sama
    const existingEmail = await strapi
      .query("user", "users-permissions")
      .findOne({ email: email.toLowerCase() });

    if (existingEmail) {
      return ctx.badRequest("Email is already registered");
    }

    // Hash password
    const hashedPassword = await strapi.plugins[
      "users-permissions"
    ].services.user.hashPassword({ password });

    // Cari role default "authenticated"
    const defaultRole = await strapi
      .query("role", "users-permissions")
      .findOne({ type: "authenticated" });

    if (!defaultRole) {
      return ctx.badRequest("No default role found");
    }

    // Buat user baru
    const newUser = await strapi.query("user", "users-permissions").create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: defaultRole.id,
      confirmed: true, // set true jika tidak pakai email confirmation
      blocked: false,
    });

    // Issue JWT
    const jwt = strapi.plugins["users-permissions"].services.jwt.issue({
      id: newUser.id,
    });

    // Hilangkan password dari response
    delete newUser.password;

    return ctx.send({
      message: "User registered successfully",
      jwt,
      user: newUser,
    });
  },
};
