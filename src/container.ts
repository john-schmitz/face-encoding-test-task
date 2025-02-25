import { container } from "tsyringe";
import { config } from "./config.js";
import { DbFactory } from "./database/db.js";
import { FaceEncodingService } from "./modules/face-encoding/face-encoding.service.js";
import { SessionsController } from "./modules/sessions/sessions.controller.js";
import { SessionsRepository } from "./modules/sessions/sessions.repository.js";
import { SessionsService } from "./modules/sessions/sessions.service.js";

container.register("Db", {
	useValue: DbFactory({ DATABASE_URL: config.DATABASE_URL }),
});

container.register(FaceEncodingService, {
	useClass: FaceEncodingService,
});

container.register(SessionsRepository, {
	useClass: SessionsRepository,
});

container.register(SessionsService, {
	useClass: SessionsService,
});

container.register(SessionsController, {
	useClass: SessionsController,
});

export { container };
