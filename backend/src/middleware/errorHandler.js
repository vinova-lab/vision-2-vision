// Consistent error response format across all routes
export function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message, err.stack);

  if (err.type === 'validation') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: err.message, details: err.details },
    });
  }

  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

export function notFound(req, res) {
  return res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
}
