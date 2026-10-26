"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FolderInput,
  FolderTree,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createCategory,
  deleteCategory,
  moveCategory,
  reorderCategory,
  updateCategory,
} from "@/lib/actions/category-tree";
import { MAX_CATEGORY_DEPTH, subtreeIds, type CategoryNode } from "@/lib/category-tree";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategorySelect } from "./category-select";

type DialogState =
  | { kind: "edit"; node: CategoryNode }
  | { kind: "move"; node: CategoryNode }
  | { kind: "delete"; node: CategoryNode }
  | null;

function InlineAdd({
  parent,
  onDone,
}: {
  parent: CategoryNode | null;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    // Accept several at once: "Apple, Samsung, Tecno"
    const names = [...new Set(name.split(",").map((n) => n.trim()).filter(Boolean))];
    if (names.length === 0) return onDone();
    startTransition(async () => {
      for (const n of names) {
        const result = await createCategory({ name: n, parentId: parent?.id ?? null });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
      }
      toast.success(
        names.length === 1
          ? `“${names[0]}” added${parent ? ` under ${parent.name}` : ""}`
          : `${names.length} categories added${parent ? ` under ${parent.name}` : ""}`
      );
      setName("");
      if (parent) onDone();
    });
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        autoFocus={!!parent}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onDone()}
        placeholder={
          parent ? `Sub-categories of ${parent.name}, e.g. Apple, Samsung` : "New category, e.g. Phones, Accessories"
        }
        disabled={pending}
        className="h-10 md:h-9"
      />
      <Button type="submit" disabled={pending || !name.trim()} className="h-10 shrink-0 md:h-9">
        <Plus className="size-4" /> {pending ? "Adding…" : "Add"}
      </Button>
    </form>
  );
}

function EditDialog({ node, onClose }: { node: CategoryNode; onClose: () => void }) {
  const [name, setName] = useState(node.name);
  const [description, setDescription] = useState(node.description);
  const [pending, startTransition] = useTransition();
  function save() {
    startTransition(async () => {
      const result = await updateCategory(node.id, { name, description });
      if (result.ok) {
        toast.success("Category updated");
        onClose();
      } else toast.error(result.error);
    });
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit category</DialogTitle>
          <DialogDescription>{node.path}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Name</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10 md:h-9" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-desc">Description</Label>
            <Input
              id="c-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="h-10 md:h-9"
            />
          </div>
          <Button onClick={save} disabled={pending} className="h-11 w-full font-semibold sm:h-9">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({
  node,
  tree,
  onClose,
}: {
  node: CategoryNode;
  tree: CategoryNode[];
  onClose: () => void;
}) {
  const [parentId, setParentId] = useState<string | null>(node.parentId);
  const [pending, startTransition] = useTransition();
  // Can't move into itself/its children, or anywhere that would nest too deep.
  const subtree = subtreeIds(tree, node.id);
  const height = Math.max(...tree.filter((n) => subtree.includes(n.id)).map((n) => n.depth - node.depth));
  const targets = tree.filter((n) => !subtree.includes(n.id) && n.depth + 1 + height < MAX_CATEGORY_DEPTH);

  function move() {
    startTransition(async () => {
      const result = await moveCategory(node.id, parentId);
      if (result.ok) {
        toast.success(`${node.name} moved`);
        onClose();
      } else toast.error(result.error);
    });
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move “{node.name}”</DialogTitle>
          <DialogDescription>
            Its sub-categories and products move with it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>New parent</Label>
            <CategorySelect
              categories={targets}
              value={parentId}
              onChange={setParentId}
              noneLabel="Top level (no parent)"
            />
          </div>
          <Button
            onClick={move}
            disabled={pending || parentId === node.parentId}
            className="h-11 w-full font-semibold sm:h-9"
          >
            {pending ? "Moving…" : "Move here"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  node,
  tree,
  onClose,
}: {
  node: CategoryNode;
  tree: CategoryNode[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const parent = tree.find((n) => n.id === node.parentId);
  const destination = parent ? `“${parent.name}”` : node.ownProducts ? "Uncategorized" : "the top level";
  function confirm() {
    startTransition(async () => {
      const result = await deleteCategory(node.id);
      if (result.ok) {
        toast.success(`${node.name} deleted`);
        onClose();
      } else toast.error(result.error);
    });
  }
  const moves = [
    node.childCount > 0 &&
      `${node.childCount} sub-categor${node.childCount === 1 ? "y" : "ies"} move to ${parent ? `“${parent.name}”` : "the top level"}`,
    node.ownProducts > 0 &&
      `${node.ownProducts} product${node.ownProducts === 1 ? "" : "s"} move to ${destination}`,
  ].filter(Boolean);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete “{node.name}”?</DialogTitle>
          <DialogDescription>
            {moves.length
              ? `Nothing is lost: ${moves.join(", and ")}.`
              : "It's empty, so nothing else changes."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="h-11 sm:h-9" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" className="h-11 font-semibold sm:h-9" disabled={pending} onClick={confirm}>
            {pending ? "Deleting…" : "Delete category"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CategoryTreeManager({ tree }: { tree: CategoryNode[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [addingUnder, setAddingUnder] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (q) {
      // Matches plus the branches they sit in.
      const matches = tree.filter((n) => n.name.toLowerCase().includes(q));
      const keep = new Set(matches.flatMap((n) => [n.id, ...n.ancestorIds]));
      return tree.filter((n) => keep.has(n.id));
    }
    return tree.filter((n) => !n.ancestorIds.some((a) => collapsed.has(a)));
  }, [tree, q, collapsed]);

  const parents = tree.filter((n) => n.childCount > 0);
  const allCollapsed = parents.length > 0 && parents.every((n) => collapsed.has(n.id));
  const siblingsOf = (node: CategoryNode) => tree.filter((n) => n.parentId === node.parentId);

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reorder(node: CategoryNode, direction: "up" | "down") {
    startTransition(async () => {
      const result = await reorderCategory(node.id, direction);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Card className="glass">
      <CardContent className="space-y-4 pt-6 max-sm:pt-0">
        <InlineAdd parent={null} onDone={() => {}} />

        {tree.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a category…"
                className="h-10 pl-9 md:h-9"
              />
            </div>
            {parents.length > 0 && !q && (
              <Button
                variant="outline"
                className="h-10 shrink-0 md:h-9"
                onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(parents.map((n) => n.id)))}
              >
                {allCollapsed ? <ChevronsUpDown className="size-4" /> : <ChevronsDownUp className="size-4" />}
                <span className="max-sm:sr-only">{allCollapsed ? "Expand all" : "Collapse all"}</span>
              </Button>
            )}
          </div>
        )}

        {tree.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/80 px-6 py-10 text-center">
            <FolderTree className="size-8 text-muted-foreground" />
            <p className="font-medium">No categories yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add your main categories above (e.g. Phones, Accessories), then use + on any of
              them to add sub-categories (e.g. Phones › Apple, Samsung).
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No categories match “{query}”.</p>
        ) : (
          <ul className="space-y-0.5">
            {visible.map((node) => {
              const siblings = siblingsOf(node);
              const index = siblings.findIndex((s) => s.id === node.id);
              const canNest = node.depth + 1 < MAX_CATEGORY_DEPTH;
              const isOpen = !collapsed.has(node.id) || !!q;
              return (
                <li key={node.id}>
                  <div
                    className="group flex min-h-11 items-center gap-1 rounded-xl pr-1 transition-colors hover:bg-accent/50"
                    style={{ paddingLeft: `${node.depth * 1.25}rem` }}
                  >
                    {node.childCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => toggle(node.id)}
                        aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className={cn("size-4 transition-transform", isOpen && "rotate-90")} />
                      </button>
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center">
                        <span className="size-1.5 rounded-full bg-border" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1 py-1.5">
                      <p className={cn("truncate text-sm", node.depth === 0 ? "font-semibold" : "font-medium")}>
                        {node.name}
                      </p>
                      {node.description && (
                        <p className="truncate text-xs text-muted-foreground">{node.description}</p>
                      )}
                    </div>
                    <Link
                      href={`/products?cat=${node.id}`}
                      title={`${node.totalProducts} products (including sub-categories)`}
                      className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground hover:bg-primary/15 hover:text-foreground"
                    >
                      {node.totalProducts}
                    </Link>
                    {canNest && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        aria-label={`Add a sub-category to ${node.name}`}
                        title="Add sub-category"
                        onClick={() => {
                          setAddingUnder(node.id);
                          setCollapsed((prev) => {
                            const next = new Set(prev);
                            next.delete(node.id);
                            return next;
                          });
                        }}
                      >
                        <Plus className="size-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Manage ${node.name}`}>
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canNest && (
                          <DropdownMenuItem onSelect={() => setAddingUnder(node.id)}>
                            <Plus className="size-4" /> Add sub-category
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => setDialog({ kind: "edit", node })}>
                          <Pencil className="size-4" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDialog({ kind: "move", node })}>
                          <FolderInput className="size-4" /> Move to…
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={index <= 0} onSelect={() => reorder(node, "up")}>
                          <ArrowUp className="size-4" /> Move up
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={index >= siblings.length - 1} onSelect={() => reorder(node, "down")}>
                          <ArrowDown className="size-4" /> Move down
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setDialog({ kind: "delete", node })}>
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {addingUnder === node.id && (
                    <div className="py-2 pr-1" style={{ paddingLeft: `${(node.depth + 1) * 1.25 + 2}rem` }}>
                      <InlineAdd parent={node} onDone={() => setAddingUnder(null)} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {tree.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Tip: type several names separated by commas to add them at once. Categories nest up
            to {MAX_CATEGORY_DEPTH} levels, e.g. Phones › Apple › iPhone › Pro Max.
          </p>
        )}
      </CardContent>

      {dialog?.kind === "edit" && <EditDialog node={dialog.node} onClose={() => setDialog(null)} />}
      {dialog?.kind === "move" && <MoveDialog node={dialog.node} tree={tree} onClose={() => setDialog(null)} />}
      {dialog?.kind === "delete" && <DeleteDialog node={dialog.node} tree={tree} onClose={() => setDialog(null)} />}
    </Card>
  );
}
