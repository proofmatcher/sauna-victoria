import express from "express";
import { createVessel, listVessels, updateVessel, deleteVessel } from "../controllers/vesselController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/createVessel", protect, authorize("admin"), createVessel);
router.get("/listVessels", protect, authorize("admin"), listVessels);
router.put("/updateVessel/:id", protect, authorize("admin"), updateVessel);
router.delete("/deleteVessel/:id", protect, authorize("admin"), deleteVessel);

export default router;