import dotenv from 'dotenv';
dotenv.config();

export const config = {
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  HOST: process.env.HOST,
  PORT: process.env.PORT,
  TABLE: process.env.TABLE,
  EMAIL_CONFIRM_SECRET: process.env.EMAIL_CONFIRM_SECRET,
  EMAIL: process.env.EMAIL,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  WEATHER_API_KEY: '7aa1c8602ca49506c8ba7266afb761c5',
};
