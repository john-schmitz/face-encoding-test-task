import { drizzle } from "drizzle-orm/libsql";
import { config } from "../config.js";

export function DbFactory({ DATABASE_URL }: { DATABASE_URL: string }) {
	return drizzle(DATABASE_URL);
}

export const db = drizzle(config.DATABASE_URL);
export type Db = typeof db;
