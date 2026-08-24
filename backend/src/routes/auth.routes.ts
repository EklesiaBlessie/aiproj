import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { register, login, me, ssoLoginCallback } from '../controllers/auth.controller';

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: >
 *       Creates a user and returns a JWT alongside the public profile. The
 *       password is hashed with bcrypt before storage and never returned.
 *       Copy `data.token` into the **Authorize** dialog to unlock the
 *       padlocked endpoints. Omitting `role` defaults the user to `viewer`,
 *       which cannot delete feedback — register with `role: "admin"` if you
 *       want to exercise `DELETE /api/feedback/{id}`.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User created; token issued.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               message: User registered successfully
 *               data:
 *                 token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0ZjFhMmIzIn0.sIgNaTuRe
 *                 user:
 *                   id: 64f1a2b3c4d5e6f7a8b9c0d1
 *                   email: pm@example.com
 *                   name: Arpita Dev
 *                   role: product_manager
 *                   createdAt: '2026-08-03T23:30:00.000Z'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: A user with this email already exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: User with this email already exists
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/register', validate(registerSchema), register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in an existing user
 *     description: >
 *       Verifies the credentials and returns a fresh JWT. A wrong email and a
 *       wrong password both return the same 401 message so the response cannot
 *       be used to probe which emails are registered.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Credentials accepted; token issued.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *             example:
 *               success: true
 *               message: Login successful
 *               data:
 *                 token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0ZjFhMmIzIn0.sIgNaTuRe
 *                 user:
 *                   id: 64f1a2b3c4d5e6f7a8b9c0d1
 *                   email: pm@example.com
 *                   name: Arpita Dev
 *                   role: product_manager
 *                   createdAt: '2026-08-03T23:30:00.000Z'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Email not found or password did not match.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: Invalid email or password
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/login', validate(loginSchema), login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current user's profile
 *     description: >
 *       Re-reads the user named by the bearer token from the database, so it
 *       reflects the live record rather than the token's claims. Useful for
 *       confirming which role the token you pasted into **Authorize** carries.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The authenticated user's profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: 64f1a2b3c4d5e6f7a8b9c0d1
 *                 email: pm@example.com
 *                 name: Arpita Dev
 *                 role: product_manager
 *                 createdAt: '2026-08-03T23:30:00.000Z'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Token is valid but the user record no longer exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: User account not found
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/me', authenticate, me);

// ── Enterprise SSO OAuth mockup endpoint ──
router.post('/sso/callback', ssoLoginCallback);

export default router;
