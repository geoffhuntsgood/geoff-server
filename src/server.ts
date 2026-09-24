import cors from "cors";
import express, { json, Request, Response, urlencoded } from "express";
import { Client } from "pg";
import { BestTime } from "./types";

const server = express();
server.use(cors({ origin: true }));
server.use(urlencoded());
server.use(json());

const pgClient = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  ssl: {
    rejectUnauthorized: false
  }
});

server.get("/get-best-time/:category", async (req: Request, res: Response) => {
  try {
    await pgClient.connect();
    const getTime = await pgClient.query(`
      SELECT json_agg(quiz_times) FROM quiz_times
      WHERE category = ${req.params.category}
      GROUP BY best_time ORDER BY best_time ASC LIMIT 1
    `);
    if (getTime.rows.length > 0) {
      return res.status(200).json(getTime.rows[0]);
    } else {
      return res.status(204).json({ msg: "No time found for this category." });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: err });
  } finally {
    await pgClient.end();
  }
});

server.post("/save-best-time", async (req: Request, res: Response) => {
  const body: BestTime = req.body;

  try {
    await pgClient.connect();
    const saveTime = await pgClient.query(`
      INSERT INTO quiz_times (player_name, category, best_time)
      VALUES (${body.player_name}, ${body.category}, ${body.best_time})
      ON CONFLICT (player_name, category) DO UPDATE
      SET best_time = LEAST(excluded.best_time, quiz_times.best_time)
    `);
    console.log(saveTime);
    return res.status(201).json({
      msg: `Updated ${body.category} with ${body.best_time} for player ${body.player_name}`
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: err });
  } finally {
    await pgClient.end();
  }
});

server.listen(3000, () => {
  console.log("geoff-server up at port 3000");
});
