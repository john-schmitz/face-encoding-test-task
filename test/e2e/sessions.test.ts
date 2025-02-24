import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { buildApp } from "../../src/app.js";
import { config } from "../../src/config.js";

let fastify = buildApp();

async function setupTestDatabase() {
	if (!config.DATABASE_URL.includes("test")) {
		throw new Error("Test must use a test database! Check your .env.test file.");
	}

	const client = createClient({
		url: config.DATABASE_URL,
	});

	const db = drizzle(client);

	await migrate(db, { migrationsFolder: "drizzle" });

	client.close();
}

describe("Sessions API", () => {
	beforeEach(async () => {
		fastify = buildApp();
		await setupTestDatabase();
	});

	afterEach(() => {
		fastify.close();
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
	describe("GET /v1/api/sessions", () => {
		it("should list sessions for a user", async () => {
			const response = await fastify.inject({
				method: "GET",
				url: "/v1/api/sessions",
				headers: {
					userid: "test-user-123",
				},
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.payload);
			expect(body).toBeDefined();
			expect(body.data).toBeInstanceOf(Array);
			expect(body.metadata).toBeDefined();
			expect(body.metadata.currentPage).toBeDefined();
			console.error(body.data);
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
	});
});
