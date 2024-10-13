const dayjs = require("dayjs");
const db = require("../../app/models/index");
const path = require('node:path');
const sharp = require("sharp");

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
  fotoBuffer,
  latitud,
  longitud
) => {
  const estadoIngreso = dayjs().isBefore(
    dayjs().set("hour", 7).set("minute", 30)
  )
    ? "Asistencia"
    : "Falta";

  await db.asistencias.create({
    empleado_id: empleado.id,
    nombre: nombre,
    fecha: fechaActual,
    hora_ingreso: horaActual,
    estado_ingreso: estadoIngreso,
    foto_ingreso: fotoBuffer, // Guardar la foto de ingreso
    latitud_ingreso: latitud + "," + longitud,
    hora_salida: "Pendiente",
    estado_salida: "Pendiente",
  });

  return { mensaje: "Ingreso registrado." };
};

// Función para actualizar el estado del día
const actualizarEstadoDia = async (empleado_id, fechaActual) => {
  const registroActualizado = await db.asistencias.findOne({
    where: { empleado_id, fecha: fechaActual },
  });

  const estadoDia =
    registroActualizado.estado_ingreso === "Asistencia" &&
    registroActualizado.estado_salida === "Asistencia"
      ? "Asistencia"
      : "Falta";

  await db.asistencias.update(
    { estado_dia: estadoDia },
    { where: { id: registroActualizado.id } }
  );
};

// Función para registrar la salida
const registrarSalida = async (
  registroExistente,
  horaActual,
  estadoSalida,
  fotoBuffer,
  latitud,
  longitud
) => {
  await db.asistencias.update(
    {
      hora_salida: horaActual,
      estado_salida: estadoSalida,
      foto_salida: fotoBuffer,
      latitud_salida: latitud + "," + longitud,
    },
    { where: { id: registroExistente.id } }
  );
};

const postAsistencia = async (req, res) => {
  try {
    const { dni, latitud, longitud } = req.body;

    if (!req.file) {
      return res.status(400).json({ mensaje: "Por favor, sube una foto." });
    }
    const dniLimpio = dni.trim();

    const fotoBuffer = req.file.path;
    const compressedFilePath = path.join('uploads', `compressed-${req.file.filename}.jpeg`);

    // Redimensionar y guardar la imagen
    await sharp(fotoBuffer)
      .resize(800) // Cambiar a un ancho máximo de 800px
      .jpeg({ quality: 80 }) // Establecer la calidad a 80%
      .toFile(compressedFilePath);

    // Eliminar el archivo original si ya no lo necesitas
    fs.unlinkSync(fotoBuffer);

    const empleado = await obtenerEmpleado(dniLimpio);
    if (!empleado) {
      return res.status(404).json({ mensaje: "DNI no encontrado" });
    }

    const nombre = empleado.nombre;
    const fecha = dayjs();
    const horaActual = fecha.format("HH:mm:ss");
    const fechaActual = fecha.format("DD-MM-YYYY");

    // Verificar si ya existe un registro de asistencia para el día
    const registroExistente = await db.asistencias.findOne({
      where: { empleado_id: empleado.id, fecha: fechaActual },
    });

    const horaLimite = dayjs().set("hour", 19).set("minute", 0);

    // Si no hay registro de ingreso y ya son más de las 19:00 (7 p.m.), registrar falta en ambos casos
    if (!registroExistente && fecha.isAfter(horaLimite)) {
      await db.asistencias.create({
        empleado_id: empleado.id,
        nombre: nombre,
        fecha: fechaActual,
        hora_ingreso: "No registrado",
        estado_ingreso: "Falta",
        foto_ingreso: null, // No hay foto de ingreso
        latitud_ingreso: null,
        hora_salida: "No registrado",
        estado_salida: "Falta",
        foto_salida: fotoBuffer,
        latitud_salida: latitud + "," + longitud,
        estado_dia: "Falta",
      });

      return res.status(200).json({ mensaje: "Asistencia registrada." });
    }

    if (registroExistente) {
      const estadoSalida = registroExistente.estado_salida?.toLowerCase();

      if (estadoSalida === "pendiente") {
        // Si es después de las 19:30, registrar como "Falta"
        const horaLimiteSalida = dayjs().set("hour", 19).set("minute", 30);
        if (fecha.isAfter(horaLimiteSalida)) {
          await registrarSalida(
            registroExistente,
            horaActual,
            "Falta",
            fotoBuffer,
            latitud,
            longitud
          );
          await db.asistencias.update(
            { estado_dia: "Falta" },
            { where: { id: registroExistente.id } }
          );
          return res
            .status(200)
            .json({ mensaje: "Salida registrada con falta." });
        }

        // Registrar salida entre 16:00 y 19:30
        const horaInicioSalida = dayjs().set("hour", 16).set("minute", 0);
        if (
          fecha.isAfter(horaInicioSalida) &&
          fecha.isBefore(horaLimiteSalida)
        ) {
          await registrarSalida(
            registroExistente,
            horaActual,
            "Asistencia",
            fotoBuffer,
            latitud,
            longitud
          );
          await actualizarEstadoDia(empleado.id, fechaActual);
          return res
            .status(200)
            .json({ mensaje: "Salida registrada correctamente." });
        }

        return res
          .status(400)
          .json({ mensaje: "La salida se registra a partir de las 4:30." });
      }

      return res.status(400).json({
        mensaje: "Ya se registró tanto el ingreso como la salida hoy.",
      });
    } else {
      // Si no existe un registro, registrar el ingreso
      const response = await registrarIngreso(
        empleado,
        nombre,
        fechaActual,
        horaActual,
        fotoBuffer,
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
      include:[{model:db.empleados}]
    });

    if (!asistencias || asistencias.length === 0) {
      return res.status(404).json({
        mensaje: "No se encontraron registros de asistencia con los parámetros proporcionados.",
      });
    }

    

    // Retornar los resultados
    return res.status(200).json({
      data: asistencias,
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
    console.error(error);
  }
};


module.exports = { postAsistencia, getAsistenciaPorTrabajadorYFecha };
