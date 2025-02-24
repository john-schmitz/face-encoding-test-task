import { z } from "zod";

const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  MAX_ALLOWED_FILES: z.coerce.number().default(5),
  MAX_ALLOWED_FILE_SIZE_BYTES: z.coerce.number().default(2 ** 20 * 2), // 2 MB
  FACE_ENCODING_ENDPOINT: z.string().default("http://localhost:8000/v1/selfie"),
  DATABASE_URL: z.string(),
});

export const config = configSchema.parse(process.env);
