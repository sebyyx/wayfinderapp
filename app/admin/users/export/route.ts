import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { getUsers } from '@/lib/users';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// CSV export of the user list, honoring the same ?q= search as the page.
// Gated on the admin session like every other admin surface.
export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const q = new URL(request.url).searchParams.get('q') ?? undefined;
  const users = await getUsers(q);

  const header = [
    'email', 'name', 'archetype', 'tier', 'paid', 'status',
    'last_payment', 'next_due', 'store', 'auto_renew', 'last_active', 'created_at', 'id',
  ];

  const status = (u: (typeof users)[number]) =>
    u.hasBillingIssue ? 'billing_issue' : !u.isPaid ? 'free' : u.isExpired ? 'expired' : 'active';

  const rows = users.map((u) =>
    [
      u.email ?? '', u.name ?? '', u.archetype ?? '', u.tier, u.isPaid ? 'yes' : 'no', status(u),
      u.lastPaymentAt ?? '', u.nextDueAt ?? '', u.store ?? '',
      u.willRenew === null ? '' : u.willRenew ? 'yes' : 'no',
      u.lastActiveAt ?? '', u.createdAt ?? '', u.id,
    ].map(csvCell).join(','),
  );

  const csv = [header.join(','), ...rows].join('\r\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="wayfinder-users.csv"',
    },
  });
}

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
