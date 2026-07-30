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
  DEFAULT_RELAY_SNI_DOMAIN,
  RELAY_SNI_PRESET_OPTIONS,
} from "@/lib/constants/sni";
import { useI18n } from "@/lib/i18n/provider";

interface RelaySniDomainFieldProps {
  preset: string;
  customValue: string;
  onPresetChange: (value: string) => void;
  onCustomValueChange: (value: string) => void;
  disabled?: boolean;
}

export function RelaySniDomainField({
  preset,
  customValue,
  onPresetChange,
  onCustomValueChange,
  disabled = false,
}: RelaySniDomainFieldProps) {
  const { t } = useI18n();
  const r = t.relay;
  const sn = t.sni;

  const optionLabel = (
    option: (typeof RELAY_SNI_PRESET_OPTIONS)[number]
  ): string => {
    if (option.id === "custom") return sn.custom;
    if (option.id === "vk") {
      return `${option.value} (${sn.recommended})`;
    }
    return option.value;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="relay-sni">{r.relaySni}</Label>
      <Select
        value={preset}
        onValueChange={onPresetChange}
        disabled={disabled}
      >
        <SelectTrigger id="relay-sni">
          <SelectValue placeholder={DEFAULT_RELAY_SNI_DOMAIN} />
        </SelectTrigger>
        <SelectContent>
          {RELAY_SNI_PRESET_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {optionLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <Input
          value={customValue}
          onChange={(e) => onCustomValueChange(e.target.value)}
          placeholder="example.ru"
          disabled={disabled}
          required
        />
      )}
      <p className="text-xs text-muted-foreground">{r.relaySniHint}</p>
    </div>
  );
}
