import { randomUUID } from "node:crypto";
import { type Client, createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { buildApp } from "../../src/app.js";
import { config } from "../../src/config.js";
import { container } from "../../src/container.js";
import { sessions } from "../../src/database/schema.js";
import { FaceEncodingService } from "../../src/modules/face-encoding/face-encoding.service.js";
import { MockFaceEncodingService, createMultipartPayload, defaultFileBuffer } from "../utils.js";

let fastify = buildApp();
let client: Client | undefined;

const userId = randomUUID();

container.register(FaceEncodingService, {
	useClass: MockFaceEncodingService,
});

async function setupTestDatabase() {
	if (!config.DATABASE_URL.includes("test")) {
		throw new Error("Test must use a test database! Check your .env.test file.");
	}

	client = createClient({
		url: config.DATABASE_URL,
	});

	const db = drizzle(client);

	await migrate(db, { migrationsFolder: "drizzle" });
	await db.delete(sessions);

	client.close();
}

describe("Sessions API", () => {
	beforeEach(async () => {
		fastify = buildApp();
		await setupTestDatabase();
	});

	afterEach(async () => {
		await fastify.close();
		client?.close();
	});

	describe("GET /", () => {
		it("should return hello world", async () => {
			const response = await fastify.inject({
				method: "GET",
				url: "/",
			});

			expect(response).toBeDefined();
			expect(response.statusCode).toBe(200);
			expect(response.headers["content-type"]).toBe("application/json; charset=utf-8");
			expect(JSON.parse(response.payload)).toStrictEqual({ hello: "world" });
		});
	});

	describe("GET /v1/api/sessions", () => {
		it("should initially return empty list of sessions for a new user", async () => {
			const response = await fastify.inject({
				method: "GET",
				url: "/v1/api/sessions",
				headers: {
					userid: userId,
				},
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);
			expect(body).toBeDefined();
			expect(body.data).toBeInstanceOf(Array);
			expect(body.data.length).toBe(0);
			expect(body.metadata).toBeDefined();
			expect(body.metadata.currentPage).toBe(1);
			expect(body.metadata.totalItems).toBe(0);
		});

		it("should return 401 when userid header is missing", async () => {
			const response = await fastify.inject({
				method: "GET",
				url: "/v1/api/sessions",
			});

			expect(response.statusCode).toBe(401);
			const body = JSON.parse(response.payload);
			expect(body.error).toBe("Invalid userid");
		});

		it("should create and then list multiple sessions for a user", async () => {
			const upload1 = createMultipartPayload([
				{
					filename: "image1.jpg",
					buffer: defaultFileBuffer,
				},
			]);

			const upload2 = createMultipartPayload([
				{
					filename: "image2.jpg",
					buffer: defaultFileBuffer,
				},
			]);

			await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					...upload1.headers,
					userid: userId,
				},
				payload: upload1.payload,
			});

			await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					...upload2.headers,
					userid: userId,
				},
				payload: upload2.payload,
			});

			const listResponse = await fastify.inject({
				method: "GET",
				url: "/v1/api/sessions",
				headers: {
					userid: userId,
				},
			});

			expect(listResponse.statusCode).toBe(200);
			const body = JSON.parse(listResponse.payload);
			expect(body.data).toBeInstanceOf(Array);
			expect(body.data.length).toBe(2);
			expect(body.metadata.totalItems).toBe(2);

			const sessions = body.data;
			expect(sessions[0].userId).toBe(userId);
			expect(sessions[1].userId).toBe(userId);
		});

		it("should maintain isolation between different users' sessions", async () => {
			const user2 = "isolation-test-user-2";

			const upload1 = createMultipartPayload([
				{
					filename: "user1-image.jpg",
					buffer: defaultFileBuffer,
				},
			]);

			const upload2 = createMultipartPayload([
				{
					filename: "user2-image.jpg",
					buffer: defaultFileBuffer,
				},
			]);

			await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					...upload1.headers,
					userid: userId,
				},
				payload: upload1.payload,
			});

			await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					...upload2.headers,
					userid: user2,
				},
				payload: upload2.payload,
			});

			const user1Response = await fastify.inject({
				method: "GET",
				url: "/v1/api/sessions",
				headers: {
					userid: userId,
				},
			});

			const user1Body = JSON.parse(user1Response.payload);
			expect(user1Body.data.length).toBe(1);
			expect(user1Body.data[0].userId).toBe(userId);

			const user2Response = await fastify.inject({
				method: "GET",
				url: "/v1/api/sessions",
				headers: {
					userid: user2,
				},
			});

			const user2Body = JSON.parse(user2Response.payload);
			expect(user2Body.data.length).toBe(1);
			expect(user2Body.data[0].userId).toBe(user2);
		});
	});

	describe("POST /v1/api/sessions", () => {
		it("should create a new session with valid images", async () => {
			const files = [
				{
					filename: "image.jpg",
					buffer: defaultFileBuffer,
				},
			];
			const { payload, headers } = createMultipartPayload(files);

			const response = await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					...headers,
					userid: userId,
				},
				payload: payload,
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);
			expect(body).toBeDefined();
			expect(body.id).toBeDefined();
			expect(body.userId).toBe(userId);
			expect(body.sumary).toBeInstanceOf(Array);
			expect(body.sumary.length).toBe(1);
			expect(body.sumary[0].fileName).toBe(files[0]?.filename);
			expect(body.sumary[0].faces).toBeInstanceOf(Array);

			const listResponse = await fastify.inject({
				method: "GET",
				url: "/v1/api/sessions",
				headers: {
					userid: userId,
				},
			});

			const listBody = JSON.parse(listResponse.payload);
			expect(listBody.data.length).toBe(1);
			expect(listBody.data[0].id).toBe(body.id);
		});

		it("should return 401 when userid header is missing", async () => {
			const files = [
				{
					filename: "image.jpg",
					buffer: defaultFileBuffer,
				},
			];
			const { payload, headers } = createMultipartPayload(files);

			const response = await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					...headers,
				},
				payload: payload,
			});

			expect(response.statusCode).toBe(401);
			const body = JSON.parse(response.payload);
			expect(body.error).toBe("Invalid userid");
		});

		it("should handle multiple files upload", async () => {
			const files = [
				{
					filename: "file1",
					buffer: defaultFileBuffer,
				},
				{
					filename: "file2",
					buffer: defaultFileBuffer,
				},
			];
			const { payload, headers } = createMultipartPayload(files);

			const response = await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					...headers,
					userid: userId,
				},
				payload: payload,
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);
			expect(body.sumary.length).toBe(2);
		});
	});

	describe("GET /v1/api/sessions/:id", () => {
		it("should return a session by ID", async () => {
			const files = [
				{
					filename: "test-image.jpg",
					buffer: defaultFileBuffer,
				},
			];
			const { payload: createPayload, headers } = createMultipartPayload(files);

			const createResponse = await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					...headers,
					userid: userId,
				},
				payload: createPayload,
			});

			const createdSession = JSON.parse(createResponse.payload);
			const sessionId = createdSession.id;

			const getResponse = await fastify.inject({
				method: "GET",
				url: `/v1/api/sessions/${sessionId}`,
				headers: {
					userid: userId,
				},
			});

			expect(getResponse.statusCode).toBe(200);
			const session = JSON.parse(getResponse.payload);
			expect(session).toBeDefined();
			expect(session.id).toBe(sessionId);
			expect(session.userId).toBe(userId);
			expect(session.sumary).toBeInstanceOf(Array);
			expect(session.sumary[0].fileName).toBe(files[0]?.filename);
		});

		it("should return 404 for non-existent session", async () => {
			const response = await fastify.inject({
				method: "GET",
				url: "/v1/api/sessions/non-existent-id",
				headers: {
					userid: userId,
				},
			});

			expect(response.statusCode).toBe(404);
			const body = JSON.parse(response.payload);
			expect(body.error).toBe("Session not found");
		});

		it("should return 404 when trying to access another user's session", async () => {
			const files = [
				{
					filename: "user1-image.jpg",
					buffer: defaultFileBuffer,
				},
			];
			const { payload: createPayload, headers } = createMultipartPayload(files);

			const createResponse = await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					...headers,
					userid: userId,
				},
				payload: createPayload,
			});

			const createdSession = JSON.parse(createResponse.payload);
			const sessionId = createdSession.id;

			const user2 = "different-user";
			const getResponse = await fastify.inject({
				method: "GET",
				url: `/v1/api/sessions/${sessionId}`,
				headers: {
					userid: user2,
				},
			});

			expect(getResponse.statusCode).toBe(404);
		});

		it("should return 401 when userid header is missing", async () => {
			const response = await fastify.inject({
				method: "GET",
				url: "/v1/api/sessions/some-id",
			});

			expect(response.statusCode).toBe(401);
			const body = JSON.parse(response.payload);
			expect(body.error).toBe("Invalid userid");
		});
	});
});
