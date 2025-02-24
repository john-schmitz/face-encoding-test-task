import type { FastifyReply, FastifyRequest } from "fastify";
import { SessionsRepository } from "./sessions.repository.js";
import { SessionsService } from "./sessions.service.js";
import type { RawFile } from "./sessions.service.js";

export class SessionsController {
	constructor(private readonly service: SessionsService) {}

	async listSessions(request: FastifyRequest, reply: FastifyReply) {
		const { userId } = request.headers;
		if (!userId || typeof userId !== "string") {
			throw new Error("user id not provided");
		}

		return this.service.listSessions(userId);
	}

	async createSession(request: FastifyRequest, reply: FastifyReply) {
		const { userId } = request.headers;
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

		const result = await this.service.createSession(files);

		return reply.send(result);
	}
}

export default new SessionsController(
	new SessionsService(new SessionsRepository()),
);
