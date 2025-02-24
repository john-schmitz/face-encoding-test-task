import type { FastifyReply, FastifyRequest } from "fastify";

export const userMiddleware = async (
	request: FastifyRequest<{
		Headers: { userid: string };
	}>,
	reply: FastifyReply,
) => {
	const {
		headers: { userid },
	} = request;

	if (!userid || typeof userid !== "string") {
		reply.status(401).send({ error: "Invalid userid" });
		return;
	}
};
