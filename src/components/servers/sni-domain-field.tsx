"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_SNI_DOMAIN,
  SNI_PRESET_OPTIONS,
  type SniPresetValue,
} from "@/lib/constants/sni";

interface SniDomainFieldProps {
  preset: SniPresetValue | string;
  customValue: string;
  onPresetChange: (value: SniPresetValue | string) => void;
  onCustomValueChange: (value: string) => void;
  disabled?: boolean;
}

export function SniDomainField({
  preset,
  customValue,
  onPresetChange,
  onCustomValueChange,
  disabled = false,
}: SniDomainFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="sni-domain">SNI Domain (Mask)</Label>
      <Select
        value={preset}
        onValueChange={onPresetChange}
        disabled={disabled}
      >
        <SelectTrigger id="sni-domain">
          <SelectValue placeholder={DEFAULT_SNI_DOMAIN} />
        </SelectTrigger>
        <SelectContent>
          {SNI_PRESET_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <Input
          value={customValue}
          onChange={(e) => onCustomValueChange(e.target.value)}
          placeholder="example.com"
          disabled={disabled}
          required
        />
      )}
      <p className="text-xs text-muted-foreground">
        Reality uses this domain as camouflage. Installer verifies the dest is
        reachable from your VPS (falls back if needed).
        networks.
      </p>
    </div>
  );
}
