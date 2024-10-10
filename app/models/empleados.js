
module.exports = (sequelize, DataTypes) => {
    const empleados = sequelize.define(
      "empleados",
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: DataTypes.INTEGER,
        },
        dni: DataTypes.STRING,
        nombre: DataTypes.STRING,

      },
      { timestamps: false, tableName: "empleados", freezeTableName: true }
    );
  
    empleados.associate = function (models) {
    empleados.hasMany(models.asistencias, { foreignKey: "empleado_id" })

  
    };
  
    return empleados;
  };