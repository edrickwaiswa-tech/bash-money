import { Router, type IRouter } from "express";
import healthRouter from "./health";
import membersRouter from "./members";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(membersRouter);
router.use(transactionsRouter);
router.use(dashboardRouter);

export default router;
