"use client";

import { Button } from "@/components/ui/button";
import { countInTopic, PROBLEM_TOPICS, type TopicId } from "@/lib/problems/topics";
import type { ProblemSummary } from "@/types/problem";

export function TopicFilter({ problems, selected, onSelect }: { problems: ProblemSummary[]; selected: TopicId; onSelect: (topic: TopicId) => void }) {
  const topics = [{ id: "all" as const, label: "All topics" }, ...PROBLEM_TOPICS];
  return (
    <div role="group" aria-label="Topic" className="flex flex-wrap gap-1.5">
      {topics.map((topic) => {
        const count = countInTopic(problems, topic.id);
        return (
          <Button key={topic.id} type="button" variant="outline" size="sm" aria-pressed={selected === topic.id}
            disabled={count === 0 && selected !== topic.id} onClick={() => onSelect(topic.id)}>
            {topic.label}<span className="font-code text-xs text-[var(--color-text-muted)]">{count}</span>
          </Button>
        );
      })}
    </div>
  );
}
