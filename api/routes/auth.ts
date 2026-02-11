import { Router } from 'express';
import passport from 'passport';

const router = Router();

// Google Auth Trigger
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google Auth Callback
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err: any, user: any, info: any) => {
    if (err) {
      console.error('Passport auth error:', err);
      return res.redirect(`${process.env.FRONTEND_URL || ''}/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
    }
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || ''}/login?error=${encodeURIComponent(info?.message || 'User not found')}`);
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Passport login error:', loginErr);
        return res.redirect(`${process.env.FRONTEND_URL || ''}/login?error=${encodeURIComponent(loginErr.message || 'Login failed')}`);
      }
      // Successful authentication, redirect home.
      const frontendUrl = process.env.FRONTEND_URL || '';
      res.redirect(`${frontendUrl}/`);
    });
  })(req, res, next);
});

// Get current user
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
  }
});

// Logout
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.json({ success: true });
  });
});

export default router;
