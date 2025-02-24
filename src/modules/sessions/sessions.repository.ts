import { eq, sql } from "drizzle-orm";
import { db } from "../../database/db.js";
import { sessions } from "../../database/schema.js";

export type CreateSession = typeof sessions.$inferInsert;
export type Session = typeof sessions.$inferSelect;

export interface PaginationParams {
	page?: number;
	limit?: number;
}

export interface PaginatedResult<T> {
	data: T[];
	metadata: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
		itemsPerPage: number;
	};
}

export class SessionsRepository {
	async createSession(session: CreateSession): Promise<void> {
		await db.insert(sessions).values(session);
	}

	async getSessionById(id: string): Promise<Session | undefined> {
		const result = await db
			.select()
			.from(sessions)
			.where(eq(sessions.id, id))
			.limit(1);

		return result[0];
	}

	async listSessions(
		userId: string,
		{ page = 1, limit = 10 }: PaginationParams = {},
	): Promise<PaginatedResult<Session>> {
		const validPage = Math.max(1, page);
		const validLimit = Math.max(1, Math.min(100, limit));
		const offset = (validPage - 1) * validLimit;

		const result = await db
			.select({ count: sql<number>`count(*)` })
			.from(sessions)
			.where(eq(sessions.userId, userId));

		const data = await db
			.select()
			.from(sessions)
			.where(eq(sessions.userId, userId))
			.limit(validLimit)
			.offset(offset);

		const totalItems = result.at(0)?.count ?? 0;
		const totalPages = Math.ceil(totalItems / validLimit);

		return {
			data,
			metadata: {
				currentPage: validPage,
				totalPages,
				totalItems,
				itemsPerPage: validLimit,
			},
		};
	}

	async updateSession(
		id: string,
		data: Partial<Omit<CreateSession, "id">>,
	): Promise<void> {
		await db.update(sessions).set(data).where(eq(sessions.id, id));
	}

	async deleteSession(id: string): Promise<void> {
		await db.delete(sessions).where(eq(sessions.id, id));
	}
}
