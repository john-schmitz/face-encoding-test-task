import { randomUUID } from "node:crypto";
import { type Client, createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { buildApp } from "../../src/app.js";
import { config } from "../../src/config.js";
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

function createTestImageBuffer() {
	return defaultFileBuffer;
}

function createFileUpload(filename = "test-image.jpg", buffer = createTestImageBuffer()) {
	return {
		type: "file",
		fieldname: "file",
		filename,
		encoding: "7bit",
		mimetype: "image/jpeg",
		buffer,
	};
}

function createMultipartPayload(
	files: Array<{
		fieldName?: string;
		filename: string;
		buffer: Buffer;
		contentType?: string;
	}>,
) {
	const boundary = "X-TEST-BOUNDARY";

	const parts: string[] = [];

	files.forEach((file, index) => {
		const fieldName = file.fieldName || `file${index + 1}`;
		const contentType = file.contentType || "image/jpeg";

		parts.push(`--${boundary}`);
		parts.push(`Content-Disposition: form-data; name="${fieldName}"; filename="${file.filename}"`);
		parts.push(`Content-Type: ${contentType}`);
		parts.push("");
		parts.push(file.buffer.toString("binary"));
	});

	parts.push(`--${boundary}--`);

	const payloadString = parts.join("\r\n");

	return {
		payload: Buffer.from(payloadString, "binary"),
		headers: {
			"content-type": `multipart/form-data; boundary=${boundary}`,
		},
	};
}

const defaultFileBuffer = Buffer.from(
	"R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
	"base64",
);

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

			expect(sessions[0].sumary).toBeInstanceOf(Array);
			expect(sessions[1].sumary).toBeInstanceOf(Array);
			expect(sessions[0].sumary[0].fileName).toBe("image2.jpg");
			expect(sessions[1].sumary[0].fileName).toBe("image1.jpg");
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
});
