import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
	sumary: text({ mode: "json" }).$type<
		{
			fileName: string;
			faces: number[][];
		}[]
	>(),
});
