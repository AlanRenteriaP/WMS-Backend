// src/routes/index.ts
import express from 'express';
import authRoutes from './auth';
import productsManagementRoutes from './productsmanagement';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/productsmanagement',productsManagementRoutes);

export default router;
