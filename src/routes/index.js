const express = require("express");
const asistenciaRouter = require("./asistencia");

function routerApi(app) {
  const router = express.Router();
  app.use("/api/v1", router);

  router.use("/asistencia", asistenciaRouter);
}

module.exports = routerApi;
