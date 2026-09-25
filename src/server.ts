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

const getQuery = (category: string, player?: string) =>
  `
    SELECT json_agg(quiz_times) FROM quiz_times
    WHERE category = ${category}
    ${player ? `AND player_name = ${player}` : ""}
    GROUP BY best_time ORDER BY best_time ASC LIMIT 1
  `;

server.get("/get-best-time/:category", async (req: Request, res: Response) => {
  try {
    await pgClient.connect();
    const getTime = await pgClient.query(getQuery(String(req.params.category)));
    if (getTime.rows.length > 0) {
      return res.status(200).json(getTime.rows[0]);
    } else {
      return res.status(204).json({ msg: "No time found for this category." });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err });
  }
});

server.post("/save-best-time", async (req: Request, res: Response) => {
  const body: BestTime = req.body;

  try {
    await pgClient.connect();
    const checkTime = await pgClient.query(
      getQuery(body.category, body.player_name)
    );
    if (
      checkTime.rows.length === 0 ||
      (checkTime.rows && checkTime.rows[0].best_time > body.best_time)
    ) {
      await pgClient.query(`
      INSERT INTO quiz_times (player_name, category, best_time)
      VALUES (${body.player_name}, ${body.category}, ${body.best_time})
      ON CONFLICT (player_name, category) DO UPDATE
      SET best_time = LEAST(excluded.best_time, quiz_times.best_time)
    `);
      return res.status(201).json({
        msg: `Updated ${body.category} with ${body.best_time} for player ${body.player_name}`
      });
    } else {
      return res.status(200).json({
        msg: `Your previous time ${checkTime.rows[0]} was better!`
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err });
  }
});

server.listen(3000, () => {
  console.log("geoff-server up at port 3000");
});
