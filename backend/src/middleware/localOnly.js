export const localOnly = (req, res, next) => {
  if (process.env.DISABLE_LOCAL_FEATURES === "true") {
    return res.status(501).json({
      error:
        "This feature (browser automation) is only available in local mode.",
    });
  }
  next();
};
