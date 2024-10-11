const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs'); // Asegúrate de que este módulo esté instalado

const postAsistencia = async (req, res) => {
    try {
        const { dni, latitud, longitud } = req.body;

        // Verificar si se subió una foto
        if (!req.file) {
            return res.status(400).json({ mensaje: 'Por favor, sube una foto.' });
        }

        // Guardar la foto en el sistema de archivos
        const nombreArchivo = `${dni}_${Date.now()}.jpg`; // Nombre único basado en el DNI y la fecha
        const rutaFoto = path.join(__dirname, '..', 'uploads', nombreArchivo); // Ruta para guardar la foto

        // Mover el archivo al sistema de archivos
        fs.writeFileSync(rutaFoto, req.file.buffer);

        // Eliminar espacios en blanco del DNI
        const dniLimpio = dni.trim();

        // Verificar si el empleado existe
        const empleado = await db.empleados.findOne({
            where: { dni: dniLimpio },
        });
        if (!empleado) {
            return res.status(404).json({ mensaje: "DNI no encontrado" });
        }

        const nombre = empleado.nombre;
        const fecha = dayjs();
        const horaActual = fecha.format("HH:mm:ss"); // Formato HH:mm:ss
        const fechaActual = fecha.format("DD-MM-YYYY"); // Formato de fecha DD-MM-YYYY

        const registroExistente = await db.asistencias.findOne({
            where: { empleado_id: empleado.id, fecha: fechaActual },
        });

        if (registroExistente) {
            const estadoSalida = registroExistente.estado_salida?.toLowerCase();

            // Si ya hay registro de ingreso y la salida está pendiente
            if (estadoSalida === "pendiente") {

                // Si es después de las 19:00, registrar como "Falta"
                if (fecha.hour() >= 19) {
                    await db.asistencias.update(
                        {
                            hora_salida: horaActual,
                            estado_salida: "Falta",
                            foto_salida: rutaFoto, // Guardar la ruta de la foto de salida
                            latitud_salida: latitud,
                            longitud_salida: longitud,
                        },
                        { where: { id: registroExistente.id } }
                    );

                    await db.asistencias.update(
                        { estado_dia: "Falta" },
                        { where: { id: registroExistente.id } }
                    );

                    return res.status(200).json({ mensaje: "Salida registrada con falta." });
                }

                // Registrar salida entre 16:00 y 19:00
                if (fecha.hour() >= 16 && fecha.hour() < 19) {
                    await db.asistencias.update(
                        {
                            hora_salida: horaActual,
                            estado_salida: "Asistencia",
                            foto_salida: rutaFoto, // Guardar la ruta de la foto de salida
                            latitud_salida: latitud,
                            longitud_salida: longitud,
                        },
                        { where: { id: registroExistente.id } }
                    );

                    const registroActualizado = await db.asistencias.findOne({
                        where: { empleado_id: empleado.id, fecha: fechaActual },
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

                    return res.status(200).json({ mensaje: "Salida registrada correctamente." });
                }

                return res.status(400).json({ mensaje: "La salida se registra a partir de las 4:30." });
            }

            return res.status(400).json({
                mensaje: "Ya se registró tanto el ingreso como la salida hoy.",
            });
        } else {
            // Si no hay registro existente, se registra el ingreso
            const estadoIngreso = fecha.hour() < 8 ? "Asistencia" : "Falta";

            await db.asistencias.create({
                empleado_id: empleado.id,
                nombre: nombre,
                fecha: fechaActual,
                hora_ingreso: horaActual,
                estado_ingreso: estadoIngreso,
                foto_ingreso: rutaFoto, // Guardar la ruta de la foto de ingreso
                latitud_ingreso: latitud,
                longitud_ingreso: longitud,
                hora_salida: "Pendiente",
                estado_salida: "Pendiente", // La salida aún no ha sido registrada
            });

            return res.status(200).json({ mensaje: "Ingreso registrado." });
        }
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
        console.error(error);
    }
};
