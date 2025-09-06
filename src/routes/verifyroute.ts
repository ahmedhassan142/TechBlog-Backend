// Create a new file: routes/verifyRoute.ts
import express from "express"
import { verifyEmail ,resendVerification} from "../controllers/verfiyemail.js";

const router = express.Router();
router.get("/verifyemail", verifyEmail);
router.post("/resend-email",resendVerification)  // Now accessible at /api/user/verify

export default router;