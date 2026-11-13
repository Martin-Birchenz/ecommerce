const { ZodError } = require("zod");

const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body ?? {});
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const details = (error.issues || error.errors || []).map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Error de validación en los datos enviados",
        errors: details,
      });
    }
    next(error);
  }
};

module.exports = { validate };
