import { db } from './db';

export async function logAuditEvent(
  params: {
    actorId?: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: object;
    newValues?: object;
    ipAddress?: string;
  },
  tx?: any
) {
  try {
    const client = tx || db;
    return await client.auditLog.create({
      data: {
        actorId: params.actorId || null,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        ipAddress: params.ipAddress || '127.0.0.1',
      },
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}
