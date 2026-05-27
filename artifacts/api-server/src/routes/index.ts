import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mangaRouter from "./manga";
import comickRouter from "./comick";
import teamsRouter from "./teams";
import commentsRouter from "./comments";
import teamImagesRouter from "./teamImages";
import mangastarzRouter from "./mangastarz";
import linkmangaRouter from "./linkmanga";
import kenmangaRouter from "./kenmanga";
import asqRouter from "./asq";
import rorymRouter from "./rorym";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mangaRouter);
router.use("/comick", comickRouter);
router.use(teamsRouter);
router.use(commentsRouter);
router.use(teamImagesRouter);
router.use(mangastarzRouter);
router.use(linkmangaRouter);
router.use(kenmangaRouter);
router.use(asqRouter);
router.use(rorymRouter);

export default router;
