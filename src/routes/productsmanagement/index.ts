// src/routes/productsmanagement/index.ts
import express from 'express';
import productsRoutes from './products';
import sourcestoresRoutes from './sourcestores';

const router = express.Router();

// Define the sub-route under /productsmanagement
router.use('/products', productsRoutes);
router.use('/brands', productsRoutes);
router.use('/sourcestores', sourcestoresRoutes);

export default router;
