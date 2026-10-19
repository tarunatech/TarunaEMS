import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SignaturePad from 'signature_pad';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  RotateCcw,
  ShieldCheck,
  Building,
  User,
  Mail,
  Phone,
  Calendar,
  Lock,
  Printer,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { agreementAPI } from '../../utils/api';

const TarunaLogo = ({ className = "w-10 h-10" }) => (
  <img src="/taruna_logo.png" alt="Taruna Technology" className={`object-contain ${className}`} />
);

export default function SignAgreement() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [agreementData, setAgreementData] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null); // 'expired' | 'already_signed' | 'invalid' | 'revoked'
  const [errorMessage, setErrorMessage] = useState('');
  
  const [timeLeft, setTimeLeft] = useState(null); // in seconds
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(false);
  const [signedAgreementId, setSignedAgreementId] = useState(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);

  // Load agreement details by token
  useEffect(() => {
    let isMounted = true;
    const fetchAgreement = async () => {
      try {
        setLoading(true);
        const res = await agreementAPI.getSigningAgreement(token);
        if (isMounted && res.data?.success) {
          const data = res.data.data;
          setAgreementData(data);
          if (data.status === 'signed') {
            setErrorStatus('already_signed');
            setSignedAgreementId(data.agreement?.id);
            setErrorMessage('This agreement has already been digitally signed and sealed.');
          } else if (data.isExpired) {
            setErrorStatus('expired');
            setErrorMessage('This temporary signing link has expired (15-minute limit). Please contact HR at Taruna Technology to issue a new signing link.');
          } else {
            // Calculate seconds remaining
            const expires = new Date(data.expiresAt).getTime();
            const now = Date.now();
            const diff = Math.max(0, Math.floor((expires - now) / 1000));
            setTimeLeft(diff);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        const errResp = err.response?.data;
        const code = errResp?.code;
        setErrorStatus(code || 'invalid');
        setErrorMessage(
          errResp?.message || 'Unable to open signing link. It may be invalid, revoked, or expired.'
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAgreement();
    return () => { isMounted = false; };
  }, [token]);

  // Expiry countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || errorStatus) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorStatus('expired');
          setErrorMessage('This temporary signing link has expired. Please contact HR at Taruna Technology for a replacement link.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, errorStatus]);

  // Initialize Signature Pad
  useEffect(() => {
    if (loading || errorStatus || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Resize canvas with pixel ratio
    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      if (signaturePadRef.current) {
        signaturePadRef.current.clear();
        setHasDrawn(false);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const pad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: '#0f172a',
      minWidth: 1.5,
      maxWidth: 3.5,
      velocityFilterWeight: 0.7
    });

    pad.addEventListener('endStroke', () => {
      if (!pad.isEmpty()) {
        setHasDrawn(true);
      }
    });

    signaturePadRef.current = pad;

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      pad.off();
    };
  }, [loading, errorStatus]);

  const handleClearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setHasDrawn(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast.error('Please draw your signature in the designated signature pad before submitting.');
      return;
    }
    if (!acknowledged) {
      toast.error('Please confirm the declaration and agreement acknowledgement.');
      return;
    }

    try {
      setIsSubmitting(true);
      const signatureDataUrl = signaturePadRef.current.toDataURL('image/png');

      const res = await agreementAPI.submitSignedAgreement(token, {
        signatureData: signatureDataUrl,
        signatureImage: signatureDataUrl,
        acknowledged: true,
        acknowledgedAt: new Date().toISOString()
      });

      if (res.data?.success) {
        setSignedSuccess(true);
        setSignedAgreementId(res.data.data?.agreement?.id || res.data.data?.agreementId);
        toast.success('Agreement successfully signed and submitted!');
      } else {
        toast.error(res.data?.message || 'Failed to submit signed agreement');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Error submitting agreement';
      toast.error(msg);
      if (err.response?.data?.code === 'EXPIRED') {
        setErrorStatus('expired');
        setErrorMessage(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadSignedPdf = async () => {
    if (!signedAgreementId) return;
    try {
      toast.loading('Preparing signed document download...', { id: 'download-pdf' });
      const res = await agreementAPI.downloadSignedPdf(signedAgreementId);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Taruna_Internship_Agreement_Signed_${(agreementData?.employee?.fullName || agreementData?.employeeName || 'Employee').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Signed agreement downloaded', { id: 'download-pdf' });
    } catch {
      toast.error('Failed to download PDF', { id: 'download-pdf' });
    }
  };

  // Format time remaining MM:SS
  const formatTimer = (seconds) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Render Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <TarunaLogo className="w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Validating Signing Request</h2>
          <p className="text-sm text-slate-500 mt-1">Retrieving official agreement documents from Taruna Technology...</p>
          <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
            <Lock className="w-3.5 h-3.5" /> End-to-end encrypted session
          </div>
        </div>
      </div>
    );
  }

  // Render Error / Expired / Already Signed Screen
  if (errorStatus && !signedSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100 text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 bg-amber-50 text-amber-600">
            {errorStatus === 'already_signed' ? (
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            ) : (
              <AlertCircle className="w-10 h-10 text-amber-600" />
            )}
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            {errorStatus === 'already_signed'
              ? 'Agreement Already Signed'
              : errorStatus === 'expired'
              ? 'Signing Link Expired'
              : 'Invalid Signing Link'}
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            {errorMessage}
          </p>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Building className="w-4 h-4 text-blue-600" /> Taruna Technology Support
            </div>
            <p className="text-slate-500">
              For any questions or to request a fresh signing invitation link, please reach out to our HR department:
            </p>
            <div className="pt-1 text-slate-700 font-mono text-[11px]">
              <div>Email: <a href="mailto:tarunatechnology@gmail.com" className="text-blue-600 font-bold hover:underline">tarunatechnology@gmail.com</a></div>
              <div>Phone: +91 9106610595</div>
              <div>Office: 709,710 Broadway Empire, Vasna Bhayli Main Rd, Vadodara, Gujarat</div>
            </div>
          </div>

          {errorStatus === 'already_signed' && signedAgreementId && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleDownloadSignedPdf}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg transition-all"
              >
                <Download className="w-4 h-4" /> Download Executed Agreement PDF
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Post-Submission Success Screen
  if (signedSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-emerald-100 text-center relative overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 bg-emerald-100 text-emerald-600 shadow-inner">
            <CheckCircle className="w-12 h-12" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Digitally Signed & Sealed
          </span>
          <h2 className="text-2xl font-black text-slate-900">Internship Agreement Complete</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Thank you, <strong className="text-slate-900">{agreementData?.employee?.fullName || agreementData?.employeeName || 'Intern'}</strong>. Your digital signature, declaration acknowledgement, and timestamp have been successfully recorded in the Taruna Technology EMS.
          </p>

          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Agreement Title:</span>
              <span className="font-bold text-slate-800">{agreementData?.template?.title || agreementData?.title || 'Internship Agreement'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Intern Name:</span>
              <span className="font-bold text-slate-800">{agreementData?.employee?.fullName || agreementData?.employeeName || 'Intern'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Signing Status:</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Signed & Submitted</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Company Signatory:</span>
              <span className="font-bold text-slate-800">Tisha Bhadja (Operational Manager)</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleDownloadSignedPdf}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all"
            >
              <Download className="w-4 h-4" /> Download Official Signed PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-all"
            >
              <Printer className="w-4 h-4" /> Print Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  const employee = agreementData?.employee || {
    fullName: agreementData?.employeeName,
    email: agreementData?.employeeEmail,
    phone: agreementData?.employeePhone,
  };
  const agreement = agreementData?.agreement || {
    jobRole: agreementData?.jobRole,
    commencementDate: agreementData?.commencementDate,
    duration: agreementData?.duration,
  };
  const template = agreementData?.template || {
    title: agreementData?.title,
    version: agreementData?.version,
  };
  const sections = agreementData?.sections || [];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 py-6 px-3 sm:px-6 lg:px-8">
      {/* Top Floating Security & Expiry Banner */}
      <div className="max-w-4xl mx-auto mb-4 sticky top-3 z-30">
        <div className="bg-slate-900/95 backdrop-blur text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-wide">Taruna Technology Secure Signing Portal</p>
              <p className="text-[11px] text-slate-400">Official Internship Agreement • Single-Use Encrypted Link</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
              (timeLeft || 0) < 180
                ? 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>Link Expires In: {formatTimer(timeLeft)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Document Container (Simulates authoritative multi-page contract) */}
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Document Header with Branding */}
        <div className="border-b border-slate-200 p-6 sm:p-8 bg-gradient-to-b from-slate-50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm shrink-0">
                <TarunaLogo className="w-12 h-12" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">TARUNA TECHNOLOGY</h1>
                <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase mt-0.5">INSPIRING THE INTELLIGENCE</p>
                <p className="text-xs text-slate-600 mt-1">A Software Development & IT Services Company</p>
              </div>
            </div>

            <div className="sm:text-right text-xs text-slate-500 space-y-0.5">
              <p className="font-semibold text-slate-800">Registered Office:</p>
              <p>709, 710 Broadway Empire, circle, Vasna Bhayli Main Rd</p>
              <p>Vadodara, Gujarat 391410</p>
              <p className="font-mono text-slate-700">Email: tarunatechnology@gmail.com</p>
              <p className="font-mono text-slate-700">Contact: +91 9106610595</p>
            </div>
          </div>

          <div className="mt-8 text-center border-t border-slate-200 pt-6">
            <span className="inline-block px-4 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-wider mb-2">
              Official Contract
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-wide">
              INTERNSHIP AGREEMENT
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Document Version: {template?.version || '1.0'} • Binding Legal Instrument
            </p>
          </div>
        </div>

        {/* Dynamic Intern Details Card */}
        <div className="p-6 sm:p-8 bg-slate-50/70 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Intern Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Intern Name</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{employee?.fullName || 'N/A'}</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Registered Email</p>
              <p className="text-base font-bold text-slate-900 mt-0.5 truncate">{employee?.email || 'N/A'}</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Contact Number</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{employee?.phone || '+91 -'}</p>
            </div>
          </div>
        </div>

        {/* Full Agreement Contract Sections (Rendered Verbatim from Source PDF) */}
        <div className="p-6 sm:p-10 space-y-8 text-slate-800 leading-relaxed text-sm">
          {sections && sections.map((sec, secIdx) => {
            const secNum = sec.section_number || sec.number || (secIdx + 1);
            return (
              <div key={sec.id || sec.number || sec.section_number || secIdx} className="relative group border-l-2 border-slate-200 hover:border-blue-500 pl-4 transition-colors">
                <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase flex items-baseline gap-2">
                  <span>{secNum}.</span>
                  <span>{sec.title}</span>
                </h4>

                {sec.content && (
                  <p className="mt-2 text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                    {sec.content}
                  </p>
                )}

                {sec.items && sec.items.length > 0 && (
                  <ul className="mt-2.5 space-y-1.5 list-disc list-inside text-slate-700 marker:text-slate-400">
                    {sec.items.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {sec.footer && (
                  <p className="mt-2 text-slate-700 leading-relaxed font-normal">
                    {sec.footer}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Legal Signatures Section */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 sm:p-8">
          <h3 className="text-base font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" /> Authorized Signatures & Execution
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Authorized Company Signatory */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    For Taruna Technology
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3" /> Standard Authorized
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <p><strong className="text-slate-900">Authorized Signatory:</strong> Tisha Bhadja</p>
                  <p><strong className="text-slate-900">Designation:</strong> Operational Manager</p>
                  <p><strong className="text-slate-900">Entity:</strong> Taruna Technology Vadodara</p>
                </div>
              </div>

              {/* Company Stamp / Seal Representation */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <p className="text-[10px] font-mono text-slate-400 uppercase">Corporate Seal</p>
                <p className="text-xs font-serif italic text-slate-600">Taruna Technology Operations</p>
              </div>
            </div>

            {/* Right: Intern Digital Signature Block */}
            <div className="bg-white rounded-2xl p-5 border-2 border-blue-500/40 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase text-blue-600 tracking-wider">
                    For the Intern (You)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                    Digital Signature Required
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-700">
                  <p><strong className="text-slate-900">Name:</strong> {employee?.fullName}</p>
                  <p><strong className="text-slate-900">Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[11px] text-slate-500">
                  Draw your signature below using a touch screen, stylus, or mouse.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Signature Pad Form */}
          <form onSubmit={handleSubmit} className="mt-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Draw Your Signature</span>
                  <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleClearSignature}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Clear Signature
                </button>
              </div>

              {/* Canvas Container */}
              <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl bg-slate-50/50 overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  className="w-full h-44 sm:h-52 cursor-crosshair block"
                  style={{ touchAction: 'none' }}
                />
                {!hasDrawn && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400 select-none">
                    <p className="text-xs font-medium">Draw your official signature inside this box</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">Supports touch screens, stylus, and mouse</p>
                  </div>
                )}
                {/* Baseline for signing */}
                <div className="pointer-events-none absolute bottom-8 left-8 right-8 border-b border-slate-200/80" />
              </div>
            </div>

            {/* Mandatory Acknowledgement Checkbox */}
            <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                  I confirm that I have read and understood the terms and conditions stated in this Internship Agreement and agree to the applicable terms.
                </span>
              </label>
            </div>

            {/* Submit Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-500">
                <p>Signing as: <strong className="text-slate-800">{employee?.fullName}</strong> ({employee?.email})</p>
                <p className="text-[11px] text-slate-400">Timestamp and cryptographic hash are permanently recorded on submission.</p>
              </div>

              <button
                type="submit"
                disabled={!hasDrawn || !acknowledged || isSubmitting}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all ${
                  !hasDrawn || !acknowledged || isSubmitting
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sealing & Submitting...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign & Submit Agreement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Page 7 Contact / Inquiries Footer */}
        <div className="bg-slate-900 text-slate-300 p-8 border-t border-slate-800 text-center">
          <h5 className="text-base font-bold text-white uppercase tracking-wider mb-2">FOR INQUIRIES, CONTACT US</h5>
          <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-slate-400 mt-4">
            <span>🌐 www.tarunatech.com</span>
            <span>📞 +91 910 6610 595</span>
            <span>✉️ tarunatechnology@gmail.com</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            709,710 Broadway Empire, circle, Vasna Bhayli Main Rd, Vadodara, Gujarat 391410
          </p>
        </div>
      </div>
    </div>
  );
}
