import { Router } from "express";
import { register, login, googleLogin } from "./auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin); // 👈 If this line is missing or the file wasn't saved, you get a 404!

export default router;
