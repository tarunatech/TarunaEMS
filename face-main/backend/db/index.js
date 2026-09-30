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
import * as offerLetterSchema from './schema/offerLetter.js';

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
    ...offerLetterSchema,
  },
});

export const ensurePostgresExtensions = async () => {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "offer_letters" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "employeeName" varchar(255) NOT NULL,
      "role" varchar(255) NOT NULL,
      "joiningDate" varchar(128) NOT NULL,
      "companyName" varchar(255) NOT NULL DEFAULT 'Taruna Technology',
      "location" varchar(255) NOT NULL DEFAULT 'Vadodara',
      "duration" varchar(128) NOT NULL DEFAULT 'three (3) months',
      "workingHours" varchar(255) NOT NULL DEFAULT '10:00 AM to 7:00 PM, Monday to Saturday',
      "signatoryName" varchar(255) NOT NULL DEFAULT 'MIHIR MAKWANA',
      "signatoryRole" varchar(255) NOT NULL DEFAULT 'Operational Manager',
      "employeeId" varchar(128),
      "candidateId" varchar(128),
      "pdfPath" varchar(1024),
      "status" varchar(64) NOT NULL DEFAULT 'Generated',
      "createdBy" uuid NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query('ALTER TABLE "dayBooks" ADD COLUMN IF NOT EXISTS "isHalfDay" boolean DEFAULT false');
  await pool.query('ALTER TABLE "dayBooks" ADD COLUMN IF NOT EXISTS "halfDayType" varchar(32) DEFAULT \'full\'');
  await pool.query('ALTER TABLE "dayBooks" ADD COLUMN IF NOT EXISTS "includeBreak" boolean DEFAULT true');
  await pool.query('ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "achievedSoFar" text DEFAULT \'\'');
};

export default db;
