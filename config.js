import dotenv from 'dotenv';
dotenv.config();

export const config = {
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  HOST: process.env.HOST,
  PORT: process.env.PORT,
  TABLE: process.env.TABLE,
};
