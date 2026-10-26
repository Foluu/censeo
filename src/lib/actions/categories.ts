"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  ActionError,
  failure,
  requireSession,
  type ActionResult,
} from "@/lib/actions/guard";

const groupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  description: z.string().trim().max(200).optional(),
  multiSelect: z.boolean().default(false),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(true),
  // Category ids (each also covers its sub-categories). Empty = all products.
  appliesTo: z.array(z.string().min(1).max(40)).max(100).default([]),
});

export type CategoryGroupInput = z.input<typeof groupSchema>;

const optionSchema = z.object({
  name: z.string().trim().min(1, "Option name is required").max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid colour")
    .optional()
    .or(z.literal("")),
});

function revalidateCategories() {
  revalidatePath("/products", "layout");
}

function duplicate(error: unknown, message: string) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return failure(new ActionError(message));
  }
  return failure(error);
}

export async function createCategoryGroup(
  input: CategoryGroupInput & { options?: string[] }
): Promise<ActionResult & { groupId?: string }> {
  try {
    await requireSession(true);
    const data = groupSchema.parse(input);
    const optionNames = [
      ...new Set((input.options ?? []).map((o) => o.trim()).filter(Boolean)),
    ];
    const last = await db.categoryGroup.aggregate({ _max: { sortOrder: true } });
    const group = await db.categoryGroup.create({
      data: {
        ...data,
        description: data.description || null,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        options: {
          create: optionNames.map((name, i) => ({ name, sortOrder: i })),
        },
      },
    });
    revalidateCategories();
    return { ok: true, groupId: group.id };
  } catch (error) {
    return duplicate(error, "A category with this name already exists.");
  }
}

export async function updateCategoryGroup(
  id: string,
  input: Partial<CategoryGroupInput>
): Promise<ActionResult> {
  try {
    await requireSession(true);
    const data = groupSchema.partial().parse(input);
    await db.categoryGroup.update({
      where: { id },
      data: {
        ...data,
        ...(data.description !== undefined && {
          description: data.description || null,
        }),
      },
    });
    revalidateCategories();
    return { ok: true };
  } catch (error) {
    return duplicate(error, "A category with this name already exists.");
  }
}

export async function deleteCategoryGroup(id: string): Promise<ActionResult> {
  try {
    await requireSession(true);
    // Options and product assignments cascade.
    await db.categoryGroup.delete({ where: { id } });
    revalidateCategories();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Swap a group with its neighbour to move it up or down the list. */
export async function moveCategoryGroup(
  id: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  try {
    await requireSession(true);
    const groups = await db.categoryGroup.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    const index = groups.findIndex((g) => g.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= groups.length) {
      return { ok: true };
    }
    [groups[index], groups[target]] = [groups[target], groups[index]];
    await db.$transaction(
      groups.map((g, i) =>
        db.categoryGroup.update({ where: { id: g.id }, data: { sortOrder: i } })
      )
    );
    revalidateCategories();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function createCategoryOption(
  groupId: string,
  input: z.input<typeof optionSchema>
): Promise<ActionResult & { option?: { id: string; name: string; color: string | null } }> {
  try {
    await requireSession(true);
    const data = optionSchema.parse(input);
    const last = await db.categoryOption.aggregate({
      where: { groupId },
      _max: { sortOrder: true },
    });
    const option = await db.categoryOption.create({
      data: {
        groupId,
        name: data.name,
        color: data.color || null,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
      select: { id: true, name: true, color: true },
    });
    revalidateCategories();
    return { ok: true, option };
  } catch (error) {
    return duplicate(error, "That option already exists in this category.");
  }
}

export async function updateCategoryOption(
  id: string,
  input: z.input<typeof optionSchema>
): Promise<ActionResult> {
  try {
    await requireSession(true);
    const data = optionSchema.parse(input);
    await db.categoryOption.update({
      where: { id },
      data: { name: data.name, color: data.color || null },
    });
    revalidateCategories();
    return { ok: true };
  } catch (error) {
    return duplicate(error, "That option already exists in this category.");
  }
}

export async function deleteCategoryOption(id: string): Promise<ActionResult> {
  try {
    await requireSession(true);
    await db.categoryOption.delete({ where: { id } });
    revalidateCategories();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
