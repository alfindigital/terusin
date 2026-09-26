# Panduan Kontribusi

1. Fork repo ini
2. Buat branch: `feat/fitur`, `fix/bug`, `docs/perubahan`
3. Commit: `feat: deskripsi`, `fix: deskripsi`
4. Buka Pull Request

Nol dependency — tidak ada `package.json`, tidak ada `npm install`.

```bash
python -m http.server 4820      # jalan lokal → http://localhost:4820
node tools/cek.js               # cek aset, sintaks, daftar putih
node tools/build-dist.js        # rakit dist/ (daftar putih)
npx wrangler pages deploy dist --project-name terusin   # deploy
```

Jangan commit `.env*`, API key, atau credential. Lisensi: [MIT](LICENSE).
