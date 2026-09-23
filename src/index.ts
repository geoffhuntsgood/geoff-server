import { type Express } from "express";
import { setupServer } from "./server";

const server: Express = setupServer();

server.listen(3000, () => {
  console.log("geoff-server up at port 3000");
});
