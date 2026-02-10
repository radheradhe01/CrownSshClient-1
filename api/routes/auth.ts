import { Router } from 'express';
import passport from 'passport';

const router = Router();

// Google Auth Trigger
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google Auth Callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    // Dynamic redirect based on environment
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/`); 
  }
);

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
