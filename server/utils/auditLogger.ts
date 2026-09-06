export const AuditLogger = {
  log: (action: string, actorId: string, targetId: string | null, details: string) => {
    const timestamp = new Date().toISOString();
    const targetInfo = targetId ? ` | Target: ${targetId}` : '';
    // Log explicitly formatted for security tracking (stdout/stderr monitoring tools)
    console.log(`[AUDIT_LOG] [${timestamp}] [${action}] Actor: ${actorId}${targetInfo} | Details: ${details}`);
    // Future-proofing: Could write to an append-only file or forward to Cloud Logging API here
  }
};
