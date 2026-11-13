const app = require("./src/app.js");
const pool = require("./src/config/db.js");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Conexión exitosa a MySQL (Aiven Cloud)");
    connection.release();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor SaaS corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error al conectar con MySQL:", error.message);
    process.exit(1);
  }
};

startServer();
