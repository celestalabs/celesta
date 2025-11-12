import { type IntegrationName } from "@celesta/common";
import React from "react";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";

interface Props {
  integrationName: IntegrationName;
  name: string;
  description: string;
  logoUrl: string | null;
  selected: boolean;
  onToggle: (integrationName: IntegrationName) => void;
}

export const IntegrationCard = React.memo(
  ({
    integrationName,
    name,
    description,
    logoUrl,
    selected,
    onToggle,
  }: Props) => {
    return (
      <Card
        className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${
          selected ? "border-primary bg-primary/5" : ""
        }`}
        onClick={() => onToggle(integrationName)}
      >
        <div className="flex items-start gap-4">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggle(integrationName)}
          />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img src={logoUrl} alt={name} className="w-8 h-8 rounded" />
              )}
              <h3 className="font-semibold text-lg">{name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </Card>
    );
  }
);
