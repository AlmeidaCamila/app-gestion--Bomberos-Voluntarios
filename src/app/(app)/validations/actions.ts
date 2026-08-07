"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function approveSubmissionAction(submissionId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.rpc("validate_submission", {
    p_submission_id: submissionId,
    p_decision: "aprobada",
    p_rejection_reason: null,
  });
  if (error) return { error: error.message };
  revalidatePath("/validations");
  revalidatePath("/tasks");
  revalidatePath("/scores");
  return { error: null };
}

export async function rejectSubmissionAction(submissionId: string, reason: string) {
  if (!reason.trim()) return { error: "El motivo de rechazo es obligatorio." };
  const supabase = createServerSupabase();
  const { error } = await supabase.rpc("validate_submission", {
    p_submission_id: submissionId,
    p_decision: "rechazada",
    p_rejection_reason: reason,
  });
  if (error) return { error: error.message };
  revalidatePath("/validations");
  revalidatePath("/tasks");
  revalidatePath("/scores");
  return { error: null };
}
