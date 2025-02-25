import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { container } from "../../container.js";
import { userMiddleware } from "../../middleware.js";
import { SessionsController } from "./sessions.controller.js";

export const sessionRoutes = (
	fastify: FastifyInstance,
	_: FastifyPluginOptions,
	done: () => void,
) => {
	const sessionsController = container.resolve(SessionsController);

	fastify.get("/", { preHandler: [userMiddleware] }, sessionsController.listSessions);
	fastify.get("/:id", { preHandler: [userMiddleware] }, sessionsController.getSessionById);
	fastify.post("/", { preHandler: [userMiddleware] }, sessionsController.createSession);

	done();
};
