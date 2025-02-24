import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { config } from "../../config.js";
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
	constructor(private readonly repo: SessionsRepository) {}

	public async listSessions(userId: string) {
		const result = await this.repo.listSessions(userId);

		return result;
	}

	async createSession(userId: string, files: RawFile[]) {
		const filesPromises: Promise<FileProcessResult>[] = files.map((file) =>
			this.processFile(file),
		);

		const results = await Promise.all(filesPromises);
		const session = {
			id: uuidv7(),
			userId,
			sumary: results,
		};

		console.log(session);
		await this.repo.createSession(session);

		return session;
	}

	private async processFile(file: RawFile): Promise<FileProcessResult> {
		const faces = await sendMultipartRequest(
			config.FACE_ENCODING_ENDPOINT,
			file,
		);
		return { fileName: file.filename, faces: faces };
	}
}

async function sendMultipartRequest(
	url: string,
	file: { buffer: Buffer; filename: string; contentType: string },
) {
	const responseSchema = z.array(z.array(z.number()).length(128));
	const formData = new FormData();

	try {
		const blob = new Blob([file.buffer], { type: file.contentType });
		formData.append("file", blob, file.filename);
	} catch (error) {
		if (!(error instanceof Error)) throw new Error("Please throw a error");
		console.error(`Error appending file ${file.filename}:`, error);
		throw new Error(`Failed to append file ${file.filename}: ${error.message}`);
	}

	try {
		const response: Response = await fetch(url, {
			method: "POST",
			body: formData,
			headers: {
				Accept: "application/json",
			},
		});

		if (!response.ok) {
			console.error(`HTTP error! status: ${response.status}`);
			console.log(await response.json());
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return responseSchema.parse(await response.json());
	} catch (error) {
		console.error("Error sending request:", error);
		throw error;
	}
}
