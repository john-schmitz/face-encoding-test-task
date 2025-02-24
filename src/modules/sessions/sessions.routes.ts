import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { userMiddleware } from "../../middleware.js";
import SessionsController from "./sessions.controller.js";

export const sessionRoutes = (
	fastify: FastifyInstance,
	_: FastifyPluginOptions,
	done: () => void,
) => {
	fastify.get("/", { preHandler: [userMiddleware] }, SessionsController.listSessions);
	fastify.post("/", { preHandler: [userMiddleware] }, SessionsController.createSession);

	done();
};
