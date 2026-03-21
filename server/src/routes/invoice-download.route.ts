import { Router } from "express";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

const router = Router();

/**
 * Bug 12 Fix: Generate a temporary download token for PDF
 * Instead of exposing the main JWT in the URL
 */
router.post("/get-download-token", async (req, res, next) => {
  try {
    const { resourceType, resourceId } = req.body; // e.g. "invoice", "SO-123"
    
    // Generate a short-lived token (5 mins)
    const token = jwt.sign(
      { resourceType, resourceId },
      env.JWT_SECRET,
      { expiresIn: "5m" }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

/**
 * Handle the actual download with the token
 */
router.get("/download/:token", async (req, res, next) => {
  try {
    const { token } = req.params;
    
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    const { resourceType, resourceId } = decoded;

    // Logic to fetch PDF content would go here
    // For now, we just redirect or send a success message to prove it works
    res.send(`Downloading ${resourceType} ${resourceId} with secure token`);
  } catch (error) {
    next(new ApiError(401, "Invalid or expired download token"));
  }
});

export default router;
