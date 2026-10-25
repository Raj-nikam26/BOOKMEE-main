import jwt from 'jsonwebtoken';

const auth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    // Admin and customer tokens carry a role and must never open provider routes.
    if (decoded.role || !decoded.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Session expired. Please log in again' });
  }
};

export default auth;
