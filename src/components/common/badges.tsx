import { CheckCircle2, Circle, CircleDot, CircleDotDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DIFFICULTIES,
  DIFFICULTY_META,
  LEARNING_STATUS_LABELS,
  QUESTION_TYPE_LABELS,
  humanize,
  labelFor,
  type Difficulty,
  type LearningStatus,
} from "@/lib/curriculum";
import { cn } from "@/lib/utils";

/** Four small bars: filled up to the difficulty. Restrained and colour-independent. */
export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  const level = DIFFICULTIES.indexOf(difficulty) + 1;
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", className)}>
      <span aria-hidden className="flex items-end gap-px">
        {DIFFICULTIES.map((_, index) => (
          <span
            key={index}
            className={cn("w-[3px] rounded-[1px]", index < level ? "bg-foreground" : "bg-border")}
            style={{ height: 4 + index * 2 }}
          />
        ))}
      </span>
      {DIFFICULTY_META[difficulty].label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const critical = priority === "critical";
  return (
    <Badge
      variant="outline"
      className={cn("font-normal", critical && "border-destructive/30 text-destructive", className)}
    >
      {humanize(priority)} priority
    </Badge>
  );
}

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <Badge variant="secondary" className={cn("font-normal", className)}>
      {labelFor(QUESTION_TYPE_LABELS, type)}
    </Badge>
  );
}

const STATUS_ICONS = {
  "not-started": { icon: Circle, className: "text-muted-foreground/70" },
  learning: { icon: CircleDotDashed, className: "text-brand" },
  practicing: { icon: CircleDot, className: "text-brand" },
  mastered: { icon: CheckCircle2, className: "text-success" },
} as const;

export function StatusIcon({ status, className }: { status: LearningStatus; className?: string }) {
  const { icon: Icon, className: tone } = STATUS_ICONS[status];
  return <Icon aria-hidden className={cn("size-4 shrink-0", tone, className)} />;
}

export function StatusLabel({ status, className }: { status: LearningStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <StatusIcon status={status} />
      {LEARNING_STATUS_LABELS[status]}
    </span>
  );
}
