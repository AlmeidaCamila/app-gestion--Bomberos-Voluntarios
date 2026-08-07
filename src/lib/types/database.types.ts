// Tipos escritos a mano en espejo del esquema SQL (supabase/migrations).
// En un proyecto real, una vez conectado Supabase, regenerá esto con:
//   npx supabase gen types typescript --project-id <tu-project-id> > src/lib/types/database.types.ts
// y reemplazá este archivo — quedará 100% sincronizado con la base real.
//
// NOTA (corrección): supabase-js exige que cada tabla declare `Relationships`
// y que el schema declare `Views` y `Functions`, si no, TODAS las consultas
// `.from(...)` colapsan silenciosamente al tipo `never`. Es la causa de los
// ~260 errores de TypeScript que aparecían en el proyecto — quedan
// corregidos acá abajo.

export type RoleCode = "admin" | "encargado_seccion" | "encargado_subseccion" | "bombero";
export type TaskType = "unica" | "ciclica";
export type ValidationDecision = "aprobada" | "rechazada";

export type Profile = {
  id: string;
  legajo: string;
  full_name: string;
  role_id: string;
  section_id: string | null;
  subsection_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Role = {
  id: string;
  code: RoleCode;
  name: string;
};

export type Section = {
  id: string;
  name: string;
  icon: string;
  encargado_id: string | null;
};

export type Subsection = {
  id: string;
  section_id: string;
  name: string;
  encargado_id: string | null;
};

export type TaskStatus = {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_terminal: boolean;
};

export type Priority = {
  id: string;
  code: string;
  name: string;
  score_multiplier: number;
  color: string;
  sort_order: number;
};

export type TaskFrequency = {
  id: string;
  days: number;
  label: string;
  active: boolean;
  sort_order: number;
};

export type PerformanceLevel = {
  id: string;
  name: string;
  min_points: number;
  max_points: number | null;
  color: string;
  sort_order: number;
};

export type ScoringConfig = {
  id: string;
  points_approved: number;
  points_rejected: number;
  points_early_bonus: number;
  points_overdue_penalty: number;
  active: boolean;
};

export type GeneralSetting = {
  key: string;
  value: unknown;
  description: string | null;
};

export type Task = {
  id: string;
  name: string;
  description: string | null;
  subsection_id: string;
  unit: string | null;
  unit_id: string | null;
  requires_inventory_review: boolean;
  priority_id: string;
  type: TaskType;
  frequency_days: number | null;
  status_id: string;
  assigned_bombero_id: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  due_date: string | null;
  last_executed_at: string | null;
  next_execution_at: string | null;
  last_rejection_reason: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Assignment = {
  id: string;
  task_id: string;
  bombero_id: string;
  assigned_by: string;
  assigned_at: string;
  due_date: string | null;
  note: string | null;
};

export type TaskSubmission = {
  id: string;
  task_id: string;
  assignment_id: string | null;
  bombero_id: string;
  submitted_at: string;
  observations: string | null;
};

export type Validation = {
  id: string;
  submission_id: string;
  validator_id: string;
  decision: ValidationDecision;
  rejection_reason: string | null;
  validated_at: string;
  points_awarded: number;
};

export type ScoreRow = {
  id: string;
  bombero_id: string;
  section_id: string;
  points: number;
  tasks_assigned: number;
  tasks_completed: number;
  tasks_approved: number;
  tasks_rejected: number;
};

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: unknown;
  created_at: string;
};

export type Unit = {
  id: string;
  section_id: string;
  name: string;
  code: string | null;
  active: boolean;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: string | null;
  track_serial: boolean;
  active: boolean;
};

export type ItemState = {
  id: string;
  code: string;
  name: string;
  requires_alert: boolean;
  color: string;
  sort_order: number;
};

export type UnitInventoryRow = {
  id: string;
  unit_id: string;
  item_id: string;
  quantity: number;
  qr_code: string | null;
  barcode: string | null;
  serial_number: string | null;
  expires_at: string | null;
};

export type InventoryReview = {
  id: string;
  task_id: string;
  unit_id: string;
  submission_id: string | null;
  reviewed_by: string;
  reviewed_at: string;
};

export type InventoryReviewItem = {
  id: string;
  review_id: string;
  unit_inventory_id: string;
  state_id: string;
  observations: string | null;
};

export type InventoryAlert = {
  id: string;
  review_item_id: string;
  unit_id: string;
  section_id: string;
  status: "abierta" | "resuelta";
  created_at: string;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
};

// ---------- Helper genérico: arma una entrada de tabla válida para supabase-js ----------
type Table<Row, InsertExtra extends object = Partial<Row>> = {
  Row: Row;
  Insert: InsertExtra;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      roles: Table<Role>;
      sections: Table<Section>;
      subsections: Table<Subsection>;
      task_statuses: Table<TaskStatus>;
      priorities: Table<Priority>;
      task_frequencies: Table<TaskFrequency>;
      performance_levels: Table<PerformanceLevel>;
      scoring_config: Table<ScoringConfig>;
      general_settings: Table<GeneralSetting>;
      tasks: Table<Task>;
      assignments: Table<Assignment>;
      task_submissions: Table<TaskSubmission>;
      validations: Table<Validation>;
      scores: Table<ScoreRow>;
      audit_log: Table<AuditLogRow>;
      units: Table<Unit>;
      inventory_items: Table<InventoryItem>;
      item_states: Table<ItemState>;
      unit_inventory: Table<UnitInventoryRow>;
      inventory_reviews: Table<InventoryReview>;
      inventory_review_items: Table<InventoryReviewItem>;
      inventory_alerts: Table<InventoryAlert>;
    };
    Views: Record<string, never>;
    Functions: {
      assign_task: { Args: { p_task_id: string; p_bombero_id: string }; Returns: Task };
      submit_task: { Args: { p_task_id: string; p_observations: string }; Returns: TaskSubmission };
      validate_submission: {
        Args: { p_submission_id: string; p_decision: string; p_rejection_reason: string | null };
        Returns: Validation;
      };
      resolve_alert: { Args: { p_alert_id: string; p_note: string | null }; Returns: InventoryAlert };
      submit_inventory_review: {
        Args: { p_task_id: string; p_unit_id: string; p_observations: string; p_items: unknown };
        Returns: InventoryReview;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
