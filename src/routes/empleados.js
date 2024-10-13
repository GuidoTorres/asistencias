const express = require("express");
const { getEmpleados } = require("../controllers/empleados");
const router = express.Router();

router.get("/", getEmpleados);

module.exports = router;
