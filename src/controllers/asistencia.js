const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const db = require("../../app/models/index");
const path = require("node:path");
const sharp = require("sharp");
const fs = require("fs");

// Función para verificar si el empleado existe
const obtenerEmpleado = async (dniLimpio) => {
  return await db.empleados.findOne({
    where: { dni: dniLimpio },
  });
};

// Función para registrar el ingreso
const registrarIngreso = async (
  empleado,
  nombre,
  fechaActual,
  horaActual,
  fotoPath,
  latitud,
  longitud
) => {
  const estadoIngreso = dayjs()
    .tz("America/Lima")
    .isBefore(dayjs().tz("America/Lima").set("hour", 7).set("minute", 30))
    ? "Asistencia"
    : "Falta";

  await db.asistencias.create({
    empleado_id: empleado.id,
    nombre: nombre,
    fecha: fechaActual,
    hora_ingreso: horaActual,
    estado_ingreso: estadoIngreso,
    foto_ingreso: fotoPath, // Guardar la ruta de la foto comprimida
    latitud_ingreso: latitud + "," + longitud,
    hora_salida: "Pendiente",
    estado_salida: "Pendiente",
  });

  return { mensaje: "Ingreso registrado." };
};

// Función para registrar la salida
const registrarSalida = async (
  registroExistente,
  horaActual,
  estadoSalida,
  fotoPath,
  latitud,
  longitud
) => {
  await db.asistencias.update(
    {
      hora_salida: horaActual,
      estado_salida: estadoSalida,
      foto_salida: fotoPath,
      latitud_salida: latitud + "," + longitud,
    },
    { where: { id: registroExistente.id } }
  );
};
const actualizarEstadoDia = async (empleado_id, fechaActual) => {
  try {
    // Busca el registro de asistencia para el empleado y la fecha actual
    const registro = await db.asistencias.findOne({
      where: { empleado_id, fecha: fechaActual },
    });

    if (!registro) {
      throw new Error(
        "No se encontró el registro de asistencia para el empleado y la fecha proporcionados."
      );
    }

    // Si tanto el ingreso como la salida están registrados, actualiza el estado del día
    if (
      registro.hora_ingreso &&
      registro.hora_salida &&
      registro.estado_ingreso !== "Falta"
    ) {
      await db.asistencias.update(
        { estado_dia: "Asistencia completa" }, // O cualquier otro estado que definas
        { where: { id: registro.id } }
      );
    } else if (registro.estado_ingreso === "Falta") {
      // Si el estado de ingreso fue "Falta", se podría marcar como falta total
      await db.asistencias.update(
        { estado_dia: "Falta" },
        { where: { id: registro.id } }
      );
    }
  } catch (error) {
    console.error("Error al actualizar el estado del día:", error);
    throw error; // Lanza el error para que se maneje en la función principal
  }
};

// Función principal para manejar la asistencia
const postAsistencia = async (req, res) => {
  try {
    const { dni, latitud, longitud } = req.body;

    if (!req.file) {
      return res.status(400).json({ mensaje: "Por favor, sube una foto." });
    }
    const dniLimpio = dni.trim();

    const fotoBuffer = req.file.path;
    const compressedFilePath = path.join(
      "uploads",
      `compressed-${req.file.filename}.jpeg`
    );

    // Redimensionar y guardar la imagen comprimida
    await sharp(fotoBuffer)
      .resize(800)
      .jpeg({ quality: 80 })
      .toFile(compressedFilePath);

    // Eliminar el archivo original si ya no lo necesitas
    fs.unlinkSync(fotoBuffer);

    const empleado = await obtenerEmpleado(dniLimpio);
    if (!empleado) {
      return res.status(404).json({ mensaje: "DNI no encontrado" });
    }

    const nombre = empleado.nombre;
    const fecha = dayjs().tz("America/Lima");
    const horaActual = fecha.format("HH:mm:ss");
    const fechaActual = fecha.format("DD-MM-YYYY");

    // Verificar si ya existe un registro de asistencia para el día
    const registroExistente = await db.asistencias.findOne({
      where: { empleado_id: empleado.id, fecha: fechaActual },
    });

    // Restricción de horarios para ingreso y salida
    const horaInicioIngreso = dayjs()
      .tz("America/Lima")
      .set("hour", 6)
      .set("minute", 0);
    const horaFinIngreso = dayjs()
      .tz("America/Lima")
      .set("hour", 7)
      .set("minute", 30);
    const horaInicioSalida = dayjs()
      .tz("America/Lima")
      .set("hour", 16)
      .set("minute", 0);
    const horaFinSalida = dayjs()
      .tz("America/Lima")
      .set("hour", 19)
      .set("minute", 30);

    // Validar si es horario permitido para registrar ingreso (6:00 a.m. - 7:30 a.m.)
    if (
      registroExistente === null &&
      (fecha.isBefore(horaInicioIngreso) || fecha.isAfter(horaFinIngreso))
    ) {
      return res
        .status(400)
        .json({ mensaje: "El horario de ingreso es de 6:00 a.m. a 7:30 a.m." });
    }

    // Si ya existe un registro de ingreso, verificar la salida
    if (registroExistente) {
      const estadoSalida = registroExistente.estado_salida?.toLowerCase();

      // Validar si es horario permitido para registrar salida (4:00 p.m. - 7:30 p.m.)
      if (estadoSalida === "pendiente") {
        if (fecha.isBefore(horaInicioSalida) || fecha.isAfter(horaFinSalida)) {
          return res.status(400).json({
            mensaje: "El horario de salida es de 4:00 p.m. a 7:30 p.m.",
          });
        }

        await registrarSalida(
          registroExistente,
          horaActual,
          "Asistencia",
          compressedFilePath,
          latitud,
          longitud
        );
        await actualizarEstadoDia(empleado.id, fechaActual);
        return res
          .status(200)
          .json({ mensaje: "Salida registrada correctamente." });
      }

      return res.status(400).json({
        mensaje: "Ya se registró tanto el ingreso como la salida hoy.",
      });
    } else {
      // Registrar el ingreso si no existe un registro
      const response = await registrarIngreso(
        empleado,
        nombre,
        fechaActual,
        horaActual,
        compressedFilePath,
        latitud,
        longitud
      );
      return res.status(200).json(response);
    }
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
    console.error(error);
  }
};

const getAsistenciaPorTrabajadorYFecha = async (req, res) => {
  try {
    const { id, fecha } = req.query;

    let whereClause = {};

    // Agregar el empleado_id a la condición de búsqueda si 'id' está presente
    if (id) {
      whereClause.empleado_id = id;
    }

    // Agregar la fecha a la condición de búsqueda si 'fecha' está presente
    if (fecha) {
      const fechaFormateada = dayjs(fecha, "YYYY-MM-DD", true);
      if (!fechaFormateada.isValid()) {
        return res.status(400).json({
          mensaje: "El formato de la fecha no es válido. Use 'YYYY-MM-DD'.",
        });
      }
      whereClause.fecha = fechaFormateada.format("DD-MM-YYYY");
    }

    // Buscar las asistencias que cumplan con las condiciones
    const asistencias = await db.asistencias.findAll({
      where: whereClause,
      include: [{ model: db.empleados }],
    });

    if (!asistencias || asistencias.length === 0) {
      return res.status(404).json({
        mensaje:
          "No se encontraron registros de asistencia con los parámetros proporcionados.",
      });
    }

    const format = asistencias.map((item, index) => {
      return {
        ...item.get(),
        id: index + 1,
        foto_ingreso: item?.foto_ingreso
          ? `http://3.145.205.44/${item?.foto_ingreso}`
          : "",
        foto_salida: item?.foto_salida
          ? `http://3.145.205.44/${item?.foto_ingreso}`
          : "",
        latitud_ingreso: item?.latitud_ingreso
          ? `https://www.google.com/maps?q=${item?.latitud_ingreso}`
          : "",
        latitud_salida: item?.latitud_salida
          ? `https://www.google.com/maps?q=${item?.latitud_salida}`
          : "",
      };
    });

    // Retornar los resultados
    return res.status(200).json({
      data: format,
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
    console.error(error);
  }
};

module.exports = { postAsistencia, getAsistenciaPorTrabajadorYFecha };
