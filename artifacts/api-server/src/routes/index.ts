import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mangaRouter from "./manga";
import comickRouter from "./comick";
import teamsRouter from "./teams";
import commentsRouter from "./comments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mangaRouter);
router.use("/comick", comickRouter);
router.use(teamsRouter);
router.use(commentsRouter);

export default router;
