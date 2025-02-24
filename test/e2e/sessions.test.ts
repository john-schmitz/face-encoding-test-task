import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { buildApp } from "../../src/app.js";
import { config } from "../../src/config.js";
import { randomUUID } from "node:crypto";
import { sessions } from "../../src/database/schema.js";

let fastify = buildApp();
let client: Client | undefined;

const userId = randomUUID();

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
			expect(body.data.length).toBe(0); // Should be empty initially
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
			const dummyImageBuffer = Buffer.from(
				"R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
				"base64",
			);
			const boundary = "X-TEST-BOUNDARY";
			const fileContent = dummyImageBuffer.toString("binary");

			// Create first session
			const payload1 = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="file"; filename="test-image1.jpg"',
				"Content-Type: image/jpeg",
				"",
				fileContent,
				`--${boundary}--`,
			].join("\r\n");

			await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					userid: userId,
					"content-type": `multipart/form-data; boundary=${boundary}`,
				},
				payload: Buffer.from(payload1, "binary"),
			});

			// Create second session
			const payload2 = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="file"; filename="test-image2.jpg"',
				"Content-Type: image/jpeg",
				"",
				fileContent,
				`--${boundary}--`,
			].join("\r\n");

			await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					userid: userId,
					"content-type": `multipart/form-data; boundary=${boundary}`,
				},
				payload: Buffer.from(payload2, "binary"),
			});

			// Now list the sessions
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
			expect(body.data.length).toBe(2); // Should have 2 sessions now
			expect(body.metadata.totalItems).toBe(2);

			// Verify the session data
			const sessions = body.data;
			expect(sessions[0].userId).toBe(userId);
			expect(sessions[1].userId).toBe(userId);

			// Verify the session summaries
			expect(sessions[0].sumary).toBeInstanceOf(Array);
			expect(sessions[1].sumary).toBeInstanceOf(Array);
			expect(sessions[0].sumary[0].fileName).toBe("test-image2.jpg"); // Most recent first due to DESC order
			expect(sessions[1].sumary[0].fileName).toBe("test-image1.jpg");
		});

		it("should maintain isolation between different users' sessions", async () => {
			const user2 = "isolation-test-user-2";
			const dummyImageBuffer = Buffer.from(
				"R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
				"base64",
			);
			const boundary = "X-TEST-BOUNDARY";
			const fileContent = dummyImageBuffer.toString("binary");

			// Create session for user1
			const payload1 = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="file"; filename="user1-image.jpg"',
				"Content-Type: image/jpeg",
				"",
				fileContent,
				`--${boundary}--`,
			].join("\r\n");

			await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					userid: userId,
					"content-type": `multipart/form-data; boundary=${boundary}`,
				},
				payload: Buffer.from(payload1, "binary"),
			});

			// Create session for user2
			const payload2 = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="file"; filename="user2-image.jpg"',
				"Content-Type: image/jpeg",
				"",
				fileContent,
				`--${boundary}--`,
			].join("\r\n");

			await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					userid: user2,
					"content-type": `multipart/form-data; boundary=${boundary}`,
				},
				payload: Buffer.from(payload2, "binary"),
			});

			// Check user1's sessions
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
			expect(user1Body.data[0].sumary[0].fileName).toBe("user1-image.jpg");

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
			expect(user2Body.data[0].sumary[0].fileName).toBe("user2-image.jpg");
		});
	});

	describe("POST /v1/api/sessions", () => {
		it("should create a new session with valid images", async () => {
			const dummyImageBuffer = Buffer.from(
				"R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
				"base64",
			);

			const boundary = "X-TEST-BOUNDARY";
			const fileContent = dummyImageBuffer.toString("binary");

			const payload = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="file"; filename="test-image.jpg"',
				"Content-Type: image/jpeg",
				"",
				fileContent,
				`--${boundary}--`,
			].join("\r\n");

			const response = await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					userid: "test-user-123",
					"content-type": `multipart/form-data; boundary=${boundary}`,
				},
				payload: Buffer.from(payload, "binary"),
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);
			expect(body).toBeDefined();
			expect(body.id).toBeDefined();
			expect(body.userId).toBe("test-user-123");
			expect(body.sumary).toBeInstanceOf(Array);
			expect(body.sumary.length).toBe(1);
			expect(body.sumary[0].fileName).toBe("test-image.jpg");
			expect(body.sumary[0].faces).toBeInstanceOf(Array);

			const listResponse = await fastify.inject({
				method: "GET",
				url: "/v1/api/sessions",
				headers: {
					userid: "test-user-123",
				},
			});

			const listBody = JSON.parse(listResponse.payload);
			expect(listBody.data.length).toBe(1);
			expect(listBody.data[0].id).toBe(body.id);
		});

		it("should return 401 when userid header is missing", async () => {
			const dummyImageBuffer = Buffer.from(
				"R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
				"base64",
			);

			const response = await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					"content-type": "multipart/form-data",
				},
				payload: {
					file: {
						type: "file",
						filename: "test-image.jpg",
						encoding: "7bit",
						buffer: dummyImageBuffer,
					},
				},
			});

			expect(response.statusCode).toBe(401);
			const body = JSON.parse(response.payload);
			expect(body.error).toBe("Invalid userid");
		});

		it("should handle multiple files upload", async () => {
			const dummyImageBuffer = Buffer.from(
				"R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
				"base64",
			);

			const boundary = "X-TEST-BOUNDARY";
			const fileContent = dummyImageBuffer.toString("binary");

			const payload = [
				`--${boundary}`,
				'Content-Disposition: form-data; name="file1"; filename="test-image1.jpg"',
				"Content-Type: image/jpeg",
				"",
				fileContent,
				`--${boundary}`,
				'Content-Disposition: form-data; name="file2"; filename="test-image2.jpg"',
				"Content-Type: image/jpeg",
				"",
				fileContent,
				`--${boundary}--`,
			].join("\r\n");

			const response = await fastify.inject({
				method: "POST",
				url: "/v1/api/sessions",
				headers: {
					userid: "test-user-123",
					"content-type": `multipart/form-data; boundary=${boundary}`,
				},
				payload: Buffer.from(payload, "binary"),
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);
			expect(body.sumary.length).toBe(2);
		});
	});
});
