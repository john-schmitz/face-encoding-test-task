import { z } from "zod";

const configSchema = z.object({
	PORT: z.coerce.number(),
});

export const config = configSchema.parse(process.env);
