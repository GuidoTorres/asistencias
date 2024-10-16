const multer = require("multer");

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}`);
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
