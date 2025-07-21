module.exports = ({ env }) => ({
  defaultConnection: "default",
  connections: {
    default: {
      connector: "bookshelf",
      settings: {
        client: "mysql",
        host: env("DATABASE_HOST", "10.24.0.155"),
        port: env.int("DATABASE_PORT", 13306),
        database: env("DATABASE_NAME", "great-api-2"),
        username: env("DATABASE_USERNAME", "root"),
        password: env("DATABASE_PASSWORD", "12qwaszx"),
        ssl: env.bool("DATABASE_SSL", false),
      },
      options: {},
    },
  },
});
