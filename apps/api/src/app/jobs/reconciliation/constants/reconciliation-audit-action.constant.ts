import {AuditActionEnum} from '@peco/enums';

/** `auditLogs.action` for a balance drift detected by the nightly job (9.9/D50/D83). */
export const RECONCILIATION_MISMATCH_AUDIT_ACTION = AuditActionEnum.RECONCILE_MISMATCH.toString();
