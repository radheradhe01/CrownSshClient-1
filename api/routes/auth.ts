import { Router } from 'express';
import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import logger from '../utils/logger.js';
import { IUser } from '../models/User.js';
import { User } from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/requireAuth.js';

const router = Router();

// Google Auth Trigger
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google Auth Callback
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err: any, user: any, info: any) => {
    if (err) {
      logger.error('Passport auth error:', err);
      return res.redirect(`/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
    }
    if (!user) {
      return res.redirect(`/login?error=${encodeURIComponent(info?.message || 'User not found')}`);
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        logger.error('Passport login error:', loginErr);
        return res.redirect(`/login?error=${encodeURIComponent(loginErr.message || 'Login failed')}`);
      }

      // Explicitly save session before redirecting to avoid race conditions with MongoDB store
      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error('Session save error:', saveErr);
        }
        // Redirect to the root of the site (the dashboard)
        res.redirect('/');
      });
    });
  })(req, res, next);
});

// Get current user (includes role and 2FA status)
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  if (req.isAuthenticated() && req.user) {
    const user = req.user as IUser;
    res.json({
      user: {
        id: (user as any)._id?.toString() || (user as any).id,
        displayName: user.displayName,
        email: user.email,
        photos: user.photo ? [{ value: user.photo }] : [],
        role: user.role,
        isTotpEnabled: user.isTotpEnabled || false,
      }
    });
  } else {
    res.status(401).json({ user: null });
  }
}));

// Logout
router.post('/logout', asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.json({ success: true });
  });
}));

// Get all users (admin only) - for role management
router.get('/users', requireAuth, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const users = await User.find({}, '-totpSecret').lean();
  const formatted = users.map((u: any) => ({
    id: u._id.toString(),
    displayName: u.displayName,
    email: u.email,
    photo: u.photo,
    role: u.role,
  }));
  res.json(formatted);
}));

// Update user role (admin only)
router.put('/users/:id/role', requireAuth, requireRole('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body;
  if (!role || !['admin', 'user'].includes(role)) {
    res.status(400).json({ error: 'Invalid role. Must be "admin" or "user".' });
    return;
  }

  const updated = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    id: updated._id.toString(),
    displayName: updated.displayName,
    email: updated.email,
    role: updated.role,
  });
}));

export default router;
