import request from "supertest";
import { CreateUserDto } from "../dto/create-user.dto";

describe("AuthController (e2e)", () => {
  describe("POST /auth/signup", () => {
    const badInput: Partial<CreateUserDto>[] = [
      { last_name: "last name", email: "test@mail.com", password: "Password@123" }, // no first_name
      { first_name: "first_name", email: "test@mail.com", password: "Password@123" }, // no last_name
      { first_name: "first_name", last_name: "last name", password: "Password@123" }, // no email
      { first_name: "first_name", last_name: "last name", email: "test@mail.com" }, // no password
      { first_name: "first_name", last_name: "last name", email: "test@mail", password: "Password@123" }, // bad email
      { first_name: "first_name", last_name: "last name", email: "test@mail.com", password: "1243" }, // bad password
      { first_name: "first_name", last_name: "last name", email: "test@mail.com", password: "password" }, // bad password
      { first_name: "first-name", last_name: "last name", email: "test@mail.com", password: "Password@123" }, // first name is not a-zA-Z
      { first_name: "admin", last_name: "last name", email: "test@mail.com", password: "Password@123" }, // first name is admin
    ];

    const successInput: CreateUserDto = {
      first_name: "first_name",
      last_name: "last name",
      email: "test@mail.com",
      password: "Password@123",
    };

    it("[404 Not Found] check -- signup route exists", async () => {
      const res = await request(global.app.getHttpServer()).post("/auth/signup").send({});

      expect(res.status).not.toBe(404);
    });

    it("[400 Bad Request] check -- signup doesn't occur for bad input data", async () => {
      for (let i = 0; i < badInput.length; i++) {
        // console.log(badInput[i]);

        const res = await request(global.app.getHttpServer()).post("/auth/signup").send(badInput[i]);
        // console.log(res.body);
        // console.log(res.error);

        expect(res.status).toBe(400);
      }
    });

    it("[201 Created] check -- signup occurs for good input data", async () => {
      const res = await request(global.app.getHttpServer()).post("/auth/signup").send(successInput);

      // console.log(res.body);

      expect(res.status).toBe(201);
    });

    it("[409 Conflict] check -- signup doesn't occur for duplicate email", async () => {
      await request(global.app.getHttpServer()).post("/auth/signup").send(successInput).expect(201);
      const res = await request(global.app.getHttpServer()).post("/auth/signup").send(successInput);

      // console.log(res.status);
      // console.log(res.body);

      expect(res.status).toBe(409);
    });

    it("[200 Ok] check -- should fetch the current user after signup", async () => {
      const signin = await request(global.app.getHttpServer())
        .post("/auth/signup")
        .send(successInput)
        .expect(201);
      const token = signin.body.token;

      const res = await request(global.app.getHttpServer())
        .get("/users/me")
        .set("Authorization", `Bearer ${token}`);
      // console.log(res.body);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("email", successInput.email);
    });
  });
});
