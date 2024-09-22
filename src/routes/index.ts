// src/routes/index.ts
import express from 'express';
import authRoutes from './auth';
import usersRoutes from './users';
import storesRoutes from './stores';
import productsManagementRoutes from './productsmanagement';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/stores', storesRoutes);
router.use('/productsmanagement',productsManagementRoutes);

export default router;
