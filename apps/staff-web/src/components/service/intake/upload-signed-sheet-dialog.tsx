'use client';

/**
 * UploadSignedSheetDialog — SA uploads the scanned signed sheet.
 *
 * L7 / §6: Triggered after PDF download. Customer signs paper, SA scans, uploads here.
 * SC-17: REJECTS if intake.state !== CUSTOMER_SIGNED (state guard in store).
 * Uses Dialog primitive (SPEC-ARCH-UI-001 §3.5).
 * File picker: accepts PDF, max 10 MB.
 */

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import { Dialog } from '@/src/components/primitives/dialog';
import { Gate } from '@/src/components/primitives/gate';
import { useToast } from '@/src/hooks/use-toast';
import { ToastContainer } from '@/src/components/primitives/toast';
import { useServiceStore } from '@/src/lib/service/service-store';
import { useStaffAuth } from '@/src/hooks/use-staff-auth';

interface Props {
  open: boolean;
  onClose: () => void;
  intakeId: string;
  jobNo: string;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export function UploadSignedSheetDialog({ open, onClose, intakeId, jobNo }: Props) {
  const t = useTranslations('serviceIntake');
  const { user } = useStaffAuth();
  const { toasts, toast, dismiss } = useToast();
  const attachSignedSheet = useServiceStore((s) => s.attachSignedSheet);
  const intake = useServiceStore((s) => s.intakeInspections.find((i) => i.id === intakeId));

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFileError('');
    setSelectedFile(null);

    if (!file) return;

    if (!file.type.includes('pdf')) {
      setFileError('Only PDF files are accepted');
      return;
    }

    if (file.size > MAX_BYTES) {
      setFileError('File exceeds 10 MB limit');
      return;
    }

    setSelectedFile(file);
  }

  function handleUpload() {
    if (!selectedFile || !intake) return;

    // SC-17: state guard — only valid from CUSTOMER_SIGNED
    if (intake.state !== 'CUSTOMER_SIGNED') {
      toast('Cannot upload signed sheet — intake must be in CUSTOMER_SIGNED state', 'error');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const dataUrl = ev.target?.result as string;
        attachSignedSheet(
          intakeId,
          {
            jobCardId: intake.jobCardId,
            dataUrl,
            name: selectedFile.name,
            mimeType: 'application/pdf',
            size: selectedFile.size,
          },
          { id: user?.id ?? 'unknown', name: user?.name ?? 'SA', role: user?.role ?? 'R09' },
        );
        toast(t('toasts.uploaded'), 'success');
        setSelectedFile(null);
        onClose();
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Upload failed', 'error');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      toast('Failed to read file', 'error');
      setIsUploading(false);
    };
    reader.readAsDataURL(selectedFile);
  }

  const canUpload = !!selectedFile && !fileError && !isUploading;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <Dialog
        open={open}
        onClose={onClose}
        title="Upload Signed Inspection Sheet"
        subtitle={`Job Card: ${jobNo}`}
        size="sm"
        dirty={!!selectedFile}
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="h-9 px-4 rounded-md text-sm font-medium border border-line bg-bg-canvas text-ink-secondary hover:text-ink-primary hover:border-ink-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
            <Gate role={['R09', 'R03', 'R19', 'R24']} fallback="disable">
              <button
                type="button"
                onClick={handleUpload}
                disabled={!canUpload}
                className="h-9 px-4 rounded-md text-sm font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {isUploading ? 'Uploading…' : 'Upload'}
              </button>
            </Gate>
          </>
        }
      >
        <div className="space-y-4">
          {/* State guard warning */}
          {intake && intake.state !== 'CUSTOMER_SIGNED' && (
            <div className="flex items-start gap-3 p-4 rounded-md bg-[rgb(var(--state-overdue)/0.08)] border border-[rgb(var(--state-overdue)/0.3)]" role="alert">
              <AlertTriangle size={18} className="text-[rgb(var(--state-overdue))] flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-ink-primary">Cannot upload</p>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Intake must be in CUSTOMER_SIGNED state. Current: {intake.state}.
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-ink-secondary">
            After the customer has signed the printed intake sheet, scan and upload the signed copy as PDF (max 10 MB).
          </p>

          {/* File picker */}
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-20 rounded-md border-2 border-dashed border-line bg-bg-subtle hover:border-accent/50 hover:bg-accent/5 transition-colors flex flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Choose PDF file to upload"
            >
              <Upload className="h-5 w-5 text-ink-muted" aria-hidden="true" />
              <span className="text-xs text-ink-muted">Click to select PDF</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Signed sheet PDF file picker"
            />
          </div>

          {/* Selected file display */}
          {selectedFile && (
            <div className="flex items-center gap-3 p-3 rounded-md border border-line bg-bg-subtle">
              <FileText className="h-4 w-4 text-ink-muted shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-primary truncate">{selectedFile.name}</p>
                <p className="text-xs text-ink-muted">
                  {(selectedFile.size / 1024).toFixed(0)} KB · PDF
                </p>
              </div>
            </div>
          )}

          {/* File error */}
          {fileError && (
            <p className="text-xs text-state-danger" role="alert">{fileError}</p>
          )}
        </div>
      </Dialog>
    </>
  );
}
