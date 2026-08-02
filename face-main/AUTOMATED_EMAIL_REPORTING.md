# Automated Daily Task Status Email Reporting

## Overview

The system now automatically sends daily task status emails to **tarunatechnology@gmail.com** at three scheduled times in IST (Indian Standard Time):
- **12:05 PM IST**
- **12:10 PM IST**
- **12:15 PM IST**

Each email contains the real-time task status for individual employees at the moment of sending.

## Features

### ✅ Email Scheduling
- **IST Timezone Support**: All scheduled times are in IST (Asia/Kolkata)
- **Three Daily Sends**: Redundant scheduling ensures reports are sent even if one job fails
- **Real-time Snapshots**: Each email reflects current task status at send time

### ✅ Email Content
Each email includes:
- **Employee Information**
  - Name
  - Email ID
  - Department
  - Employee ID
- **Task Details** (for all tasks assigned to the employee)
  - Task Description
  - Status (Not Started, In Progress, Review, Completed, On Hold, Cancelled)
  - Priority (Low, Medium, High, Critical)
  - Due Date
  - Estimated Hours
- **Summary Statistics**
  - Total tasks
  - Completed tasks
  - In-progress tasks
  - Pending tasks

### ✅ Email Sender Configuration
- **Admin Email Account**: Used for SMTP authentication only
- **Displayed Sender**: Shows employee's name and email for personalization
- **Reply-To**: Set to employee's email address
- **Recipient**: Fixed as tarunatechnology@gmail.com
- **Security**: Employee credentials are never used for authentication

## Configuration

### Environment Variables Required

Set these in your Replit environment:

```
ADMIN_SYSTEM_EMAIL=your-gmail@gmail.com
ADMIN_SYSTEM_PASSWORD=your-app-specific-password
```

### Obtaining Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable "2-Step Verification" if not already enabled
3. Create an [App Password](https://myaccount.google.com/apppasswords)
4. Select "Mail" and "Windows Computer" (or your device)
5. Use the generated 16-character password as `ADMIN_SYSTEM_PASSWORD`

**Important**: Use the app-specific password, NOT your regular Gmail password.

## API Endpoints

### Get Scheduler Status
```
GET /api/scheduler/status
```

Returns the current scheduler configuration:
```json
{
  "success": true,
  "scheduler": {
    "isRunning": true,
    "jobCount": 3,
    "scheduledTimes": ["12:05 PM IST", "12:10 PM IST", "12:15 PM IST"],
    "recipient": "tarunatechnology@gmail.com"
  }
}
```

### Manually Trigger Report (Testing)
```
POST /api/scheduler/trigger-report
```

Immediately sends task status emails to all active employees for testing purposes.

## How It Works

1. **Initialization**: On server startup, the email service initializes with configured Gmail credentials
2. **Scheduler Setup**: Three cron jobs are registered for IST times
3. **Scheduled Execution**: At each scheduled time:
   - Query all active employees from database
   - Fetch tasks assigned to each employee
   - Generate HTML email with task details and styling
   - Send email from admin account, displaying employee info
   - Log success/failure for each email
4. **Error Handling**: Failures are logged but don't stop the scheduler

## Implementation Details

### Files Added/Modified

**New Files:**
- `backend/services/emailService.js` - Email service with nodemailer configuration
- `backend/services/taskSchedulerService.js` - Cron scheduler for task reporting
- `backend/routes/schedulerRoutes.js` - API endpoints for scheduler management

**Modified Files:**
- `backend/server.js` - Email service and scheduler initialization

### Technology Stack

- **Scheduler**: `node-cron` - Reliable cron job management
- **Email**: `nodemailer` - Gmail SMTP integration
- **Timezone**: Native Node.js timezone support (Asia/Kolkata)
- **Formatting**: HTML emails with professional styling

## Logging

All email sending and scheduler operations are logged with timestamps:

```
✅ Email service initialized successfully
✅ Scheduled task status report job at 12:05 PM IST
✅ Task status scheduler initialized successfully
📧 Starting task status report generation...
✅ Email sent successfully for employee: John Doe
✅ Task status reports completed. Success: 15, Failed: 0
```

## Troubleshooting

### Emails Not Sending
1. **Check Environment Variables**: Verify `ADMIN_SYSTEM_EMAIL` and `ADMIN_SYSTEM_PASSWORD` are set
2. **Verify Gmail Credentials**: Test the app password manually
3. **Check Server Logs**: Look for email initialization errors at server startup
4. **Test Manually**: Use `POST /api/scheduler/trigger-report` to test

### Schedule Not Running
1. **Check Backend Logs**: Verify "Task status scheduler initialized successfully" message
2. **Verify Email Service**: Look for "Email service initialized successfully" message
3. **Check IST Time**: Ensure server system time is correct
4. **Restart Backend**: Stop and restart the backend workflow

### Employees Not Receiving Emails
1. **Check Email Address**: Verify employee has valid `workInfo.email` in database
2. **Check Database**: Ensure employees are marked as `isActive: true`
3. **Check Recipient**: Confirm `tarunatechnology@gmail.com` is correct
4. **Test Trigger**: Use manual trigger endpoint to verify email delivery

## Security Notes

- ✅ Admin email credentials are stored securely as environment variables
- ✅ Employee email addresses are never used for SMTP authentication
- ✅ Only admin credentials are exposed to email service
- ✅ Employee information is read-only for reporting purposes
- ✅ Emails are sent on behalf of employees with proper From/Reply-To headers

## Future Enhancements

Potential improvements:
- Configurable recipient email(s)
- Email frequency customization
- Additional scheduled times
- Email filtering by department
- Task completion rate analytics
- Dashboard for email delivery history
