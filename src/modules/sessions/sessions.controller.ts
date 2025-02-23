import type { FastifyReply, FastifyRequest } from "fastify";
import { uuidv7 } from "uuidv7";
import { z } from "zod";
import { config } from "../../config.js";

export class SessionsController {
	async listSessions(request: FastifyRequest, reply: FastifyReply) {
		return [];
	}

	async createSession(request: FastifyRequest, reply: FastifyReply) {
		const sessionId = uuidv7();
		const filesPromises = [];

		for await (const part of request.files()) {
			if (!part) {
				continue;
			}

			const filePromise = part
				.toBuffer()
				.then((buffer) =>
					sendMultipartRequest(config.faceEncodingEndpoint, {
						buffer: buffer,
						filename: part?.filename,
						contentType: part?.type,
					}),
				)
				.then((result) => ({ fileName: part.filename, faces: result }))
				.catch((error) => {
					console.error(`Error processing file ${part.filename}:`, error);
					return { fileName: part.filename, error: error.message };
				});

			filesPromises.push(filePromise);
		}

		const files = await Promise.all(filesPromises);

		return {
			id: sessionId,
			files,
		};
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

export default new SessionsController();
