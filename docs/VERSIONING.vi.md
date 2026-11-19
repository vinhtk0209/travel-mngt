# Quản lý version, release và rollback

Tài liệu này là bản tiếng Việt của quy trình release. Bản canonical (tiếng Anh,
dùng cho checklist đầy đủ) nằm ở [RELEASES.md](RELEASES.md); nội dung từng
version nằm ở [CHANGELOG.md](../CHANGELOG.md).

## 1. Nguyên tắc

- Mỗi bản production phải map với đúng **một Git tag** dạng `vMAJOR.MINOR.PATCH`.
- Tag đã push là **bất biến**: không di chuyển, không xóa, không reuse.
- SemVer:
  - `PATCH` (`v0.3.1`): chỉ sửa lỗi.
  - `MINOR` (`v0.4.0`): thêm tính năng, tương thích ngược.
  - `MAJOR` (`v1.0.0`): thay đổi phá vỡ tương thích sản phẩm/dữ liệu.
- `main` là nhánh deploy production. Không force-push `main`.
- Migration Supabase là **forward-only**. Không sửa migration đã apply lên
  production; nếu sai thì tạo migration bù trừ mới.

## 2. Version hiện tại

| Version | Commit | Nội dung chính | Ghi chú backend |
| --- | --- | --- | --- |
| `v0.4.0` | `2bdab61` | i18n EN/VI, avatar, chat realtime, assistant Basic/Gemini, tag màu accessible, share link | Migration `20260101000400`–`20260101000800` + function `trip-assistant` |
| `v0.3.0` | `63930ac` | Dark mode, Maps links ở list/card, share link không cần email, Wanderbot, sửa upload ảnh | Cần migration `20260101000300_share_links.sql` + function `invite-member` bản này |
| `v0.2.0` | `4b32510` | Chỉ còn đăng nhập Google/GitHub | Schema trước share link |
| `v0.1.1` | `dd11e75` | Thêm Vercel SPA rewrite | Cùng schema `v0.1.0` |
| `v0.1.0` | `20bdae9` | MVP: trips, places, ảnh, invites, RLS | Schema ban đầu |

Thông tin môi trường production:

- Frontend: Vercel, production alias `https://travel-mngt.vercel.app` và
  `https://travel-mngt-v-eec4.vercel.app`.
- Supabase project: `fzscxphxrstnkjmpuchs`.
- Edge Function: `trip-assistant` (Gemini mode cần secret `GEMINI_API_KEY`).

## 3. Biết version đang chạy có gì

```powershell
# Version mới nhất
git describe --tags --always

# Danh sách version kèm mô tả
git tag --sort=-v:refname -n99

# Xem chi tiết một version
git show v0.4.0

# Từ commit SHA đang deploy trên Vercel, tìm tag tương ứng
git tag --contains <commit-sha>
```

Trên Vercel, mở **Deployments**, mỗi deployment hiển thị commit SHA. Đối chiếu SHA
này với tag/commit trong Git. Nội dung chi tiết của version đọc trong
`CHANGELOG.md`.

## 4. Quy trình release

### Bước 1 — Kiểm tra trước khi release

```powershell
git status
npm run release:verify
```

`release:verify` chạy lần lượt: typecheck app → typecheck E2E → unit tests → build.

Với local Supabase đang chạy:

```powershell
npm run test:e2e
```

### Bước 2 — Cập nhật nội dung version

1. Mở `CHANGELOG.md`, chuyển các mục từ `Unreleased` sang version mới.
2. Ghi rõ phần **Backend / deployment** nếu có migration hoặc function thay đổi.
3. Bump version, chưa tạo tag:

```powershell
npm version minor --no-git-tag-version
```

Đổi `minor` thành `patch` hoặc `major` tùy phạm vi thay đổi.

### Bước 3 — Commit và tag

```powershell
git add -A
git commit -m "chore(release): v0.4.0"
git tag -a v0.4.0 -m "Tóm tắt ngắn gọn nội dung version"
```

Tag phải là annotated tag (`-a`), không dùng lightweight tag.

### Bước 4 — Push

```powershell
git push origin main
git push origin v0.4.0
```

Push `main` kích hoạt Vercel deploy production. Push tag để version có thể truy
vết và rollback.

### Bước 5 — Backend

Áp dụng migration và deploy function **trước hoặc cùng lúc** với frontend:

```powershell
npx supabase db push --remote --yes
npx supabase functions deploy trip-assistant --yes
```

Kiểm tra lại:

```powershell
npx supabase migration list --remote
```

### Bước 6 — Smoke test production

- Đăng nhập Google/GitHub.
- Mở dashboard, đổi ngôn ngữ EN/VI và reload để kiểm tra lưu preference.
- Mở một trip, thêm place, upload ảnh, mở link Google Maps.
- Gửi chat và kiểm tra thành viên khác nhận realtime.
- Bật/tắt dark mode.
- Tạo share link và mở link bằng tài khoản thứ hai.
- Thử assistant ở Basic mode, sau đó Gemini mode nếu đã cấu hình key.

## 5. Rollback

### 5.1. Rollback frontend nhanh nhất (khuyến nghị)

1. Mở Vercel → project `travel-mngt` → **Deployments**.
2. Tìm deployment tốt gần nhất; đối chiếu commit SHA với tag trong Git.
3. Chọn **Promote to Production** / **Instant Rollback**.
4. Kiểm tra lại production URL và smoke test nhanh.

Cách này không rebuild, không đổi Git history, không ảnh hưởng database hay Edge
Function.

### 5.2. Rollback code trên `main`

Khi cần `main` thực sự quay lại trạng thái cũ, dùng `git revert` để giữ lịch sử:

```powershell
git revert <bad-commit-sha>
git push origin main
```

Không dùng `git reset --hard` rồi force-push `main`.

Sau đó release bản patch tiếp theo, ví dụ `v0.3.1`, để production có tag mới rõ
ràng.

### 5.3. Rollback Edge Function

Deploy lại function từ tag cũ mà không cần đổi working tree hiện tại:

```powershell
git worktree add ..\travel-mngt-v0.2.0 v0.2.0
npx --prefix ..\travel-mngt-v0.2.0 supabase functions deploy invite-member
git worktree remove ..\travel-mngt-v0.2.0
```

Kiểm tra function sau khi deploy bằng một invite email hoặc share link.

### 5.4. Rollback database

Supabase không có down-migration tự động.

- Nếu migration chỉ mở rộng schema (ví dụ `v0.3.0` làm `email` nullable) thì
  rollback frontend là an toàn.
- Nếu migration gây lỗi dữ liệu, tạo migration mới để bù trừ, apply bằng
  `npx supabase db push --remote`, rồi mới rollback app nếu cần.
- Trước thay đổi dữ liệu lớn: backup production trước khi push migration.
- Không sửa file migration đã có trong `supabase/migrations/` sau khi đã apply.

## 6. Checklist khi phát hiện version lỗi

- [ ] Xác định commit SHA đang chạy trên Vercel và tag tương ứng.
- [ ] Xác định lỗi thuộc frontend, Edge Function hay migration.
- [ ] Nếu chỉ frontend: Promote deployment tốt trên Vercel.
- [ ] Nếu function: deploy lại function từ tag tốt.
- [ ] Nếu migration: viết migration bù trừ, không sửa migration cũ.
- [ ] Mở issue ghi rõ version lỗi, bước tái hiện, ảnh hưởng.
- [ ] Fix forward trên branch, chạy `npm run release:verify`.
- [ ] Release patch version mới và cập nhật `CHANGELOG.md`.

## 7. Lệnh tra cứu nhanh

```powershell
git describe --tags --always        # version hiện tại
git tag --sort=-v:refname -n99      # danh sách version
git show v0.4.0                     # chi tiết tag/commit
git log --oneline --decorate -10    # commit gần đây kèm tag
git tag --contains <sha>            # tag chứa commit
```
