const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API rodando 🚀");
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.listen(3001, () => {
  console.log("Servidor rodando na porta 3001");
});
