import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })


async function main() {
  const hash = (p: string) => bcrypt.hashSync(p, 10)

  const it = await prisma.division.create({
    data: { name: 'IT', code: 'IT', accountMode: 'INDIVIDUAL' },
  })
  const hr = await prisma.division.create({
    data: { name: 'HR', code: 'HR', accountMode: 'INDIVIDUAL' },
  })
  const ga = await prisma.division.create({
    data: { name: 'GA', code: 'GA', accountMode: 'SHARED' },
  })

  await prisma.user.create({
    data: { name: 'Super Admin', email: 'super@demo.com', passwordHash: hash('password'), role: 'super_admin' },
  })
  await prisma.user.create({
    data: { name: 'IT Admin', email: 'itadmin@demo.com', passwordHash: hash('password'), role: 'division_admin', divisionId: it.id },
  })
  await prisma.user.create({
    data: { name: 'IT Agent', email: 'itagent@demo.com', passwordHash: hash('password'), role: 'agent', divisionId: it.id },
  })
  await prisma.user.create({
    data: { name: 'Budi Santoso', email: 'budi@demo.com', passwordHash: hash('password'), role: 'requester', divisionId: it.id },
  })
  await prisma.user.create({
    data: { name: 'HR Admin', email: 'hradmin@demo.com', passwordHash: hash('password'), role: 'division_admin', divisionId: hr.id },
  })
  await prisma.user.create({
    data: { name: 'GA Shared', email: 'ga@demo.com', passwordHash: hash('password'), role: 'requester', divisionId: ga.id, isSharedAccount: true },
  })

  const itCat = await prisma.category.create({
    data: { name: 'Kerusakan Hardware', divisionId: it.id, slaCriticalHours: 4, slaHighHours: 8, slaMediumHours: 24, slaLowHours: 72 },
  })
  await prisma.formField.createMany({
    data: [
      { categoryId: itCat.id, label: 'Nama Perangkat', fieldType: 'SHORT_TEXT', isRequired: true, order: 1 },
      { categoryId: itCat.id, label: 'Deskripsi Masalah', fieldType: 'PARAGRAPH', isRequired: true, order: 2 },
      { categoryId: itCat.id, label: 'Lokasi', fieldType: 'DROPDOWN', options: ['Lantai 1', 'Lantai 2', 'Lantai 3'], isRequired: true, order: 3 },
      { categoryId: itCat.id, label: 'Tanggal Kejadian', fieldType: 'DATE', isRequired: false, order: 4 },
      { categoryId: itCat.id, label: 'Foto Kerusakan', fieldType: 'FILE_UPLOAD', isRequired: false, order: 5 },
    ],
  })

  const itCat2 = await prisma.category.create({
    data: { name: 'Permintaan Software', divisionId: it.id, slaCriticalHours: 8, slaHighHours: 24, slaMediumHours: 48, slaLowHours: 120 },
  })
  await prisma.formField.createMany({
    data: [
      { categoryId: itCat2.id, label: 'Nama Software', fieldType: 'SHORT_TEXT', isRequired: true, order: 1 },
      { categoryId: itCat2.id, label: 'Keperluan', fieldType: 'PARAGRAPH', isRequired: true, order: 2 },
      { categoryId: itCat2.id, label: 'Urgensi', fieldType: 'RADIO', options: ['Segera', 'Normal', 'Tidak Mendesak'], isRequired: true, order: 3 },
    ],
  })

  const hrCat = await prisma.category.create({
    data: { name: 'Pengajuan Cuti', divisionId: hr.id, slaCriticalHours: 8, slaHighHours: 24, slaMediumHours: 48, slaLowHours: 120 },
  })
  await prisma.formField.createMany({
    data: [
      { categoryId: hrCat.id, label: 'Jenis Cuti', fieldType: 'RADIO', options: ['Cuti Tahunan', 'Cuti Sakit', 'Cuti Melahirkan'], isRequired: true, order: 1 },
      { categoryId: hrCat.id, label: 'Tanggal Mulai', fieldType: 'DATE', isRequired: true, order: 2 },
      { categoryId: hrCat.id, label: 'Tanggal Selesai', fieldType: 'DATE', isRequired: true, order: 3 },
      { categoryId: hrCat.id, label: 'Alasan', fieldType: 'PARAGRAPH', isRequired: true, order: 4 },
    ],
  })

  const gaCat = await prisma.category.create({
    data: { name: 'Pengadaan ATK', divisionId: ga.id, slaCriticalHours: 24, slaHighHours: 48, slaMediumHours: 72, slaLowHours: 168 },
  })
  await prisma.formField.createMany({
    data: [
      { categoryId: gaCat.id, label: 'Nama Barang', fieldType: 'SHORT_TEXT', isRequired: true, order: 1 },
      { categoryId: gaCat.id, label: 'Jumlah', fieldType: 'NUMBER', isRequired: true, order: 2 },
      { categoryId: gaCat.id, label: 'Keperluan', fieldType: 'PARAGRAPH', isRequired: false, order: 3 },
    ],
  })

  console.log('Seed complete.')
}

main().finally(() => prisma.$disconnect())
