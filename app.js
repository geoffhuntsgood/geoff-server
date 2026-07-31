import cors from "cors";
import "dotenv/config";
import express, { json } from "express";
import postgres from "postgres";

const app = express();
app.use(cors());
app.use(json());

const db = postgres({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  pass: process.env.DB_PASS,
  ssl: true
});

app.get("/get-poke-times/:player_name/:category", (req, res) => {
  const player_name = req.params.player_name;
  const category = req.params.category;

  db`SELECT * FROM quiz_times WHERE player_name = ${player_name} AND category = ${category}`.then(
    (response) => {
      if (response.length === 0) {
        return res
          .status(200)
          .json({ missing: "No time found for this player/category combo." });
      } else {
        return res.status(200).json({ best: response[0].best_time });
      }
    }
  );
});

app.post("/set-poke-times", (req, res) => {
  const requestBody = req.body;

  if (!requestBody) {
    return res.status(400).json({ err: "No request body content." });
  }

  db`UPDATE pokemon_quiz_best_times SET best_time = ${requestBody.best_time} WHERE player_name = ${requestBody.player_name} AND category = ${requestBody.category} AND TIMEDIFF(${requestBody.best_time}, best_time) < 0`.then(
    (response) => {
      if (response.body) {
        res.status(201).json({ info: "Updated existing best time!" });
      } else {
        db`INSERT INTO pokemon_quiz_best_times VALUES (${requestBody.best_time}, ${requestBody.category}, ${requestBody.player_name});`.then(
          (insertResponse) => {
            res.status(201).json({ info: "Added new best time!" });
          }
        );
      }
    }
  );
});

app.listen(3000, () => {
  console.log("geoff-server up at port 3000");
});
