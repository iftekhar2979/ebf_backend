// import configuration from "./configs/app.config";
import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
// import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import compression from "compression";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import { urlencoded } from "express";
import helmet from "helmet";
import hpp from "hpp";
import xssClean from "xss-clean";
import { AppModule } from "./app.module";
// FIXME: have it if you are using secret manager
// import { loadSecretsFromAWS } from "./configs/app.config";
import { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import bodyParser from "body-parser";
import { join } from "path";
import { createClient } from "redis";
import { createDataSource } from "./configs/ormconfig";
import { runMigrations } from "./migration-runner";
import { SeederService } from "./seeder/seeder.service";
/**
 * function for bootstraping the nest application
 */
async function bootstrap() {
  // Create the data source after secrets are loaded
  const dataSource = createDataSource();
  // Run Auto Migrations
  await runMigrations(dataSource, false); // Set to true to exit on migration failure
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bodyParser: true,
    cors: true,
    logger: ["error", "fatal", "log", "verbose", "warn", "debug"],
  });
  const configService = app.get<ConfigService>(ConfigService);

  // --- Add Redis Adapter ---
  const pubClient = createClient({ url: "redis://localhost:6379" });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  app.useWebSocketAdapter(
    new (class extends IoAdapter {
      createIOServer(port: number, options?: any) {
        const server = super.createIOServer(port, options);
        server.adapter(createAdapter(pubClient, subClient));
        return server;
      }
    })(app)
  );
  const seederService = app.get(SeederService);
  await seederService.seedAdminUser();
  // await seederService.seedSettings();
  // await seederService.seedCategories();
  app.setGlobalPrefix("/api");

  app.enableVersioning({
    defaultVersion: "1",
    type: VersioningType.URI,
  });

  app.setViewEngine({
    engine: {
      handlebars: require("handlebars"), // Import the engine here
    },
    templates: join(__dirname, "..", "..", "src", "views"), // Path to your views
    // layout: "layouts/main", // Optional: if you use layouts
  });
  // app.setViewEngine("ejs");

  const corsOptions: CorsOptions = {
    origin: "*", // ✅ frontend origin
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204,
    maxAge: 86400,
  };
  app.useStaticAssets({
    root: join(__dirname, "..", "..", "public"),
    prefix: "/public/", // Optional: adds a prefix to the URL
  });
  // app.enableCors(corsOptions);
  app.use(cookieParser());
  app.use(compression());

  // app.use(json({ limit: "50kb" }));
  app.use(urlencoded({ extended: true, limit: "50kb" }));

  // app.disable("x-powered-by"); // provide an extra layer of obsecurity to reduce server fingerprinting.
  // app.set("trust proxy", 1); // trust first proxy

  const ignoreMethods =
    configService.get<string>("STAGE") == "dev"
      ? ["GET", "HEAD", "OPTIONS", "DELETE", "POST", "PATCH", "PUT"] // for devlopment we ignoring all
      : ["GET", "HEAD", "OPTIONS"];
  // app.use(
  //   csurf({
  //     cookie: {
  //       httpOnly: true, // Prevent JavaScript access to the CSRF cookie
  //       secure: process.env.NODE_ENV === "PROD", // Set to secure only in production
  //       sameSite: "strict", // Restrict the cookie to same-site requests
  //     },
  //     ignoreMethods,
  //   })
  // );
  // app.use(
  //   helmet({
  //     hsts: {
  //       includeSubDomains: true,
  //       preload: true,
  //       maxAge: 63072000, // 2 years in seconds
  //     },
  //     contentSecurityPolicy: {
  //       useDefaults: true,
  //       directives: {
  //         defaultSrc: ["'self'", "https://polyfill.io", "https://*.cloudflare.com", "http://127.0.0.1:3000/"],
  //         baseUri: ["'self'"],
  //         scriptSrc: [
  //           "'self'",
  //           "http://127.0.0.1:3000/",
  //           "https://*.cloudflare.com",
  //           "https://polyfill.io",
  //           `https: 'unsafe-inline'`, // FIXME: use script-src CSP NONCES
  //           /* 
  //             CSP NONCES https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#unsafe_inline
  //            */
  //         ],
  //         styleSrc: ["'self'", "https:", "http:", "'unsafe-inline'"],
  //         imgSrc: ["'self'", "blob:", "validator.swagger.io", "*"],
  //         fontSrc: ["'self'", "https:", "data:"],
  //         childSrc: ["'self'", "blob:"],
  //         styleSrcAttr: ["'self'", "'unsafe-inline'", "http:"],
  //         frameSrc: ["'self'"],
  //       },
  //     },
  //     // you don't control the link on the pages, or know that you don't want to leak information to other domains
  //     dnsPrefetchControl: { allow: false }, // Changed based on the last middleware to disable DNS prefetching
  //     frameguard: { action: "deny" }, // Disable clickjacking
  //     hidePoweredBy: true, // Hides the X-Powered-By header to make the server less identifiable.
  //     ieNoOpen: true, // Prevents Internet Explorer from executing downloads in the site’s context.
  //     noSniff: true, // Prevents browsers from MIME type sniffing, reducing exposure to certain attacks.
  //     permittedCrossDomainPolicies: { permittedPolicies: "none" }, // Prevents Adobe Flash and Acrobat from loading cross-domain data.
  //     referrerPolicy: { policy: "no-referrer" }, // Protects against referrer leakage.
  //     xssFilter: true, // Enables the basic XSS protection in older browsers.

  //     // Configures Cross-Origin settings to strengthen resource isolation and mitigate certain side-channel attacks.  crossOriginEmbedderPolicy: true,
  //     crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  //     crossOriginResourcePolicy: { policy: "same-site" },
  //     originAgentCluster: true,
  //   })
  // );

  app.use((req: any, res: any, next: any) => {
    res.setHeader(
      "Permissions-Policy",
      'fullscreen=(self), camera=(), geolocation=(self "https://*example.com"), autoplay=(), payment=(), microphone=()'
    );
    next();
  });

  app.use(xssClean());
  app.use(hpp());

  app.useGlobalPipes(new ValidationPipe({ transform: true, stopAtFirstError: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.use("/api/v1/stripe/webhook", bodyParser.raw({ type: "*/*" }));
  /* FIXME:
    ########################## 
    ##### Set-up Swagger #####
    ##########################
  */
  if (!["prod", "production"].includes(configService.get<string>("STAGE").toLowerCase())) {
    // const config = new DocumentBuilder()
    //   .addBearerAuth()
    //   .setTitle(configService.get<string>("npm_package_name").replaceAll("-", " ").toUpperCase())
    //   .setDescription("DESCRIPTION")
    //   .setVersion(configService.get<string>("npm_package_version"))
    //   .build();
    // const document = SwaggerModule.createDocument(app, config, { ignoreGlobalPrefix: false });
    // SwaggerModule.setup("api", app, document, {
    //   swaggerOptions: {
    //     tagsSorter: "alpha",
    //   },
    // });
  }

  // FIXME:
  // Session Management
  // expressSession(app);

  const port = configService.get<string>("PORT") || 3000;

  await app.listen(port, () => {
    console.log("Server started on port: " + port);
  });
}
bootstrap();
