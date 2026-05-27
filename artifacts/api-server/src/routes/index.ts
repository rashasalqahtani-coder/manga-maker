import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mangaRouter from "./manga";
import comickRouter from "./comick";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mangaRouter);
router.use("/comick", comickRouter);

export default router;
