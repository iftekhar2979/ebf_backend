export const mockMailerService = {
  sendMail: jest.fn(),
};

const mockConfigValues = {
  NODE_ENV: "test",
  DB_HOST: "localhost",
  DB_PORT: 5432,
  DB_USER: "postgres",
  DB_PASSWORD: "sipusipu18",
  DATABASE: "nest-template",
  JWT_SECRET: "my-super-secret-token-for-jwt",
  EXPIRES_IN: "10h",
  EMAIL_USERNAME: "b12a3670e34e58",
  EMAIL_PASSWORD: "7144d3e5521501",
  EMAIL_HOST: "smtp.mailtrap.io",
  EMAIL_PORT: "2525",
  THROTTLE_TTL: 60,
  THROTTLE_LIMIT: 10,
  GOOGLE_CLIENT_ID: "<TO_BE_FILLED_BY_USER>",
  GOOGLE_CLIENT_SECRET: "<TO_BE_FILLED_BY_USER>",
  FR_BASE_URL: "<TO_BE_FILLED_BY_USER>",
};

export const mockConfigService = {
  get: jest.fn((key: string) => mockConfigValues[key]),
};
