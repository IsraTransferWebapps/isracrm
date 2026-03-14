'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, User, Building2, Loader2 } from 'lucide-react';
import { getClientDisplayName } from '@/types/database';
import type { Client } from '@/types/database';

interface AssignClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  onAssigned: () => void;
}

export function AssignClientDialog({
  open,
  onOpenChange,
  conversationId,
  onAssigned,
}: AssignClientDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const supabase = createClient();

  const searchClients = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setSearching(true);
      const { data } = await supabase
        .from('clients')
        .select('id, client_type, individual_details, corporate_details, assigned_account_manager_id')
        .or(
          `individual_details->>first_name.ilike.%${searchQuery}%,individual_details->>last_name.ilike.%${searchQuery}%,corporate_details->>company_name.ilike.%${searchQuery}%,individual_details->>email_primary.ilike.%${searchQuery}%`
        )
        .limit(10);

      setResults((data as Client[]) ?? []);
      setSearching(false);
    },
    [supabase]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchClients(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchClients]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  const handleAssign = async (client: Client) => {
    setAssigning(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: client.id,
          assigned_to: client.assigned_account_manager_id ?? null,
        }),
      });

      if (response.ok) {
        onAssigned();
        onOpenChange(false);
      }
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Assign to client</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <Input
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {searching && (
            <div className="flex items-center justify-center py-6 text-[#94A3B8]">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Searching...
            </div>
          )}

          {!searching && query.length >= 2 && results.length === 0 && (
            <div className="text-center py-6 text-[#94A3B8] text-sm">
              No clients found
            </div>
          )}

          {!searching &&
            results.map((client) => (
              <Button
                key={client.id}
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3 px-3"
                onClick={() => handleAssign(client)}
                disabled={assigning}
              >
                <div className="flex-shrink-0">
                  {client.client_type === 'corporate' ? (
                    <Building2 className="h-4 w-4 text-[#717D93]" />
                  ) : (
                    <User className="h-4 w-4 text-[#717D93]" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-[#1A1F36]">
                    {getClientDisplayName(client)}
                  </div>
                  <div className="text-xs text-[#94A3B8]">
                    {client.client_type === 'corporate' ? 'Corporate' : 'Individual'}
                    {client.individual_details?.email_primary &&
                      ` · ${client.individual_details.email_primary}`}
                  </div>
                </div>
              </Button>
            ))}

          {!searching && query.length < 2 && (
            <div className="text-center py-6 text-[#94A3B8] text-sm">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
