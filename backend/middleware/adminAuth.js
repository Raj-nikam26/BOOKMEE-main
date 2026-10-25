import jwt from 'jsonwebtoken';

const adminAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.admin = { email: decoded.email };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Admin session expired. Please log in again' });
  }
};

export default adminAuth;
