require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routerApi = require("./src/routes");
const app = express();
const port = 3009;
const path = require('node:path');

app.use(express.json());

app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get("/", (req, res) => {
  res.send("VISITA LA RUTA api-docs and github");
});

routerApi(app);

app.listen(port, () => {
  console.log(`Mi puerto es: ${port}`);
});