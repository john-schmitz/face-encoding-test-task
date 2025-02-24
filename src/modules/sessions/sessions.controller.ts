import type { FastifyReply, FastifyRequest } from "fastify";
import { SessionsRepository } from "./sessions.repository.js";
import { SessionsService } from "./sessions.service.js";
import type { RawFile } from "./sessions.service.js";

export class SessionsController {
	constructor(private readonly sessionsService: SessionsService) {}

	listSessions = async (
		request: FastifyRequest<{
			Headers: { userid: string };
		}>,
		reply: FastifyReply,
	) => {
		const { userid } = request.headers;

		const result = await this.sessionsService.listSessions(userid);

		return reply.send(result);
	};

	createSession = async (
		request: FastifyRequest<{
			Headers: { userid: string };
		}>,
		reply: FastifyReply,
	) => {
		const { userid } = request.headers;

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

		const result = await this.sessionsService.createSession(userid, files);

		return reply.send(result);
	};
}

export default new SessionsController(new SessionsService(new SessionsRepository()));
