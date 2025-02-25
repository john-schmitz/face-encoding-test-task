import type { FastifyReply, FastifyRequest } from "fastify";
import { inject, injectable } from "tsyringe";
import { SessionsService } from "./sessions.service.js";
import type { RawFile } from "./sessions.service.js";

@injectable()
export class SessionsController {
	constructor(@inject(SessionsService) private readonly sessionsService: SessionsService) {}

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

	getSessionById = async (
		request: FastifyRequest<{
			Headers: { userid: string };
			Params: { id: string };
		}>,
		reply: FastifyReply,
	) => {
		const { userid } = request.headers;
		const { id } = request.params;

		const session = await this.sessionsService.getSessionById(id, userid);

		if (!session) {
			return reply.status(404).send({ error: "Session not found" });
		}

		return reply.send(session);
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
