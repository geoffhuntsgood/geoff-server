import cors from "cors";
import "dotenv/config";
import express, { json, Request, Response } from "express";
import postgres, { Row, RowList } from "postgres";
import { BestTime } from "./types";

const app = express();
app.use(cors());
app.use(json());

const db = postgres({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT as unknown as number,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  pass: process.env.DB_PASS
});

app.get("/quiz-best-time/:category", (req: Request, res: Response) => {
  const category = req.params.category;

  db`SELECT * FROM quiz_times WHERE category = ${category} ORDER BY best_time ASC LIMIT 1`.then(
    (response: RowList<Row[]>) => {
      console.log(response);
      if (response.length > 0) {
        return res.status(200).json({ best: response[0] });
      } else {
        return res
          .status(200)
          .json({ missing: "No time found for this category." });
      }
    }
  );
});

app.post("/quiz-best-time", (req: Request, res: Response) => {
  req.accepts("application/json");
  console.log(req);
  const body: BestTime = JSON.parse(req.body);

  if (!body) {
    return res.status(400).json({ err: "No request body content." });
  }

  db`INSERT INTO quiz_times (player_name, category, best_time)
    VALUES (${body.player_name}, ${body.category}, ${body.best_time})
    ON CONFLICT (player_name, category) DO UPDATE
      SET best_time = LEAST(excluded.best_time, quiz_times.best_time)
      RETURNING id`.then((response: RowList<Row[]>) => {
    if (response.length > 0 && response[0].id) {
      return res.status(201).json({ info: "Updated best times!" });
    } else {
      return res.status(500).json({ err: "Error upserting new time." });
    }
  });
});

app.listen(3000, () => {
  console.log("geoff-server up at port 3000");
});
