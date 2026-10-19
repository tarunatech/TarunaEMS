import { and, asc, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  agreementTemplates,
  employeeAgreements,
  agreementSigningLinks,
} from '../db/schema/agreement.js';
import { employees } from '../db/schema/employee.js';
import { users } from '../db/schema/user.js';

export const DEFAULT_INTERNSHIP_AGREEMENT_SECTIONS = [
  {
    number: "1",
    title: "PURPOSE OF INTERNSHIP",
    content: "This Agreement outlines the terms and conditions under which the Intern shall participate in the {{jobRole}} Internship Program conducted by the Company. The objective is to provide structured training, hands-on project experience, and exposure to industry standards in full-stack development."
  },
  {
    number: "2",
    title: "DURATION",
    content: "The internship shall commence on {{commencementDate}} and shall continue for a period of {{duration}}, unless terminated earlier in accordance with this Agreement.\nThe Company reserves the right to:\n• Extend the internship based on performance\n• Terminate the internship at its sole discretion"
  },
  {
    number: "5",
    title: "PERFORMANCE & EVALUATION",
    content: "• The Intern's performance shall be continuously monitored.\n• Regular assessments, tasks, and project submissions are mandatory.\n• Certification will be granted only upon satisfactory performance."
  },
  {
    number: "6",
    title: "STIPEND & EMPLOYMENT STATUS",
    content: "• This is an unpaid internship.\n• The Intern shall not be considered an employee of the Company.\n• No salary, stipend, or benefits shall be provided.\nHowever, exceptional performers may be considered for a full-time role, subject to Company requirements."
  },
  {
    number: "7",
    title: "CONFIDENTIALITY",
    content: "The Intern agrees that:\n• All data, code, designs, and business information are confidential.\n• No information shall be disclosed to any third party.\n• Confidentiality obligations continue even after completion or termination."
  },
  {
    number: "8",
    title: "INTELLECTUAL PROPERTY RIGHTS",
    content: "• All work created during the internship shall be the sole property of the Company.\n• The Intern shall not claim ownership or reuse any code or project without written permission."
  },
  {
    number: "9",
    title: "CODE OF CONDUCT",
    content: "The Intern must:\n• Maintain professional behavior\n• Follow all company rules and policies\n• Respect team members and management\n• Avoid plagiarism, cheating, or misuse of resources\nAny misconduct may result in immediate termination without notice."
  },
  {
    number: "10",
    title: "TERMINATION POLICY",
    content: "The Company reserves the right to terminate the internship:\n• Due to poor performance\n• Misconduct or violation of policies\n• Breach of confidentiality\nThe Intern may terminate this Agreement only under the following conditions:\n• A mandatory prior notice of 30 (thirty) days must be given\n• The Intern must send an official resignation request via email to the Company's official email ID\n• The notice period shall be considered valid only after written acknowledgment by the Company\nFailure to comply with the notice period or communication process may result in:\n• No issuance of certificate\n• Blacklisting from future opportunities with the Company"
  },
  {
    number: "11",
    title: "NON-COMPETE & NON-SOLICITATION",
    content: "During the internship and for a period of 6 months after completion, the Intern shall not:\n• Work with direct competitors\n• Solicit Company clients or employees"
  },
  {
    number: "12",
    title: "CERTIFICATION",
    content: "The Intern shall receive an Internship Certificate upon:\n• Successful completion of duration\n• Submission of assigned projects\n• Meeting performance standards"
  },
  {
    number: "13",
    title: "LEGAL JURISDICTION",
    content: "This Agreement shall be governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts located in Vadodara, Gujarat."
  },
  {
    number: "14",
    title: "DECLARATION",
    content: "Both parties confirm that they have read, understood, and agreed to all terms and conditions stated in this Agreement."
  }
];

// ==========================================
// AgreementTemplate Model
// ==========================================
export class AgreementTemplateModel {
  static async ensureDefaultTemplate() {
    const existing = await db
      .select()
      .from(agreementTemplates)
      .where(eq(agreementTemplates.templateKey, 'internship_agreement'))
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0];
    }

    const [created] = await db
      .insert(agreementTemplates)
      .values({
        templateKey: 'internship_agreement',
        title: 'Taruna Technology Internship Agreement',
        version: '1.0',
        documentType: 'internship_agreement',
        companyName: 'Taruna Technology',
        companyAddress: '709,710 Broadway Empire, circle, Vasna Bhayli Main Rd, Vadodara, Gujarat 391410',
        companyEmail: 'tarunatechnology@gmail.com',
        companyPhone: '+91 9106610595',
        signatoryName: 'Tisha Bhadja',
        signatoryRole: 'Operational Manager',
        sections: DEFAULT_INTERNSHIP_AGREEMENT_SECTIONS,
        isActive: true,
        metadata: {
          website: 'www.tarunatech.com',
          jurisdiction: 'Vadodara, Gujarat',
        },
      })
      .returning();

    return created;
  }

  static async findByKey(templateKey = 'internship_agreement') {
    const [row] = await db
      .select()
      .from(agreementTemplates)
      .where(eq(agreementTemplates.templateKey, templateKey))
      .limit(1);
    return row || null;
  }

  static async findById(id) {
    const [row] = await db
      .select()
      .from(agreementTemplates)
      .where(eq(agreementTemplates.id, id))
      .limit(1);
    return row || null;
  }
}

// ==========================================
// EmployeeAgreement Model
// ==========================================
export class EmployeeAgreementModel {
  static async findByEmployeeId(employeeId) {
    return await db
      .select()
      .from(employeeAgreements)
      .where(eq(employeeAgreements.employeeId, employeeId))
      .orderBy(desc(employeeAgreements.createdAt));
  }

  static async findLatestByEmployeeId(employeeId) {
    const rows = await db
      .select()
      .from(employeeAgreements)
      .where(eq(employeeAgreements.employeeId, employeeId))
      .orderBy(desc(employeeAgreements.createdAt))
      .limit(1);
    return rows[0] || null;
  }

  static async findById(id) {
    const rows = await db
      .select()
      .from(employeeAgreements)
      .where(eq(employeeAgreements.id, id))
      .limit(1);
    return rows[0] || null;
  }

  static async create(data) {
    const [row] = await db.insert(employeeAgreements).values(data).returning();
    return row;
  }

  static async updateById(id, data) {
    const [row] = await db
      .update(employeeAgreements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(employeeAgreements.id, id))
      .returning();
    return row;
  }
}

// ==========================================
// AgreementSigningLink Model
// ==========================================
export class AgreementSigningLinkModel {
  static async create(data) {
    const [row] = await db.insert(agreementSigningLinks).values(data).returning();
    return row;
  }

  static async findByTokenHash(tokenHash) {
    const rows = await db
      .select()
      .from(agreementSigningLinks)
      .where(eq(agreementSigningLinks.tokenHash, tokenHash))
      .limit(1);
    return rows[0] || null;
  }

  static async findActiveByAgreementId(agreementId) {
    const now = new Date();
    const rows = await db
      .select()
      .from(agreementSigningLinks)
      .where(
        and(
          eq(agreementSigningLinks.agreementId, agreementId),
          isNull(agreementSigningLinks.usedAt),
          isNull(agreementSigningLinks.revokedAt),
          gt(agreementSigningLinks.expiresAt, now),
        ),
      )
      .orderBy(desc(agreementSigningLinks.createdAt))
      .limit(1);
    return rows[0] || null;
  }

  static async revokeActiveLinksForAgreement(agreementId) {
    return await db
      .update(agreementSigningLinks)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(agreementSigningLinks.agreementId, agreementId),
          isNull(agreementSigningLinks.usedAt),
          isNull(agreementSigningLinks.revokedAt),
        ),
      );
  }

  static async markUsed(id) {
    const [row] = await db
      .update(agreementSigningLinks)
      .set({ usedAt: new Date() })
      .where(eq(agreementSigningLinks.id, id))
      .returning();
    return row;
  }
}

export default {
  AgreementTemplate: AgreementTemplateModel,
  EmployeeAgreement: EmployeeAgreementModel,
  AgreementSigningLink: AgreementSigningLinkModel,
  DEFAULT_INTERNSHIP_AGREEMENT_SECTIONS,
};
