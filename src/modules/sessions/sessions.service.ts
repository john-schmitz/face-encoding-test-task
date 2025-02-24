import { uuidv7 } from "uuidv7";
import type { FaceEncodingService } from "../face-encoding/face-encoding.service.js";
import type { SessionsRepository } from "./sessions.repository.js";

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

export class SessionsService {
	constructor(
		private readonly repo: SessionsRepository,
		private readonly faceEncodingService: FaceEncodingService,
	) {}

	public async listSessions(userId: string) {
		const result = await this.repo.listSessions(userId);

		return result;
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
