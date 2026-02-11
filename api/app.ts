/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import helmet from 'helmet'
import compression from 'compression'
import logger from './utils/logger.js'

import authRoutes from './routes/auth.js'
import vmRoutes from './routes/vms.js'
import environmentRoutes from './routes/environments.js'
import executionRoutes from './routes/execution.js'

// for esm mode
// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

// Security Middleware
app.use(helmet())

// Gzip Compression
app.use(compression())

// Trust proxy (required for Nginx/Cloudflare and secure cookies)
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
  next();
});
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Session config
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.mongo || 'mongodb://localhost:27017/sshclient', // Fallback for safety
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60, // = 14 days. Default
    touchAfter: 24 * 3600 // time period in seconds: 24 hours
  }),
  cookie: { 
    secure: process.env.NODE_ENV === 'production' || !!process.env.FRONTEND_URL?.startsWith('https'),
    maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Passport config
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: Express.User, done) => {
  done(null, user);
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // Use the public-facing URL for the callback
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    // In a real app, you'd save user to DB here
    return done(null, profile);
  }));
} else {
  console.warn("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not set. OAuth will not work.");
}

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/vms', vmRoutes)
app.use('/api/environments', environmentRoutes)
app.use('/api/execute', executionRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * error handler middleware
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
