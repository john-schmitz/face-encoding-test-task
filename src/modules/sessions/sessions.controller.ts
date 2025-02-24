import type { FastifyReply, FastifyRequest } from "fastify";
import { SessionsRepository } from "./sessions.repository.js";
import { SessionsService } from "./sessions.service.js";
import type { RawFile } from "./sessions.service.js";

export class SessionsController {
	constructor(private readonly sessionsService: SessionsService) {}

	listSessions = async (
		request: FastifyRequest<{
			Headers: { user: string };
		}>,
		reply: FastifyReply,
	) => {
		const { user: userId } = request.headers;

		if (!userId || typeof userId !== "string") {
			throw new Error("user id not provided");
		}
		request.log.info({ userId });
		const result = await this.sessionsService.listSessions(userId);

		request.log.info({ result });

		return reply.send(result);
	};

	createSession = async (
		request: FastifyRequest<{
			Headers: { user: string };
		}>,
		reply: FastifyReply,
	) => {
		const { user: userId } = request.headers;
		if (!userId || typeof userId !== "string") {
			throw new Error("user id not provided");
		}

		const files: RawFile[] = [];

		for await (const part of request.files()) {
			if (!part) {
				continue;
			}

			const buffer = await part.toBuffer();

			const rawFile: RawFile = {
				filename: part.filename,
				contentType: part.type,
				encoding: part.encoding,
				buffer: buffer,
			};

			files.push(rawFile);
		}

		const result = await this.sessionsService.createSession(userId, files);

		return reply.send(result);
	};
}

export default new SessionsController(
	new SessionsService(new SessionsRepository()),
);
