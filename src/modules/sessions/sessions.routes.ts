import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import SessionsController from "./sessions.controller.js";

export const sessionRoutes = (
	fastify: FastifyInstance,
	_: FastifyPluginOptions,
	done: () => void,
) => {
	fastify.get("/", SessionsController.listSessions);
	fastify.post("/", SessionsController.createSession);
	done();
};
