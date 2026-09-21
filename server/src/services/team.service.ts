import type { Prisma, TeamGroup, TeamRole } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { splitOpt } from '../lib/localized.js';
import { prisma } from '../lib/prisma.js';
import { toTeamMember } from '../serializers/index.js';
import type { z } from 'zod';
import type { createTeamMemberSchema, updateTeamMemberSchema } from '../validators/admin.validators.js';

type CreateInput = z.infer<typeof createTeamMemberSchema>;
type UpdateInput = z.infer<typeof updateTeamMemberSchema>;

function columns(i: UpdateInput) {
  const department = i.department && splitOpt(i.department);
  const message = i.message && splitOpt(i.message);
  return {
    ...(i.group && { group: i.group.toUpperCase() as TeamGroup }),
    ...(i.role && { role: i.role.toUpperCase() as TeamRole }),
    ...(i.name && { nameAr: i.name.ar, nameEn: i.name.en }),
    ...(i.title && { titleAr: i.title.ar, titleEn: i.title.en }),
    ...(department && { departmentAr: department.ar, departmentEn: department.en }),
    ...(i.bio && { bio: i.bio as Prisma.InputJsonValue }),
    ...(message && { messageAr: message.ar, messageEn: message.en }),
    ...(i.photo !== undefined && { photoUrl: i.photo }),
    ...(i.published !== undefined && { published: i.published }),
    ...(i.sortOrder !== undefined && { sortOrder: i.sortOrder }),
    ...(i.isPlaceholder !== undefined && { isSample: i.isPlaceholder }),
  };
}

const order = [{ sortOrder: 'asc' }, { createdAt: 'asc' }] satisfies Prisma.TeamMemberOrderByWithRelationInput[];

/** What the public site shows: published people, split into the two groups. */
export async function listPublicTeam() {
  const rows = await prisma.teamMember.findMany({ where: { published: true }, orderBy: order });
  const members = rows.map(toTeamMember);
  return {
    board: members.filter((m) => m.group === 'board'),
    executive: members.filter((m) => m.group === 'executive'),
  };
}

export async function listAdminTeam() {
  return (await prisma.teamMember.findMany({ orderBy: [{ group: 'asc' }, ...order] })).map(toTeamMember);
}

export async function getAdminTeamMember(id: string) {
  const row = await prisma.teamMember.findUnique({ where: { id } });
  if (!row) throw AppError.notFound('Team member not found', 'TEAM_MEMBER_NOT_FOUND');
  return toTeamMember(row);
}

export async function createTeamMember(input: CreateInput) {
  const last = await prisma.teamMember.aggregate({ where: { group: input.group!.toUpperCase() as TeamGroup }, _max: { sortOrder: true } });
  const row = await prisma.teamMember.create({
    data: { ...columns(input), sortOrder: input.sortOrder ?? (last._max.sortOrder ?? -1) + 1 } as Prisma.TeamMemberCreateInput,
  });
  return toTeamMember(row);
}

export async function updateTeamMember(id: string, input: UpdateInput) {
  const row = await prisma.teamMember.update({ where: { id }, data: columns(input) });
  return toTeamMember(row);
}

export async function deleteTeamMember(id: string) {
  await prisma.teamMember.delete({ where: { id } });
}

export async function reorderTeam(items: { id: string; sortOrder: number }[]) {
  await prisma.$transaction(items.map((item) => prisma.teamMember.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })));
}
