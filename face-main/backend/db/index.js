import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as userSchema from './schema/user.js';
import * as departmentSchema from './schema/department.js';
import * as employeeSchema from './schema/employee.js';
import * as attendanceSchema from './schema/attendance.js';
import * as leaveSchema from './schema/leave.js';
import * as holidaySchema from './schema/holiday.js';
import * as taskSchema from './schema/task.js';
import * as performanceReviewSchema from './schema/performanceReview.js';
import * as dayBookSchema from './schema/dayBook.js';
import * as payslipSchema from './schema/payslip.js';
import * as expenseTransactionSchema from './schema/expenseTransaction.js';
import * as purchaseOrderSchema from './schema/purchaseOrder.js';
import * as supplierSchema from './schema/supplier.js';
import * as leadSchema from './schema/lead.js';
import * as salesPipelineSchema from './schema/salesPipeline.js';
import * as interviewScheduleSchema from './schema/interviewSchedule.js';
import * as problemSchema from './schema/problem.js';
import * as notificationSchema from './schema/notification.js';
import * as groupSchema from './schema/group.js';
import * as groupMessageSchema from './schema/groupMessage.js';
import * as messageSchema from './schema/message.js';
import * as faceDataSchema from './schema/faceData.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, {
  schema: {
    ...userSchema,
    ...departmentSchema,
    ...employeeSchema,
    ...attendanceSchema,
    ...leaveSchema,
    ...holidaySchema,
    ...taskSchema,
    ...performanceReviewSchema,
    ...dayBookSchema,
    ...payslipSchema,
    ...expenseTransactionSchema,
    ...purchaseOrderSchema,
    ...supplierSchema,
    ...leadSchema,
    ...salesPipelineSchema,
    ...interviewScheduleSchema,
    ...problemSchema,
    ...notificationSchema,
    ...groupSchema,
    ...groupMessageSchema,
    ...messageSchema,
    ...faceDataSchema,
  },
});

export const ensurePostgresExtensions = async () => {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
};

export default db;
