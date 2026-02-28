import { CircleX, Edit, Save, Trash2 } from "lucide-react";
import { Form, useDelete, useNotify, useUpdate } from "ra-core";
import { useEffect, useRef, useState } from "react";
import type { FieldValues, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TextInput } from "@/components/admin/text-input";

import { Markdown } from "../misc/Markdown";
import { RelativeDate } from "../misc/RelativeDate";
import type { ClientNote } from "../types";

export const ClientNoteItem = ({ note }: { note: ClientNote }) => {
  const [isHover, setHover] = useState(false);
  const [isEditing, setEditing] = useState(false);
  const [isExpanded, setExpanded] = useState(false);
  const [isTruncated, setTruncated] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const notify = useNotify();

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      setTruncated(el.scrollHeight > el.clientHeight);
    }
  }, [note.text]);

  const [update, { isPending }] = useUpdate();
  const [deleteNote] = useDelete("client_notes", undefined, {
    mutationMode: "undoable",
    onSuccess: () => {
      notify("Nota eliminata", { type: "info", undoable: true });
    },
  });

  const handleDelete = () => {
    deleteNote("client_notes", { id: note.id, previousData: note });
  };

  const handleNoteUpdate: SubmitHandler<FieldValues> = (values) => {
    update(
      "client_notes",
      { id: note.id, data: values, previousData: note },
      {
        onSuccess: () => {
          setEditing(false);
          setHover(false);
        },
      },
    );
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="mb-4"
    >
      <div className="flex items-center w-full">
        <span className="text-sm text-muted-foreground">
          <RelativeDate date={note.date} />
        </span>
        <span className={`ml-2 ${isHover ? "visible" : "invisible"}`}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(!isEditing)}
                  className="p-1 h-auto cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Modifica nota</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="p-1 h-auto cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Elimina nota</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      </div>
      {isEditing ? (
        <Form onSubmit={handleNoteUpdate} record={note} className="mt-1">
          <TextInput
            source="text"
            label={false}
            multiline
            helperText={false}
            rows={4}
          />
          <div className="flex justify-end mt-2 space-x-4">
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setHover(false);
              }}
              type="button"
              className="cursor-pointer"
            >
              <CircleX className="w-4 h-4" />
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Aggiorna
            </Button>
          </div>
        </Form>
      ) : (
        <div className="pt-1 text-sm">
          {note.text && (
            <div
              ref={contentRef}
              className={cn(
                "overflow-hidden transition-[max-height] duration-300 ease-in-out",
                isExpanded ? "max-h-[5000px]" : "max-h-46",
              )}
            >
              <Markdown className="[&_p]:leading-5 [&_p]:my-4 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a:hover]:no-underline [&_ul]:list-disc [&_ul]:list-inside [&_ol]:list-decimal [&_ol]:list-inside">
                {note.text}
              </Markdown>
            </div>
          )}
          {isTruncated && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!isExpanded);
              }}
              className="text-primary text-sm mt-1 underline hover:no-underline cursor-pointer"
            >
              {isExpanded ? "Mostra meno" : "Leggi tutto"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
