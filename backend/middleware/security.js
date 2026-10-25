const isPlainObject = (value) => value !== null && typeof value === 'object';

const hasUnsafeKey = (value, depth = 0) => {
  if (!isPlainObject(value) || depth > 8) return false;

  return Object.entries(value).some(([key, child]) => (
    key.startsWith('$') || key.includes('.') || key === '__proto__' || hasUnsafeKey(child, depth + 1)
  ));
};

/**
 * Blocks MongoDB operator injection. A request such as
 *   { "email": { "$ne": null } }
 * would otherwise be passed into a database query as an operator. No part of
 * this API ever needs a key that starts with "$" or contains a dot.
 */
export const rejectOperatorInjection = (req, res, next) => {
  if (hasUnsafeKey(req.body) || hasUnsafeKey(req.query) || hasUnsafeKey(req.params)) {
    return res.status(400).json({ message: 'Invalid request' });
  }
  next();
};

/**
 * Controllers attach the raw error text to failed responses, which is useful
 * while developing but tells an attacker about the database and the code.
 * For server errors the detail is written to the log and removed from the
 * response; in production it is removed from every response.
 */
export const hideErrorDetails = (req, res, next) => {
  const sendJson = res.json.bind(res);

  res.json = (body) => {
    if (isPlainObject(body) && 'error' in body) {
      const isServerError = res.statusCode >= 500;
      if (isServerError) console.error(`[${req.method} ${req.originalUrl}]`, body.error);

      if (isServerError || process.env.NODE_ENV === 'production') {
        const { error, ...safeBody } = body;
        if (isServerError) safeBody.message = 'Something went wrong. Please try again';
        return sendJson(safeBody);
      }
    }
    return sendJson(body);
  };

  next();
};
