const express = require("express");
const asistenciaRouter = require("./asistencia");
const empleadoRouter = require("./empleados");

function routerApi(app) {
  const router = express.Router();
  app.use("/api/v1", router);

  router.use("/asistencia", asistenciaRouter);
  router.use("/empleados", empleadoRouter);

}

module.exports = routerApi;
