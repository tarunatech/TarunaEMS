// middleware/validateRequest.js
import { validationResult } from 'express-validator';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = [];
    errors.array().map(err => extractedErrors.push({ 
      field: err.path || err.param, 
      message: err.msg 
    }));

    console.log('Validation errors:', extractedErrors);

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: extractedErrors
    });
  }

  next();
};