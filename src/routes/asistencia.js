const express = require('express');
const { postAsistencia } = require('../controllers/asistencia');
const router = express.Router();
const upload = require("../middlewares/multer")


router.post("/",upload.single('foto'), postAsistencia)

module.exports = router