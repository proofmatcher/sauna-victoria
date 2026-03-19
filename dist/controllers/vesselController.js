import Vessel from "../models/Vessel.js";
import Trip from "../models/Trip.js";
import { processVesselImage, deleteImageFiles } from "../config/imageUpload.js";
export const createVessel = async (req, res) => {
    const { name, type, capacity, inventory, basePriceCents, minimumDays, discountThreshold, discountPercent, pickupDropoffDay, pricingTiers: rawPricingTiers } = req.body;
    // Parse pricingTiers if it's a JSON string (from FormData)
    let pricingTiers;
    if (rawPricingTiers) {
        try {
            pricingTiers = typeof rawPricingTiers === 'string'
                ? JSON.parse(rawPricingTiers)
                : rawPricingTiers;
        }
        catch (e) {
            console.error("Failed to parse pricingTiers:", e);
            pricingTiers = rawPricingTiers;
        }
    }
    // Parse numeric fields from FormData strings
    const parsedCapacity = capacity ? parseInt(capacity) : undefined;
    const parsedInventory = inventory ? parseInt(inventory) : 1;
    const parsedBasePriceCents = basePriceCents ? parseInt(basePriceCents) : undefined;
    const parsedMinimumDays = minimumDays ? parseInt(minimumDays) : undefined;
    const parsedDiscountThreshold = discountThreshold ? parseInt(discountThreshold) : undefined;
    const parsedDiscountPercent = discountPercent ? parseInt(discountPercent) : undefined;
    const parsedPickupDropoffDay = pickupDropoffDay !== undefined ? parseInt(pickupDropoffDay) : undefined;
    // Process uploaded images
    const images = [];
    const imageVariants = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const slug = name ? name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim() : 'vessel';
        // Process each uploaded file
        for (const file of req.files) {
            try {
                const processed = await processVesselImage(file.path, slug);
                images.push(processed.image);
                imageVariants.push(processed.imageVariants);
            }
            catch (err) {
                console.error('Error processing vessel image during creation:', err);
            }
        }
    }
    const vessel = await Vessel.create({
        name,
        type,
        capacity: parsedCapacity,
        inventory: parsedInventory,
        basePriceCents: parsedBasePriceCents,
        minimumDays: parsedMinimumDays,
        discountThreshold: parsedDiscountThreshold,
        discountPercent: parsedDiscountPercent,
        pickupDropoffDay: parsedPickupDropoffDay,
        pricingTiers,
        images: images.length > 0 ? images : undefined,
        imageVariants: imageVariants.length > 0 ? imageVariants : undefined
    });
    res.status(201).json(vessel);
};
export const listVessels = async (req, res) => {
    const vessels = await Vessel.find().sort({ createdAt: -1 });
    res.json(vessels);
};
export const updateVessel = async (req, res) => {
    try {
        const vesselId = req.params.id;
        const updates = req.body;
        // Parse pricingTiers if it's a JSON string (from FormData)
        if (updates.pricingTiers) {
            try {
                updates.pricingTiers = typeof updates.pricingTiers === 'string'
                    ? JSON.parse(updates.pricingTiers)
                    : updates.pricingTiers;
            }
            catch (e) {
                console.error("Failed to parse pricingTiers:", e);
            }
        }
        // Parse numeric fields from FormData strings
        if (updates.capacity !== undefined)
            updates.capacity = parseInt(updates.capacity);
        if (updates.inventory !== undefined)
            updates.inventory = parseInt(updates.inventory);
        if (updates.basePriceCents !== undefined)
            updates.basePriceCents = parseInt(updates.basePriceCents);
        if (updates.minimumDays !== undefined)
            updates.minimumDays = parseInt(updates.minimumDays);
        if (updates.discountThreshold !== undefined)
            updates.discountThreshold = parseInt(updates.discountThreshold);
        if (updates.discountPercent !== undefined)
            updates.discountPercent = parseInt(updates.discountPercent);
        if (updates.pickupDropoffDay !== undefined)
            updates.pickupDropoffDay = parseInt(updates.pickupDropoffDay);
        // Fetch the existing vessel to handle images
        const existingVessel = await Vessel.findById(vesselId);
        if (!existingVessel) {
            return res.status(404).json({ message: "Vessel not found" });
        }
        // Handle existing images that the client wants to keep
        let finalImages = [];
        let finalImageVariants = [];
        // Parse existingImages if sent as a stringified JSON array (from FormData)
        let keptImages = [];
        if (updates.existingImages) {
            try {
                keptImages = typeof updates.existingImages === 'string'
                    ? JSON.parse(updates.existingImages)
                    : updates.existingImages;
            }
            catch (e) {
                console.error("Failed to parse existingImages:", e);
            }
        }
        // Add kept images back to the final arrays
        if (existingVessel.images && existingVessel.imageVariants) {
            existingVessel.images.forEach((img, index) => {
                if (keptImages.includes(img)) {
                    finalImages.push(img);
                    finalImageVariants.push(existingVessel.imageVariants[index]);
                }
                else {
                    // Image was removed by user, delete from disk
                    try {
                        deleteImageFiles(img);
                    }
                    catch (err) {
                        console.error("Error deleting removed vessel image from disk:", err);
                    }
                }
            });
        }
        // Process new uploaded images
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            const slug = (updates.name || existingVessel.name).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
            for (const file of req.files) {
                try {
                    const processed = await processVesselImage(file.path, slug);
                    finalImages.push(processed.image);
                    finalImageVariants.push(processed.imageVariants);
                }
                catch (err) {
                    console.error('Error processing new vessel image during update:', err);
                }
            }
        }
        // Update the image fields in the updates object
        updates.images = finalImages;
        updates.imageVariants = finalImageVariants;
        // Check if capacity is being changed
        const isCapacityChanged = updates.capacity !== undefined;
        if (isCapacityChanged) {
            // Handle capacity change with proper validation and trip updates
            const { handleVesselCapacityChange } = await import("../utils/capacityUtils.js");
            const result = await handleVesselCapacityChange(vesselId, updates.capacity);
            if (!result.success) {
                return res.status(400).json({
                    message: result.message,
                    error: "Capacity change validation failed"
                });
            }
            // Remove capacity from updates since it's already handled
            const { capacity, ...otherUpdates } = updates;
            // Apply other updates if any
            let updatedVessel;
            if (Object.keys(otherUpdates).length > 0) {
                updatedVessel = await Vessel.findByIdAndUpdate(vesselId, otherUpdates, { new: true });
            }
            else {
                updatedVessel = await Vessel.findById(vesselId);
            }
            return res.json({
                vessel: updatedVessel,
                capacityChangeResult: result
            });
        }
        else {
            // No capacity change, just regular update
            const updatedVessel = await Vessel.findByIdAndUpdate(vesselId, updates, { new: true });
            if (!updatedVessel) {
                return res.status(404).json({ message: "Vessel not found" });
            }
            res.json({ vessel: updatedVessel });
        }
    }
    catch (error) {
        console.error('Error updating vessel:', error);
        res.status(500).json({ message: "Error updating vessel", error: String(error) });
    }
};
// Specific endpoint for capacity changes with detailed feedback
export const updateVesselCapacity = async (req, res) => {
    try {
        const { id: vesselId } = req.params;
        const { capacity } = req.body;
        if (!capacity || typeof capacity !== 'number' || capacity < 1) {
            return res.status(400).json({
                message: "Valid capacity (positive number) is required"
            });
        }
        const { handleVesselCapacityChange } = await import("../utils/capacityUtils.js");
        const result = await handleVesselCapacityChange(vesselId, capacity);
        if (!result.success) {
            return res.status(400).json(result);
        }
        const updatedVessel = await Vessel.findById(vesselId);
        res.json({
            message: result.message,
            vessel: updatedVessel,
            details: result.details,
            affectedTrips: result.affectedTrips
        });
    }
    catch (error) {
        console.error('Error updating vessel capacity:', error);
        res.status(500).json({
            message: "Error updating vessel capacity",
            error: String(error)
        });
    }
};
export const deleteVessel = async (req, res) => {
    try {
        const vessel = await Vessel.findByIdAndDelete(req.params.id);
        if (!vessel) {
            return res.status(404).json({ message: "Vessel not found" });
        }
        // Delete all trips associated with this vessel
        await Trip.deleteMany({ vessel: req.params.id });
        // Delete associated images from disk
        if (vessel.images && vessel.images.length > 0) {
            for (const img of vessel.images) {
                try {
                    deleteImageFiles(img);
                }
                catch (err) {
                    console.error("Error deleting vessel image from disk during vessel deletion:", err);
                }
            }
        }
        res.status(201).json({
            message: "Vessel deleted successfully",
            deletedVessel: {
                id: vessel._id,
                name: vessel.name
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error deleting vessel" });
    }
};
//# sourceMappingURL=vesselController.js.map