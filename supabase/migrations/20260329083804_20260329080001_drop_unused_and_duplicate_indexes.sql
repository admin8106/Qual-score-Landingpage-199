/*
  # Drop Unused and Duplicate Indexes

  ## Summary
  Removes all indexes flagged as unused by Supabase's index advisor, plus
  duplicate indexes where a UNIQUE constraint already creates an implicit index.

  ## Dropped Indexes by Table

  ### public.reports
  - idx_reports_session_id
  - idx_reports_lead_id

  ### public.diagnostic_sessions
  - idx_diagnostic_sessions_lead_id

  ### public.leads
  - idx_leads_email
  - idx_leads_created_at

  ### public.analytics_events
  - analytics_events_event_name_idx
  - analytics_events_occurred_at_idx
  - analytics_events_anonymous_id_idx

  ### public.payment_transactions
  - idx_pt_lead_id
  - idx_pt_gateway_order_id
  - idx_pt_gateway_payment_id
  - idx_pt_status
  - idx_payment_transactions_verification_state
  - idx_payment_transactions_payment_ref_state

  ### public.audit_log
  - idx_audit_log_event_type
  - idx_audit_log_actor_id
  - idx_audit_log_resource
  - idx_audit_log_occurred_at
  - idx_audit_log_outcome

  ### public.candidate_payment_transactions
  - idx_cpt_candidate_profile_id
  - idx_cpt_gateway_order_id
  - idx_cpt_status
  - idx_cpt_payment_reference  (duplicate of UNIQUE constraint)

  ### public.diagnostic_question_responses
  - idx_dqr_candidate_profile_id
  - idx_dqr_section_code
  - idx_dqr_candidate_section

  ### public.candidate_profiles
  - idx_cp_email
  - idx_cp_mobile
  - idx_cp_candidate_code  (duplicate of UNIQUE constraint)

  ### public.diagnostic_scores
  - idx_ds_band_label
  - idx_ds_candidate_profile_id  (duplicate of UNIQUE constraint)

  ### public.consultation_bookings
  - idx_cb_candidate_profile_id
  - idx_cb_booking_status
  - idx_cb_preferred_date

  ### public.diagnostic_reports
  - idx_dr_candidate_profile_id
  - idx_dr_report_status
  - idx_diagnostic_reports_ai_failure

  ### public.backend_analytics_events
  - backend_analytics_events_event_name_idx
  - backend_analytics_events_created_at_idx
  - backend_analytics_events_candidate_profile_id_idx
  - backend_analytics_events_source_idx

  ### public.linkedin_analysis_results
  - idx_lar_candidate_profile_id
  - idx_lar_status
  - idx_lar_ingestion_mode

  ### public.communication_events
  - idx_ce_candidate_profile_id
  - idx_ce_event_type
  - idx_ce_channel_type
  - idx_ce_delivery_status
  - idx_ce_provider_msg_id
  - idx_comm_events_retried
  - idx_comm_events_failed

  ### public.admin_users
  - idx_admin_users_email
  - idx_admin_users_is_active

  ### public.ops_actions
  - idx_ops_actions_candidate_code
  - idx_ops_actions_created_at

  ### public.early_leads
  - idx_early_leads_email
  - idx_early_leads_funnel_stage
  - idx_early_leads_is_complete
  - idx_early_leads_payment_ref
  - idx_early_leads_created_at

  ## Notes
  - All indexes dropped via IF EXISTS to be safe
  - Duplicate indexes drop the redundant copy; the UNIQUE constraint index is retained
  - These indexes have not been used by any query plans; removing them reduces write overhead
*/

-- public.reports
DROP INDEX IF EXISTS public.idx_reports_session_id;
DROP INDEX IF EXISTS public.idx_reports_lead_id;

-- public.diagnostic_sessions
DROP INDEX IF EXISTS public.idx_diagnostic_sessions_lead_id;

-- public.leads
DROP INDEX IF EXISTS public.idx_leads_email;
DROP INDEX IF EXISTS public.idx_leads_created_at;

-- public.analytics_events
DROP INDEX IF EXISTS public.analytics_events_event_name_idx;
DROP INDEX IF EXISTS public.analytics_events_occurred_at_idx;
DROP INDEX IF EXISTS public.analytics_events_anonymous_id_idx;

-- public.payment_transactions
DROP INDEX IF EXISTS public.idx_pt_lead_id;
DROP INDEX IF EXISTS public.idx_pt_gateway_order_id;
DROP INDEX IF EXISTS public.idx_pt_gateway_payment_id;
DROP INDEX IF EXISTS public.idx_pt_status;
DROP INDEX IF EXISTS public.idx_payment_transactions_verification_state;
DROP INDEX IF EXISTS public.idx_payment_transactions_payment_ref_state;

-- public.audit_log
DROP INDEX IF EXISTS public.idx_audit_log_event_type;
DROP INDEX IF EXISTS public.idx_audit_log_actor_id;
DROP INDEX IF EXISTS public.idx_audit_log_resource;
DROP INDEX IF EXISTS public.idx_audit_log_occurred_at;
DROP INDEX IF EXISTS public.idx_audit_log_outcome;

-- public.candidate_payment_transactions
DROP INDEX IF EXISTS public.idx_cpt_candidate_profile_id;
DROP INDEX IF EXISTS public.idx_cpt_gateway_order_id;
DROP INDEX IF EXISTS public.idx_cpt_status;
DROP INDEX IF EXISTS public.idx_cpt_payment_reference;

-- public.diagnostic_question_responses
DROP INDEX IF EXISTS public.idx_dqr_candidate_profile_id;
DROP INDEX IF EXISTS public.idx_dqr_section_code;
DROP INDEX IF EXISTS public.idx_dqr_candidate_section;

-- public.candidate_profiles
DROP INDEX IF EXISTS public.idx_cp_email;
DROP INDEX IF EXISTS public.idx_cp_mobile;
DROP INDEX IF EXISTS public.idx_cp_candidate_code;

-- public.diagnostic_scores
DROP INDEX IF EXISTS public.idx_ds_band_label;
DROP INDEX IF EXISTS public.idx_ds_candidate_profile_id;

-- public.consultation_bookings
DROP INDEX IF EXISTS public.idx_cb_candidate_profile_id;
DROP INDEX IF EXISTS public.idx_cb_booking_status;
DROP INDEX IF EXISTS public.idx_cb_preferred_date;

-- public.diagnostic_reports
DROP INDEX IF EXISTS public.idx_dr_candidate_profile_id;
DROP INDEX IF EXISTS public.idx_dr_report_status;
DROP INDEX IF EXISTS public.idx_diagnostic_reports_ai_failure;

-- public.backend_analytics_events
DROP INDEX IF EXISTS public.backend_analytics_events_event_name_idx;
DROP INDEX IF EXISTS public.backend_analytics_events_created_at_idx;
DROP INDEX IF EXISTS public.backend_analytics_events_candidate_profile_id_idx;
DROP INDEX IF EXISTS public.backend_analytics_events_source_idx;

-- public.linkedin_analysis_results
DROP INDEX IF EXISTS public.idx_lar_candidate_profile_id;
DROP INDEX IF EXISTS public.idx_lar_status;
DROP INDEX IF EXISTS public.idx_lar_ingestion_mode;

-- public.communication_events
DROP INDEX IF EXISTS public.idx_ce_candidate_profile_id;
DROP INDEX IF EXISTS public.idx_ce_event_type;
DROP INDEX IF EXISTS public.idx_ce_channel_type;
DROP INDEX IF EXISTS public.idx_ce_delivery_status;
DROP INDEX IF EXISTS public.idx_ce_provider_msg_id;
DROP INDEX IF EXISTS public.idx_comm_events_retried;
DROP INDEX IF EXISTS public.idx_comm_events_failed;

-- public.admin_users
DROP INDEX IF EXISTS public.idx_admin_users_email;
DROP INDEX IF EXISTS public.idx_admin_users_is_active;

-- public.ops_actions
DROP INDEX IF EXISTS public.idx_ops_actions_candidate_code;
DROP INDEX IF EXISTS public.idx_ops_actions_created_at;

-- public.early_leads
DROP INDEX IF EXISTS public.idx_early_leads_email;
DROP INDEX IF EXISTS public.idx_early_leads_funnel_stage;
DROP INDEX IF EXISTS public.idx_early_leads_is_complete;
DROP INDEX IF EXISTS public.idx_early_leads_payment_ref;
DROP INDEX IF EXISTS public.idx_early_leads_created_at;
