export class MockFaceEncodingService {
	async encodeFile(file: { buffer: Buffer; filename: string; contentType: string }) {
		return [Array(128).fill(0.5)];
	}
}

export function createMultipartPayload(
	files: Array<{
		fieldName?: string;
		filename: string;
		buffer: Buffer;
		contentType?: string;
	}>,
) {
	const boundary = "X-TEST-BOUNDARY";

	const parts: string[] = [];

	files.forEach((file, index) => {
		const fieldName = file.fieldName || `file${index + 1}`;
		const contentType = file.contentType || "image/jpeg";

		parts.push(`--${boundary}`);
		parts.push(`Content-Disposition: form-data; name="${fieldName}"; filename="${file.filename}"`);
		parts.push(`Content-Type: ${contentType}`);
		parts.push("");
		parts.push(file.buffer.toString("binary"));
	});

	parts.push(`--${boundary}--`);

	const payloadString = parts.join("\r\n");

	return {
		payload: Buffer.from(payloadString, "binary"),
		headers: {
			"content-type": `multipart/form-data; boundary=${boundary}`,
		},
	};
}

export const defaultFileBuffer = Buffer.from(
	"R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
	"base64",
);
