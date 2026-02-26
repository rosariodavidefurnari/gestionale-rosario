import { Pencil, Plus, Trash2 } from "lucide-react";
import { useGetList, useDelete, useNotify } from "ra-core";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Tag } from "../types";
import { TagCreateModal } from "../tags/TagCreateModal";
import { TagEditModal } from "../tags/TagEditModal";

export const TagsSettingsSection = () => {
  const { data: tags, isPending } = useGetList<Tag>("tags", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "name", order: "ASC" },
  });
  const [deleteOne] = useDelete();
  const notify = useNotify();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTag, setEditTag] = useState<Tag | null>(null);

  const handleDelete = (tag: Tag) => {
    deleteOne(
      "tags",
      { id: tag.id, previousData: tag },
      {
        onSuccess: () => notify("Etichetta eliminata"),
        onError: () => notify("Errore nell'eliminazione", { type: "error" }),
      },
    );
  };

  if (isPending) {
    return <div className="h-20 bg-muted rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-3">
      {tags && tags.length > 0 ? (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
            >
              <Badge
                variant="secondary"
                className="text-sm font-normal text-black"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </Badge>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditTag(tag)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(tag)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nessuna etichetta creata.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setCreateOpen(true)}
      >
        <Plus className="h-4 w-4 mr-1" />
        Nuova etichetta
      </Button>

      <TagCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={async () => setCreateOpen(false)}
      />

      {editTag && (
        <TagEditModal
          tag={editTag}
          open={!!editTag}
          onClose={() => setEditTag(null)}
          onSuccess={async () => setEditTag(null)}
        />
      )}
    </div>
  );
};
