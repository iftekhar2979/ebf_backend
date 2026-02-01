import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "./../src/app.module";
import request from "supertest";
import { MailerService } from "@nestjs-modules/mailer";
import { mockMailerService } from "./mocks";
import { DataSource } from "typeorm";

describe("AppController (e2e)", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailerService)
      .useValue(mockMailerService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get<DataSource>(DataSource);
  });

  beforeEach(async () => {
    const entities = dataSource.entityMetadatas;

    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name); // Get repository
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE;`); // Truncate the table and restart identity
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("/ (GET)", async () => {
    const res = await request(app.getHttpServer()).get("/");

    expect(res.status).not.toEqual(404);
    expect(res.body).toEqual({ hello: "hello world" });
  });
});
