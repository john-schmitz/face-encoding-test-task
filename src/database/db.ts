import { drizzle } from "drizzle-orm/libsql";
import { config } from "../config.js";

export const db = drizzle(config.DATABASE_URL);
