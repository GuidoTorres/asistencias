
const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const config = require("../../config/database.js");

const db = {};
const sequelize = new Sequelize(config);

fs.readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf(".") !== 0) && (file !== path.basename(__filename));
  })
  .forEach(file => {
    // Cambio principal: utilizar `require` en lugar de `sequelize.import`
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// db.sequelize.sync({ force: false }).then(() => {
//   console.log("Database & tables created!");
// });
module.exports = db;
