// test-elasticsearch.ts
import { Client } from "@elastic/elasticsearch";

const client = new Client({
  node: "https://localhost:9200",
  auth: {
    username: "elastic",
    password: "zLOt2va9_fUKmX0kN3xD",
  },
  tls: {
    rejectUnauthorized: false,
  },
});

async function test() {
  try {
    const response = await client.info();
    console.log(response);
  } catch (err) {
    console.error("Failed to connect:", err);
  }
}

test();
