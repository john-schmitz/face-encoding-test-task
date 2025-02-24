import { z } from "zod";
import { config } from "../../config.js";

export class FaceEncodingService {
	async encodeFile(file: { buffer: Buffer; filename: string; contentType: string }) {
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
			const response: Response = await fetch(config.FACE_ENCODING_ENDPOINT, {
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
}
