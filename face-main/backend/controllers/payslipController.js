import Payslip from '../models/Payslip.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const generatePayslipPDF = async (payslip, employee) => {
  const PDFDocument = (await import('pdfkit')).default;
  const fileName = `payslip_${payslip.employeeId}_${payslip.period.month}_${payslip.period.year}_${uuidv4().slice(0, 8)}.pdf`;
  const tempDir = path.join(process.cwd(), 'temp', 'payslips');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const filePath = path.join(tempDir, fileName);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).font('Helvetica-Bold').text('PAYSLIP', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text('CompanyName Pvt Ltd', { align: 'center' });
    doc.fontSize(10).text('123 Business Park, Tech City', { align: 'center' });
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').text(`Pay Period: ${monthNames[payslip.period.month - 1]} ${payslip.period.year}`);
    doc.moveDown();

    doc.fontSize(12).font('Helvetica-Bold').text('EMPLOYEE DETAILS');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Employee Name: ${payslip.employeeName}`);
    doc.text(`Employee ID: ${payslip.employeeId}`);
    doc.text(`Department: ${employee?.workInfo?.department?.name || 'N/A'}`);
    doc.text(`Designation: ${employee?.workInfo?.position || 'N/A'}`);
    doc.moveDown();

    if (payslip.bankInfo?.accountNumber) {
      doc.text(`Bank: ${payslip.bankInfo.bankName || 'N/A'}`);
      doc.text(`Account: XXXX${payslip.bankInfo.accountNumber.slice(-4)}`);
      doc.text(`IFSC: ${payslip.bankInfo.ifscCode || 'N/A'}`);
      doc.moveDown();
    }

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    const startY = doc.y;
    
    doc.fontSize(11).font('Helvetica-Bold').text('EARNINGS', 50);
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    
    const earnings = [
      ['Basic Salary', payslip.earnings.basicSalary],
      ['HRA', payslip.earnings.hra],
      ['Medical Allowance', payslip.earnings.medical],
      ['Transport Allowance', payslip.earnings.transport],
      ['Bonus', payslip.earnings.bonus],
      ['Overtime', payslip.earnings.overtime],
      ['Other Allowances', payslip.earnings.otherAllowances]
    ].filter(([_, val]) => val > 0);

    earnings.forEach(([label, value]) => {
      doc.text(`${label}:`, 60);
      doc.text(`INR ${value.toLocaleString()}`, 200, doc.y - 12);
      doc.moveDown(0.3);
    });

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Gross Earnings:', 60);
    doc.text(`INR ${payslip.grossEarnings.toLocaleString()}`, 200, doc.y - 12);

    doc.y = startY;
    doc.fontSize(11).font('Helvetica-Bold').text('DEDUCTIONS', 320);
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');

    const deductions = [
      ['Provident Fund', payslip.deductions.pf],
      ['ESI', payslip.deductions.esi],
      ['Income Tax', payslip.deductions.tax],
      ['Professional Tax', payslip.deductions.professionalTax],
      ['Loan Deduction', payslip.deductions.loanDeduction],
      ['Other Deductions', payslip.deductions.otherDeductions]
    ].filter(([_, val]) => val > 0);

    deductions.forEach(([label, value]) => {
      doc.text(`${label}:`, 330);
      doc.text(`INR ${value.toLocaleString()}`, 470, doc.y - 12);
      doc.moveDown(0.3);
    });

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Total Deductions:', 330);
    doc.text(`INR ${payslip.totalDeductions.toLocaleString()}`, 470, doc.y - 12);

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    if (payslip.attendance) {
      doc.fontSize(11).font('Helvetica-Bold').text('ATTENDANCE SUMMARY');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Working Days: ${payslip.attendance.workingDays} | Present: ${payslip.attendance.presentDays} | Leave: ${payslip.attendance.leaveDays} | Absent: ${payslip.attendance.absentDays}`);
      doc.moveDown();
    }

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(14).font('Helvetica-Bold').fillColor('green');
    doc.text(`NET SALARY: INR ${payslip.netSalary.toLocaleString()}`, { align: 'center' });
    doc.fillColor('black');
    doc.moveDown(2);

    doc.fontSize(8).font('Helvetica').fillColor('gray');
    doc.text('This is a computer-generated document. No signature required.', { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(fileName));
    stream.on('error', reject);
  });
};

export const generatePayslip = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { employeeId, month, year, earnings, deductions, remarks, regenerate } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, month, and year are required'
      });
    }

    const employee = await Employee.findById(employeeId)
      .populate('user', 'name email')
      .populate('workInfo.department', 'name');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const existingPayslip = await Payslip.findOne({
      employee: employeeId,
      'period.month': month,
      'period.year': year
    });

    if (existingPayslip) {
      // If regenerate flag is true, delete the existing payslip and continue
      if (regenerate === true) {
        console.log(`Regenerating payslip for employee ${employee.employeeId} for ${month}/${year}`);

        // Delete the old PDF file if it exists
        if (existingPayslip.pdfPath) {
          const oldPdfPath = path.join(process.cwd(), 'temp', 'payslips', existingPayslip.pdfPath);
          if (fs.existsSync(oldPdfPath)) {
            try {
              fs.unlinkSync(oldPdfPath);
              console.log(`Deleted old PDF: ${existingPayslip.pdfPath}`);
            } catch (err) {
              console.error('Error deleting old PDF:', err);
            }
          }
        }

        // Delete the existing payslip from database
        await Payslip.findByIdAndDelete(existingPayslip._id);
        console.log(`Deleted existing payslip ID: ${existingPayslip._id}`);
      } else {
        // If regenerate flag is not set, return error with regenerate option
        return res.status(400).json({
          success: false,
          message: `Payslip already exists for ${month}/${year}.`,
          existingPayslip: {
            id: existingPayslip._id,
            generatedAt: existingPayslip.createdAt,
            netSalary: existingPayslip.netSalary
          },
          canRegenerate: true
        });
      }
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const attendanceRecords = await Attendance.find({
      $or: [
        { employee: employeeId },
        { user: employee.user._id }
      ],
      date: { $gte: startDate, $lte: endDate }
    });

    const workingDays = endDate.getDate();
    const presentDays = attendanceRecords.filter(a => 
      ['present', 'Present', 'late', 'Late'].includes(a.status)
    ).length;
    const leaveDays = attendanceRecords.filter(a => 
      ['leave', 'Leave', 'approved_leave'].includes(a.status)
    ).length;
    const absentDays = workingDays - presentDays - leaveDays;

    const payslipData = {
      employee: employeeId,
      employeeId: employee.employeeId,
      employeeName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
      period: { month, year },
      earnings: {
        basicSalary: earnings?.basicSalary ?? employee.salaryInfo.basicSalary,
        hra: earnings?.hra ?? employee.salaryInfo.allowances?.hra ?? 0,
        medical: earnings?.medical ?? employee.salaryInfo.allowances?.medical ?? 0,
        transport: earnings?.transport ?? employee.salaryInfo.allowances?.transport ?? 0,
        bonus: earnings?.bonus ?? 0,
        overtime: earnings?.overtime ?? 0,
        otherAllowances: earnings?.otherAllowances ?? employee.salaryInfo.allowances?.other ?? 0
      },
      deductions: {
        pf: deductions?.pf ?? employee.salaryInfo.deductions?.pf ?? 0,
        esi: deductions?.esi ?? employee.salaryInfo.deductions?.esi ?? 0,
        tax: deductions?.tax ?? employee.salaryInfo.deductions?.tax ?? 0,
        professionalTax: deductions?.professionalTax ?? 0,
        loanDeduction: deductions?.loanDeduction ?? 0,
        otherDeductions: deductions?.otherDeductions ?? employee.salaryInfo.deductions?.other ?? 0
      },
      attendance: {
        workingDays,
        presentDays,
        leaveDays,
        absentDays: Math.max(0, absentDays)
      },
      bankInfo: {
        accountNumber: employee.bankInfo?.accountNumber || '',
        bankName: employee.bankInfo?.bankName || '',
        ifscCode: employee.bankInfo?.ifscCode || ''
      },
      generatedBy: req.user.id,
      remarks: remarks || ''
    };

    const payslip = new Payslip(payslipData);
    await payslip.save();

    try {
      const pdfFileName = await generatePayslipPDF(payslip, employee);
      payslip.pdfPath = pdfFileName;
      await payslip.save();
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
    }

    await payslip.populate('employee', 'personalInfo.firstName personalInfo.lastName employeeId');
    await payslip.populate('generatedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Payslip generated successfully',
      data: payslip
    });

  } catch (error) {
    console.error('Generate payslip error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getPayslips = async (req, res) => {
  try {
    const { month, year, employeeId, status, page = 1, limit = 20 } = req.query;

    const query = {};
    
    if (month) query['period.month'] = parseInt(month);
    if (year) query['period.year'] = parseInt(year);
    if (employeeId) query.employee = employeeId;
    if (status) query.status = status;

    if (req.user.role !== 'admin') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found'
        });
      }
      query.employee = employee._id;
    }

    const payslips = await Payslip.find(query)
      .populate('employee', 'personalInfo.firstName personalInfo.lastName employeeId workInfo.position')
      .populate('generatedBy', 'name email')
      .sort({ 'period.year': -1, 'period.month': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payslip.countDocuments(query);

    res.json({
      success: true,
      data: {
        payslips,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalPayslips: total
        }
      }
    });

  } catch (error) {
    console.error('Get payslips error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getPayslipById = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id)
      .populate('employee', 'personalInfo contactInfo workInfo salaryInfo bankInfo employeeId')
      .populate('generatedBy', 'name email');

    if (!payslip) {
      return res.status(404).json({
        success: false,
        message: 'Payslip not found'
      });
    }

    if (req.user.role !== 'admin') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee || payslip.employee._id.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: payslip
    });

  } catch (error) {
    console.error('Get payslip by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getEmployeePayslips = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (req.user.role !== 'admin') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee || employee._id.toString() !== employeeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const payslips = await Payslip.find({ employee: employeeId })
      .populate('generatedBy', 'name')
      .sort({ 'period.year': -1, 'period.month': -1 });

    res.json({
      success: true,
      data: payslips
    });

  } catch (error) {
    console.error('Get employee payslips error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const downloadPayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id)
      .populate('employee');

    if (!payslip) {
      return res.status(404).json({
        success: false,
        message: 'Payslip not found'
      });
    }

    if (req.user.role !== 'admin') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee || payslip.employee._id.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    if (!payslip.pdfPath) {
      const pdfFileName = await generatePayslipPDF(payslip, payslip.employee);
      payslip.pdfPath = pdfFileName;
      await payslip.save();
    }

    const filePath = path.join(process.cwd(), 'temp', 'payslips', payslip.pdfPath);
    
    if (!fs.existsSync(filePath)) {
      const pdfFileName = await generatePayslipPDF(payslip, payslip.employee);
      payslip.pdfPath = pdfFileName;
      await payslip.save();
    }

    const finalPath = path.join(process.cwd(), 'temp', 'payslips', payslip.pdfPath);
    res.download(finalPath, `Payslip_${payslip.employeeId}_${payslip.period.month}_${payslip.period.year}.pdf`);

  } catch (error) {
    console.error('Download payslip error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updatePayslipStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { status, paymentDate, paymentMethod } = req.body;

    const payslip = await Payslip.findById(req.params.id);

    if (!payslip) {
      return res.status(404).json({
        success: false,
        message: 'Payslip not found'
      });
    }

    if (status) payslip.status = status;
    if (paymentDate) payslip.paymentDate = paymentDate;
    if (paymentMethod) payslip.paymentMethod = paymentMethod;

    await payslip.save();

    res.json({
      success: true,
      message: 'Payslip status updated',
      data: payslip
    });

  } catch (error) {
    console.error('Update payslip status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deletePayslip = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const payslip = await Payslip.findById(req.params.id);

    if (!payslip) {
      return res.status(404).json({
        success: false,
        message: 'Payslip not found'
      });
    }

    if (payslip.pdfPath) {
      const filePath = path.join(process.cwd(), 'temp', 'payslips', payslip.pdfPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Payslip.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Payslip deleted successfully'
    });

  } catch (error) {
    console.error('Delete payslip error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const generateBulkPayslips = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { employeeId, startMonth, startYear, endMonth, endYear, basicSalary, regenerate } = req.body;

    if (!employeeId || !startMonth || !startYear || !endMonth || !endYear || !basicSalary) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, start month/year, end month/year, and salary amount are required'
      });
    }

    const employee = await Employee.findById(employeeId)
      .populate('user', 'name email')
      .populate('workInfo.department', 'name');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Build the list of months to generate
    let currentMonth = parseInt(startMonth);
    let currentYear = parseInt(startYear);
    const targetEndMonth = parseInt(endMonth);
    const targetEndYear = parseInt(endYear);

    const monthsToGenerate = [];
    while (
      currentYear < targetEndYear ||
      (currentYear === targetEndYear && currentMonth <= targetEndMonth)
    ) {
      monthsToGenerate.push({ month: currentMonth, year: currentYear });
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    if (monthsToGenerate.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month range'
      });
    }

    const results = {
      success: [],
      failed: [],
      skipped: [],
      regenerated: []
    };

    for (const period of monthsToGenerate) {
      const { month, year } = period;
      try {
        const existing = await Payslip.findOne({
          employee: employee._id,
          'period.month': month,
          'period.year': year
        });

        if (existing) {
          if (regenerate === true) {
            console.log(`Regenerating payslip for employee ${employee.employeeId} for ${month}/${year}`);
            
            if (existing.pdfPath) {
              const oldPdfPath = path.join(process.cwd(), 'temp', 'payslips', existing.pdfPath);
              if (fs.existsSync(oldPdfPath)) {
                try {
                  fs.unlinkSync(oldPdfPath);
                } catch (err) {
                  console.error('Error deleting old PDF:', err);
                }
              }
            }

            await Payslip.findByIdAndDelete(existing._id);
          } else {
            results.skipped.push({
              employeeId: employee.employeeId,
              name: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
              period: `${month}/${year}`,
              reason: 'Payslip already exists'
            });
            continue;
          }
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const attendanceRecords = await Attendance.find({
          $or: [
            { employee: employee._id },
            { user: employee.user._id }
          ],
          date: { $gte: startDate, $lte: endDate }
        });

        const workingDays = endDate.getDate();
        const presentDays = attendanceRecords.filter(a =>
          ['present', 'Present', 'late', 'Late'].includes(a.status)
        ).length;
        const leaveDays = attendanceRecords.filter(a =>
          ['leave', 'Leave', 'approved_leave'].includes(a.status)
        ).length;

        const salaryFactor = basicSalary / (employee.salaryInfo?.basicSalary || basicSalary || 1);

        const payslipData = {
          employee: employee._id,
          employeeId: employee.employeeId,
          employeeName: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
          period: { month, year },
          earnings: {
            basicSalary: basicSalary,
            hra: Math.round((employee.salaryInfo.allowances?.hra || 0) * salaryFactor),
            medical: Math.round((employee.salaryInfo.allowances?.medical || 0) * salaryFactor),
            transport: Math.round((employee.salaryInfo.allowances?.transport || 0) * salaryFactor),
            otherAllowances: Math.round((employee.salaryInfo.allowances?.other || 0) * salaryFactor)
          },
          deductions: {
            pf: Math.round((employee.salaryInfo.deductions?.pf || 0) * salaryFactor),
            esi: Math.round((employee.salaryInfo.deductions?.esi || 0) * salaryFactor),
            tax: Math.round((employee.salaryInfo.deductions?.tax || 0) * salaryFactor),
            otherDeductions: Math.round((employee.salaryInfo.deductions?.other || 0) * salaryFactor)
          },
          attendance: {
            workingDays,
            presentDays,
            leaveDays,
            absentDays: Math.max(0, workingDays - presentDays - leaveDays)
          },
          bankInfo: {
            accountNumber: employee.bankInfo?.accountNumber || '',
            bankName: employee.bankInfo?.bankName || '',
            ifscCode: employee.bankInfo?.ifscCode || ''
          },
          generatedBy: req.user.id
        };

        const payslip = new Payslip(payslipData);
        await payslip.save();

        try {
          const pdfFileName = await generatePayslipPDF(payslip, employee);
          payslip.pdfPath = pdfFileName;
          await payslip.save();
        } catch (pdfError) {
          console.error('PDF generation error for', employee.employeeId, pdfError);
        }

        const payslipInfo = {
          employeeId: employee.employeeId,
          name: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
          period: `${month}/${year}`,
          netSalary: payslip.netSalary
        };

        if (existing && regenerate) {
          results.regenerated.push(payslipInfo);
        } else {
          results.success.push(payslipInfo);
        }

      } catch (error) {
        results.failed.push({
          employeeId: employee.employeeId,
          name: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
          period: `${month}/${year}`,
          reason: error.message
        });
      }
    }

    const totalGenerated = results.success.length + results.regenerated.length;
    let message = `Generated ${results.success.length} new payslips`;
    if (results.regenerated.length > 0) {
      message += `, regenerated ${results.regenerated.length} payslips`;
    }
    if (results.skipped.length > 0) {
      message += `, skipped ${results.skipped.length} existing periods`;
    }
    if (results.failed.length > 0) {
      message += `, ${results.failed.length} failed`;
    }

    res.json({
      success: true,
      message,
      data: results
    });

  } catch (error) {
    console.error('Bulk payslip generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
