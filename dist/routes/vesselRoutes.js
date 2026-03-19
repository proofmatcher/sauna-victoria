import express from "express";
import { createVessel, listVessels, updateVessel, deleteVessel, updateVesselCapacity } from "../controllers/vesselController.js";
import { vesselUpload } from "../config/imageUpload.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
const router = express.Router();
router.post("/createVessel", protect, authorize("admin"), vesselUpload.array('images', 5), createVessel);
router.get("/listVessels", protect, authorize("admin"), listVessels);
router.put("/updateVessel/:id", protect, authorize("admin"), vesselUpload.array('images', 5), updateVessel);
router.patch("/updateCapacity/:id", protect, authorize("admin"), updateVesselCapacity);
router.delete("/deleteVessel/:id", protect, authorize("admin"), deleteVessel);
export default router;
//# sourceMappingURL=vesselRoutes.js.map