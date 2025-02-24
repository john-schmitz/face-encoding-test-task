import supertest from "supertest";
import { app, buildApp } from "../../src/app.js";

let fastify = buildApp();

describe("Sessions API", () => {
	beforeEach(() => {
		fastify = buildApp();
	});

	afterEach(() => {
		fastify.close();
	});

	describe("POST /v1/api/sessions", () => {
		it("should create a new session with valid images", async () => {
			const response = await fastify.inject({
				method: "GET",
				url: "/",
			});

			expect(response).toBeDefined();
			expect(response?.statusCode).toBe(200);
			expect(response?.headers["content-type"]).toBe("application/json; charset=utf-8");
			expect(JSON.parse(response?.payload as string)).toStrictEqual({ hello: "world" });
		});
	});
});
