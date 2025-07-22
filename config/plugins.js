module.exports = ({ env }) => ({
  email: {
    provider: "nodemailer",
    providerOptions: {
      host: env("EMAIL_SMTP_HOST"),
      port: env.int("EMAIL_SMTP_PORT"),
      secure: false, // false for port 587
      auth: {
        user: env("EMAIL_SMTP_USERNAME"),
        pass: env("EMAIL_SMTP_PASSWORD"),
      },
      tls: {
        rejectUnauthorized: false,
      },
    },
    settings: {
      defaultFrom: env("EMAIL_FROM"),
      defaultReplyTo: env("EMAIL_FROM"),
    },
  },

  // Upload Configuration
  upload: {
    provider: "cloudinary",
    providerOptions: {
      cloud_name: env("CLOUDINARY_NAME"),
      api_key: env("CLOUDINARY_KEY"),
      api_secret: env("CLOUDINARY_SECRET"),
    },
    actionOptions: {
      upload: {},
      delete: {},
    },
  },
});