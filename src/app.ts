import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { config } from "./config.js";
import { sessionRoutes } from "./modules/sessions/sessions.routes.js";

export function buildApp() {
	// this function is useful for testing the web app
	const fastify = Fastify({ logger: true });

	fastify.register(multipart, {
		limits: {
			files: config.MAX_ALLOWED_FILES,
			fileSize: config.MAX_ALLOWED_FILE_SIZE_BYTES,
		},
	});

	fastify.register(sessionRoutes, { prefix: "/v1/api/sessions" });

	fastify.get("/", (request, reply) => {
		reply.send({ hello: "world" });
	});

	return fastify;
}

const app = buildApp();

export { app };
