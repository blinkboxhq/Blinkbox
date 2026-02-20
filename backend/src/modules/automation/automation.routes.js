import express from "express";
import Automation from "../../models/automation.model.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const automation = await Automation.create(req.body);
    res.json({ success: true, automation });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
