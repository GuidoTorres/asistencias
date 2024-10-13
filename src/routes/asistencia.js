const express = require("express");
const {
  postAsistencia,
  getAsistenciaPorTrabajadorYFecha,
} = require("../controllers/asistencia");
const router = express.Router();
const upload = require("../middlewares/multer");

router.get("/", getAsistenciaPorTrabajadorYFecha);

router.post("/", upload.single("foto"), postAsistencia);

module.exports = router;
