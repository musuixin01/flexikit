export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'flexikit',
    password: process.env.DB_PASSWORD || 'flexikit123',
    database: process.env.DB_NAME || 'flexikit_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secret',
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL || process.env.JWT_EXPIRES_IN || '30m',
    refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || '30d',
  },
});
