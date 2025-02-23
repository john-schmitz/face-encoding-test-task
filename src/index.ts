import Fastify from "fastify";
import { config } from "./config.js";

const fastify = Fastify({ logger: true });

fastify.get("/ping", async (request, reply) => {
	return "pong\n";
});

async function main() {
	try {
		await fastify.listen({
			port: config.PORT,
			host: "0.0.0.0",
		});
		fastify.log.info(`Server running on http://localhost:${config.PORT}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
}

main();
