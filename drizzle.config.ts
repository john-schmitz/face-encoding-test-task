import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync(".env")) {
	// for when running locally
	process.loadEnvFile(".env");
}

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL not set!");
}

export default defineConfig({
	out: "./drizzle",
	schema: "./src/database/schema.ts",
	dialect: "sqlite",
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},
});
