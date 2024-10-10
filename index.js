require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routerApi = require("./src/routes");
const app = express();
const port = 3001;

app.use(express.json());

app.use(cors());

app.get("/", (req, res) => {
  res.send("VISITA LA RUTA api-docs and github");
});

routerApi(app);

app.listen(port, () => {
  console.log(`Mi puerto es: ${port}`);
});