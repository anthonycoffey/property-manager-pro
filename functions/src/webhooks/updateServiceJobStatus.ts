import * as functions from "firebase-functions";
import { z } from "zod";
import * as dotenv from "dotenv";
import { db, FieldValue } from "../firebaseAdmin.js";

// Load environment variables from .env file
dotenv.config();

// Zod schema for request body validation
const jobStatusUpdateSchema = z.object({
  FormSubmissionId: z.coerce.string(),
  jobId: z.coerce.string(),
  status: z.string(),
  paymentStatus: z.string(),
  updatedAt: z.string(), // Assuming updatedAt is an ISO string
  sourceMeta: z.object({
    organizationId: z.string(),
  }),
});

export const updateServiceJobStatus = functions.https.onRequest(async (req, res) => {
  // 1. Security Check: Verify the secret key
  const authHeader = req.headers.authorization;
  const secret = process.env.PHOENIX_WEBHOOK_SECRET;

  if (!secret) {
    console.error("PHOENIX_WEBHOOK_SECRET is not set in environment variables.");
    res.status(500).send("Internal Server Error: Missing secret configuration.");
    return;
  }

  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    console.warn("Unauthorized access attempt to updateServiceJobStatus webhook.");
    res.status(401).send("Unauthorized");
    return;
  }

  // 2. Ensure it's a POST request
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // 3. Validate the request body
  const validationResult = jobStatusUpdateSchema.safeParse(req.body);
  if (!validationResult.success) {
    console.error("payload:", req.body);
    console.error("Invalid request body:", validationResult.error);
    res.status(400).send({ message: "Bad Request", errors: validationResult.error.flatten() });
    return;
  }

  const { FormSubmissionId, jobId, status, paymentStatus, sourceMeta } = validationResult.data;
  const { organizationId } = sourceMeta;

  if (!organizationId) {
    console.error("Organization ID is missing from sourceMeta.");
    res.status(400).send({ message: "Bad Request", error: "Missing organizationId in sourceMeta" });
    return;
  }

  try {
    // 4. Find the service document using a direct path
    const servicesRef = db.collection("organizations").doc(organizationId).collection("services");
    const querySnapshot = await servicesRef.where("phoenixSubmissionId", "==", parseInt(FormSubmissionId, 10)).limit(1).get();

    if (querySnapshot.empty) {
      console.warn(`No service found with phoenixSubmissionId: ${FormSubmissionId} in organization ${organizationId}`);
      res.status(404).send({ message: "Service document not found." });
      return;
    }

    // 5. Update the document
    const docToUpdate = querySnapshot.docs[0];
    await docToUpdate.ref.update({
      status: status,
      paymentStatus: paymentStatus,
      phoenixJobId: jobId,
      lastPhoenixSync: FieldValue.serverTimestamp(),
    });

    console.info(`Successfully updated service ${docToUpdate.id} for job ${jobId}`);
    res.status(200).send({ message: "Update successful." });

  } catch (error) {
    console.error("Error updating service status:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
});
