# Prisma Migrations

Folder ini berisi semua migration database.

## Cara kerja:

### Development (Mac):
```bash
# Buat migration baru setelah edit schema.prisma
npx prisma migrate dev --name nama_perubahan

# Contoh:
npx prisma migrate dev --name add_project_notes_field
```

### Production (otomatis via CI/CD):
```bash
# Command ini dijalankan otomatis di GitHub Actions saat deploy
npx prisma migrate deploy
```

## Aturan penting:
- JANGAN edit file migration yang sudah ada
- SELALU commit folder migrations ke git
- Migration baru otomatis dijalankan saat deploy ke server
