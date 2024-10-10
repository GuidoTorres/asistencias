
module.exports = (sequelize, DataTypes) => {
    const asistencias = sequelize.define(
      "asistencias",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: DataTypes.INTEGER,
        },
        fecha: DataTypes.STRING,
        hora_ingreso: DataTypes.STRING,
        hora_salida: DataTypes.STRING,
        estado_ingreso: DataTypes.STRING,
        estado_salida: DataTypes.STRING,
        foto_ingreso: DataTypes.STRING,
        foto_salida: DataTypes.STRING,
        latitud_ingreso: DataTypes.STRING,
        latitud_salida: DataTypes.STRING,
        estado_dia: DataTypes.STRING,



      },
      { timestamps: false, tableName: "asistencias", freezeTableName: true }
    );
  
    asistencias.associate = function (models) {
    asistencias.belongsTo(models.empleados, { foreignKey: "empleado_id" })

  
    };
  
    return asistencias;
  };