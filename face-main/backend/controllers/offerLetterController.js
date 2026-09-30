import fs from 'fs';
import path from 'path';
import OfferLetter from '../models/OfferLetter.js';
import Employee from '../models/Employee.js';
import InterviewSchedule from '../models/InterviewSchedule.js';
import { generateOfferLetterPDF } from '../services/offerLetterPdfService.js';
import { offerLettersDir } from '../config/uploadPaths.js';

export const generateOfferLetter = async (req, res) => {
  try {
    const {
      employeeName,
      role,
      joiningDate,
      companyName = 'Taruna Technology',
      location = 'Vadodara',
      duration = 'three (3) months',
      workingHours = '10:00 AM to 7:00 PM, Monday to Saturday',
      signatoryName = 'MIHIR MAKWANA',
      signatoryRole = 'Operational Manager',
      employeeId,
      candidateId,
    } = req.body;

    if (!employeeName?.trim()) {
      return res.status(400).json({ success: false, message: 'Employee name is required' });
    }
    if (!role?.trim()) {
      return res.status(400).json({ success: false, message: 'Role / Position is required' });
    }
    if (!joiningDate?.trim()) {
      return res.status(400).json({ success: false, message: 'Joining date is required' });
    }

    const safeName = employeeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = `Offer_Letter_${safeName}_${Date.now()}.pdf`;

    const pdfResult = await generateOfferLetterPDF(
      {
        employeeName: employeeName.trim(),
        role: role.trim(),
        joiningDate: joiningDate.trim(),
        companyName: companyName.trim(),
        location: location.trim(),
        duration: duration.trim(),
        workingHours: workingHours.trim(),
        signatoryName: signatoryName.trim(),
        signatoryRole: signatoryRole.trim(),
      },
      {
        saveToFile: true,
        fileName,
      }
    );

    const record = await OfferLetter.create({
      employeeName: employeeName.trim(),
      role: role.trim(),
      joiningDate: joiningDate.trim(),
      companyName: companyName.trim(),
      location: location.trim(),
      duration: duration.trim(),
      workingHours: workingHours.trim(),
      signatoryName: signatoryName.trim(),
      signatoryRole: signatoryRole.trim(),
      employeeId: employeeId || null,
      candidateId: candidateId || null,
      pdfPath: pdfResult.publicUrl,
      status: 'Generated',
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Offer letter generated successfully',
      data: record,
      downloadUrl: pdfResult.publicUrl,
      pdfBase64: pdfResult.pdfBuffer.toString('base64'),
    });
  } catch (error) {
    console.error('Error generating offer letter:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate offer letter',
    });
  }
};

export const getAllOfferLetters = async (req, res) => {
  try {
    const filter = req.user?.role === 'admin' ? {} : { createdBy: req.user.id };
    const list = await OfferLetter.find(filter).populate('createdBy').sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error('Error fetching offer letters:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch offer letters',
    });
  }
};

export const getOfferLetterById = async (req, res) => {
  try {
    const letter = await OfferLetter.findById(req.params.id);
    if (!letter) {
      return res.status(404).json({ success: false, message: 'Offer letter not found' });
    }

    if (req.user.role !== 'admin' && String(letter.createdBy?._id || letter.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.json({
      success: true,
      data: letter,
    });
  } catch (error) {
    console.error('Error fetching offer letter:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch offer letter',
    });
  }
};

export const downloadOfferLetter = async (req, res) => {
  try {
    const letter = await OfferLetter.findById(req.params.id);
    if (!letter) {
      return res.status(404).json({ success: false, message: 'Offer letter not found' });
    }

    const fileName = letter.pdfPath ? path.basename(letter.pdfPath) : `offer_letter_${letter.id}.pdf`;
    const filePath = path.join(offerLettersDir, fileName);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Offer_Letter_${letter.employeeName.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
      return fs.createReadStream(filePath).pipe(res);
    }

    // If file missing on disk, regenerate on the fly
    const pdfResult = await generateOfferLetterPDF(
      {
        employeeName: letter.employeeName,
        role: letter.role,
        joiningDate: letter.joiningDate,
        companyName: letter.companyName,
        location: letter.location,
        duration: letter.duration,
        workingHours: letter.workingHours,
        signatoryName: letter.signatoryName,
        signatoryRole: letter.signatoryRole,
      },
      { saveToFile: true, fileName }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Offer_Letter_${letter.employeeName.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
    return res.send(pdfResult.pdfBuffer);
  } catch (error) {
    console.error('Error downloading offer letter:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to download offer letter',
    });
  }
};

export const deleteOfferLetter = async (req, res) => {
  try {
    const letter = await OfferLetter.findById(req.params.id);
    if (!letter) {
      return res.status(404).json({ success: false, message: 'Offer letter not found' });
    }

    if (req.user.role !== 'admin' && String(letter.createdBy?._id || letter.createdBy) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (letter.pdfPath) {
      const fileName = path.basename(letter.pdfPath);
      const filePath = path.join(offerLettersDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Could not delete PDF file from disk:', e.message);
        }
      }
    }

    await OfferLetter.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: 'Offer letter deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting offer letter:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete offer letter',
    });
  }
};

export const getCandidatesAndEmployees = async (req, res) => {
  try {
    // 1. Fetch employees
    const employeesList = await Employee.find().populate('workInfo.department').sort({ createdAt: -1 });
    const formattedEmployees = (employeesList || []).map((emp) => {
      const firstName = emp.personalInfo?.firstName || '';
      const lastName = emp.personalInfo?.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Unnamed';
      const role = emp.workInfo?.position || emp.workInfo?.designation || '';
      const joining = emp.workInfo?.joiningDate ? new Date(emp.workInfo.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

      return {
        id: emp.id || emp._id,
        type: 'employee',
        name: fullName,
        role: role,
        joiningDate: joining,
        employeeId: emp.employeeId || '',
        department: emp.workInfo?.department?.name || '',
      };
    });

    // 2. Fetch Interview Candidates (especially Selected / Scheduled)
    const interviewCandidates = await InterviewSchedule.find().sort({ createdAt: -1 });
    const formattedCandidates = (interviewCandidates || []).map((cand) => {
      let joining = '';
      if (cand.interviewDate) {
        const d = new Date(cand.interviewDate);
        if (!isNaN(d.getTime())) {
          joining = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        }
      }

      return {
        id: cand.id || cand._id,
        type: 'candidate',
        name: cand.candidateName,
        role: cand.position || '',
        joiningDate: joining,
        status: cand.status,
        email: cand.email,
        phone: cand.phone,
      };
    });

    return res.json({
      success: true,
      data: {
        employees: formattedEmployees,
        candidates: formattedCandidates,
      },
    });
  } catch (error) {
    console.error('Error fetching candidates/employees for offer letters:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load employees and candidates',
    });
  }
};
