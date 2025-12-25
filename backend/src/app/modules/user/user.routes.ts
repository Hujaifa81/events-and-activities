import { Router } from "express";

const router= Router();

router.get("/", (req, res) => {
    res.send("User Module Works!");
});

export default router;