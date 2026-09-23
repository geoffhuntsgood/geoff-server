import cors from "cors";
import "dotenv/config";
import express, {
  type Express,
  json,
  Request,
  Response,
  urlencoded
} from "express";
import { client } from "./db";
import { BestTime } from "./types";

export const setupServer: () => Express = () => {
  const server = express();
  server.use(cors({ origin: true }));
  server.use(urlencoded());
  server.use(json());

  const getQuery = (category: string) => {
    return `
      SELECT json_agg(quiz_times) FROM quiz_times
      WHERE category = ${category}
      GROUP BY best_time ORDER BY best_time ASC LIMIT 1
    `;
  };

  const postQuery = (best: BestTime) => {
    return `
      INSERT INTO quiz_times (player_name, category, best_time)
      VALUES (${best.player_name}, ${best.category}, ${best.best_time})
      ON CONFLICT (player_name, category) DO UPDATE
      SET best_time = LEAST(excluded.best_time, quiz_times.best_time)
    `;
  };

  server.get(
    "/get-best-time/:category",
    async (req: Request, res: Response) => {
      const category = req.params.category;

      try {
        await client.connect();
        const getTime = await client.query(getQuery(String(category)));
        if (getTime.rows.length > 0) {
          return res.status(200).json(getTime.rows[0]);
        } else {
          return res
            .status(204)
            .json({ msg: "No time found for this category." });
        }
      } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: err });
      } finally {
        await client.end();
      }
    }
  );

  server.post("/save-best-time", async (req: Request, res: Response) => {
    const body: BestTime = req.body;

    try {
      await client.connect();
      await client.query(postQuery(body));
      return res.status(201).json({
        msg: `Updated ${body.category} with ${body.best_time} for player ${body.player_name}`
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ msg: err });
    } finally {
      await client.end();
    }
  });

  return server;
};
