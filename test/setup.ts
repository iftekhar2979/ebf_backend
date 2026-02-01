import { Test, TestingModule } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { MailerService } from "@nestjs-modules/mailer";
import { mockMailerService } from "./mocks";
import { DataSource } from "typeorm";
import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

let dataSource: DataSource;

beforeAll(async () => {
  const app = await initializeApp();

  global.app = app;
});

// beforeEach(async () => {
//   await resetDatabase();
// });

afterEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  if (global.app) await global.app.close();
});

// Initialization function
async function initializeApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(MailerService)
    .useValue(mockMailerService)
    .compile();

  const app: INestApplication = moduleFixture.createNestApplication();

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useLogger(false);

  await app.init();

  return app;
}

async function resetDatabase() {
  if (!global.app) throw new Error("app not initialized");

  dataSource = global.app.get<DataSource>(DataSource);
  const entities = dataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name); // Get repository
    // await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`); // Truncate the table and restart identity
    await repository.clear(); // truncate the table
  }
}
