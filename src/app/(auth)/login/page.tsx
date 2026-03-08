'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Redirect handled by middleware
    window.location.href = '/clients';
  };

  return (
    <div className="min-h-screen flex items-center justify-center login-bg relative overflow-hidden">
      {/* Subtle ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#01A0FF]/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#094BCC]/[0.03] blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[400px] px-4 relative z-10">
        {/* Logo — IsraTransfer wordmark */}
        <div className="text-center mb-10">
          <Image
            src="/logo-isratransfer.svg"
            alt="IsraTransfer"
            width={200}
            height={34}
            className="h-8 w-auto mx-auto mb-3"
            priority
          />
          <p className="text-[13px] text-[#717D93]">Management System</p>
        </div>

        <Card className="border-[#E2E8F0] bg-white/90 backdrop-blur-xl shadow-xl shadow-black/[0.04]">
          <CardHeader className="pb-2 pt-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                <Lock className="h-4 w-4 text-[#01A0FF]" />
              </div>
            </div>
            <h2 className="text-[15px] font-medium text-[#253859] text-center">
              Sign in to your account
            </h2>
            <p className="text-[12px] text-[#94A3B8] text-center mt-0.5">
              Enter your credentials to continue
            </p>
          </CardHeader>
          <CardContent className="pt-4 pb-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-[#fef2f2] border-[#fecaca] text-[#dc2626]">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-[13px]">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[12px] font-medium text-[#717D93] uppercase tracking-wider">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@isratransfer.com"
                  required
                  className="bg-[#F4F5F7] border-[#E2E8F0] text-[#253859] placeholder:text-[#94A3B8] focus:border-[#01A0FF]/50 focus:ring-[#01A0FF]/20 h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[12px] font-medium text-[#717D93] uppercase tracking-wider">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-[#F4F5F7] border-[#E2E8F0] text-[#253859] placeholder:text-[#94A3B8] focus:border-[#01A0FF]/50 focus:ring-[#01A0FF]/20 h-10"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-[#01A0FF] hover:bg-[#0090e6] text-white font-medium text-[13px] transition-all duration-200 shadow-md shadow-[#01A0FF]/15 hover:shadow-lg hover:shadow-[#01A0FF]/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-8 space-y-1">
          <p className="text-[11px] text-[#94A3B8]">
            IsraTransfer Ltd · Licence No. 57488
          </p>
          <p className="text-[10px] text-[#CBD5E1]">
            Regulated by the Israel Securities Authority
          </p>
        </div>
      </div>
    </div>
  );
}
