import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import membersRouter from "./members";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";
import memberNotificationsRouter from "./member-notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(membersRouter);
router.use(transactionsRouter);
router.use(dashboardRouter);
router.use(memberNotificationsRouter);

export default router;
