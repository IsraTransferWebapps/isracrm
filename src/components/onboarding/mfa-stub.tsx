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
import { Shield } from 'lucide-react';

interface MfaStubProps {
  open: boolean;
  onContinue: () => void;
}

export function MfaStub({ open, onContinue }: MfaStubProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-full bg-[#01A0FF]/10">
              <Shield className="w-6 h-6 text-[#01A0FF]" />
            </div>
          </div>
          <DialogTitle>Secure Your Account</DialogTitle>
          <DialogDescription>
            Two-factor authentication (2FA) will be available soon to add an
            extra layer of security to your account. For now, please ensure
            you are using a strong, unique password.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onContinue} className="w-full">
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
