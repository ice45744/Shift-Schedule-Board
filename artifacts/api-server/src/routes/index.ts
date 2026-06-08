import { Router, type IRouter } from "express";
import healthRouter from "./health";
import membersRouter from "./members";
import locationsRouter from "./locations";
import schedulesRouter from "./schedules";
import assignmentsRouter from "./assignments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(membersRouter);
router.use(locationsRouter);
router.use(schedulesRouter);
router.use(assignmentsRouter);

export default router;
