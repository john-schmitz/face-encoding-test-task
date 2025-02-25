import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";
import { sessionRoutes } from "./modules/sessions/sessions.routes.js";

export function buildApp() {
	const fastify = Fastify({ logger: true });

	fastify.register(swagger, {
		mode: "static",
		specification: {
			document: JSON.parse(readFileSync(join(process.cwd(), "swagger.json"), "utf8")),
		},
	});

	fastify.register(swaggerUi, {
		routePrefix: "/documentation",
		uiConfig: {
			docExpansion: "list",
			deepLinking: false,
		},
	});

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
