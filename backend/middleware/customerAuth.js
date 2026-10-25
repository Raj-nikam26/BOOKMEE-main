import jwt from 'jsonwebtoken';

const readCustomer = (req) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    return decoded.role === 'customer' ? { id: decoded.id, email: decoded.email, verified: decoded.verified === true } : null;
  } catch (error) {
    return null;
  }
};

// Public pages work for everyone, but know who the customer is when they are logged in.
export const optionalCustomer = (req, res, next) => {
  req.customer = readCustomer(req);
  next();
};

export const requireCustomer = (req, res, next) => {
  req.customer = readCustomer(req);
  if (!req.customer) {
    return res.status(401).json({ message: 'Please log in to continue' });
  }
  next();
};
