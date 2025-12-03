import express from "express";
import { listUpcomingTrips, tripDetails } from "../controllers/publicController.js";
const router = express.Router();
router.get("/trips", listUpcomingTrips);
router.get("/trips/:id", tripDetails);
export default router;
//# sourceMappingURL=publicRoutes.js.map