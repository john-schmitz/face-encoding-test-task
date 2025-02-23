import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { config } from "./config.js";
import { sessionRoutes } from "./modules/sessions/sessions.routes.js";

const app = Fastify({ logger: true });

app.register(multipart, {
	limits: {
		files: config.MAX_ALLOWED_FILES,
		fileSize: config.MAX_ALLOWED_FILE_SIZE_BYTES,
	},
});

app.register(sessionRoutes, { prefix: "/v1/api/sessions" });

export { app };
