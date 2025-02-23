import { app } from "./app.js";
import { config } from "./config.js";

async function main() {
	try {
		await app.listen({
			port: config.PORT,
			host: "0.0.0.0",
		});
		app.log.info(`Server running on http://localhost:${config.PORT}`);
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

main();
