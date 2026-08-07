"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ReviewItemInput } from "./types";

export async function submitInventoryReviewAction(
  taskId: string,
  unitId: string,
  observations: string,
  items: ReviewItemInput[]
) {
  const supabase = createServerSupabase();
  const { error } = await supabase.rpc("submit_inventory_review", {
    p_task_id: taskId,
    p_unit_id: unitId,
    p_observations: observations,
    p_items: items,
  });
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/alerts");
  return { error: null };
}
