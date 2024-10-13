const dayjs = require("dayjs");
const db = require("../../app/models/index");

const getEmpleados = async (req, res) => {
  try {
    // Buscar la asistencia del empleado para la fecha especificada
    const empleados = await db.empleados.findAll({
      attibutes: ["id", "nombre"],
    });

    return res.status(200).json(empleados);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
    console.error(error);
  }
};

module.exports={getEmpleados}