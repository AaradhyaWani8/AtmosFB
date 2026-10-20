import "dotenv/config";
import mongoose from "mongoose";
import { app } from "./app.js";

const port = Number.parseInt(process.env.PORT || "3000", 10);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error("MONGODB_URI must be configured before starting Atmos API.");
}

const server = app.listen(port, () => {
  console.log(`Atmos API listening on port ${port}.`);
});

mongoose.connect(mongoUri).catch((error) => {
  console.error(`MongoDB connection failed: ${error.message}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    server.close(async () => {
      await mongoose.disconnect();
    });
  });
}
