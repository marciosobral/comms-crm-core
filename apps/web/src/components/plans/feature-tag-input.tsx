import { Button, Input } from "@/components/ui";
import { Plus, X } from "lucide-react";
import { commitTag } from "./commit-tag";

export function FeatureTagInput({
  id,
  value,
  draft,
  onChange,
  onDraftChange,
}: {
  id: string;
  value: string[];
  draft: string;
  onChange: (tags: string[]) => void;
  onDraftChange: (draft: string) => void;
}) {
  const addDraft = () => {
    const next = commitTag(value, draft);
    if (next !== value) onChange(next);
    onDraftChange("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          placeholder="Wi-Fi 6 incluso"
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            addDraft();
          }}
        />
        <Button
          variant="secondary"
          icon={Plus}
          aria-label="Adicionar"
          className="w-10 shrink-0 px-0"
          onClick={addDraft}
        />
      </div>
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <li
              key={tag}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-default bg-elevated py-1 pl-3 pr-1 text-small text-primary"
            >
              <span className="min-w-0 break-words">{tag}</span>
              <button
                type="button"
                aria-label={`Remover ${tag}`}
                className="rounded-full p-1 text-muted hover:text-primary"
                onClick={() => onChange(value.filter((item) => item !== tag))}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
