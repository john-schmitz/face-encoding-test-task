import { inject, injectable } from "tsyringe";
import { uuidv7 } from "uuidv7";
import { FaceEncodingService } from "../face-encoding/face-encoding.service.js";
import { SessionsRepository } from "./sessions.repository.js";

export interface RawFile {
	filename: string;
	contentType: string;
	encoding: string;
	buffer: Buffer;
}

export interface FileProcessResult {
	fileName: string;
	faces: number[][];
}

@injectable()
export class SessionsService {
	constructor(
		@inject(SessionsRepository) private readonly repo: SessionsRepository,
		@inject(FaceEncodingService) private readonly faceEncodingService: FaceEncodingService,
	) {}

	public async listSessions(userId: string) {
		const result = await this.repo.listSessions(userId);

		return result;
	}

	public async getSessionById(id: string, userId: string) {
		const session = await this.repo.getSessionById(id);

		if (!session || session.userId !== userId) {
			return null;
		}

		return session;
	}

	async createSession(userId: string, files: RawFile[]) {
		const filesPromises: Promise<FileProcessResult>[] = files.map((file) => this.processFile(file));
		const results = await Promise.all(filesPromises);

		const session = {
			id: uuidv7(),
			userId,
			sumary: results,
		};

		await this.repo.createSession(session);

		return session;
	}

	private async processFile(file: RawFile): Promise<FileProcessResult> {
		const faces = await this.faceEncodingService.encodeFile(file);
		return { fileName: file.filename, faces: faces };
	}
}
