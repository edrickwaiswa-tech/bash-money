import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import membersRouter from "./members";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";
import memberNotificationsRouter from "./member-notifications";
import uploadsRouter from "./uploads";
import reportsRouter from "./reports";
import loansRouter from "./loans";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(uploadsRouter);
router.use(membersRouter);
router.use(transactionsRouter);
router.use(dashboardRouter);
router.use(memberNotificationsRouter);
router.use(reportsRouter);
router.use(loansRouter);

export default router;
