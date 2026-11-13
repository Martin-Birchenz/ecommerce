const StoreRepository = require("../repositories/store.repository.js");

const PublicStoreController = {
  getBootstrap: async (req, res, next) => {
    try {
      const data = await StoreRepository.getBootstrapData(req.storeId);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Configuración de tienda no encontrada",
        });
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = PublicStoreController;
