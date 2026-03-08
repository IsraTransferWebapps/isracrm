'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface GdprNoticeProps {
  open: boolean;
  onAccept: () => void;
}

export function GdprNotice({ open, onAccept }: GdprNoticeProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Privacy Notice</DialogTitle>
          <DialogDescription>
            Please read this notice before continuing
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-60 overflow-y-auto text-xs text-[#717D93] space-y-3 pr-2">
          <p>
            IsraTransfer Ltd (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects and processes your personal
            data as part of our client onboarding process. This is required to
            comply with our obligations under anti-money laundering (AML) and
            know-your-customer (KYC) regulations.
          </p>
          <p>
            <strong className="text-[#253859]">What we collect:</strong> Personal
            identification details, contact information, financial information
            (source of funds, tax residency), identity documents, and beneficial
            ownership information for corporate clients.
          </p>
          <p>
            <strong className="text-[#253859]">Why we collect it:</strong> To verify
            your identity, assess risk, comply with regulatory requirements
            (Israel Securities Authority, Bank of Israel, FATCA, CRS), and
            provide you with our services.
          </p>
          <p>
            <strong className="text-[#253859]">How we store it:</strong> Your data
            is encrypted at rest and in transit. Documents are stored securely
            and accessed only by authorised personnel.
          </p>
          <p>
            <strong className="text-[#253859]">Your rights:</strong> You have the
            right to access, rectify, and request deletion of your personal
            data, subject to our regulatory retention obligations. Contact
            compliance@isratransfer.com for data requests.
          </p>
          <p>
            <strong className="text-[#253859]">Retention:</strong> We retain your
            data for a minimum of 5 years after the end of our business
            relationship, as required by law.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={onAccept} className="w-full">
            I understand and wish to continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
