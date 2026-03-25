# SMTP va Email Verification

Tai lieu nay mo ta cach NewsFlow xu ly email verification va cach cau hinh SMTP truc tiep trong `Admin System Ops`.

## Cach flow hoat dong

- O `development` va `local`, dang ky/dang nhap bang email-password van hoat dong du chua cau hinh SMTP.
- O `production`, email verification duoc bat.
- Khi `production` dang bat ma SMTP chua du cau hinh, UI se chan signup email-password de tranh tao tai khoan ma khong gui duoc email xac minh.
- Tai khoan `ADMIN` van duoc dang nhap bang email-password du chua verify email.
- Tai khoan `USER` van phai verify email truoc khi vao he thong khi policy production dang bat.

## Cau hinh trong Admin System Ops

Mo trang `Admin > System Ops` va di den khu `SMTP config`.

Can nhap day du:

- `SMTP host`
- `SMTP port`
- `Use TLS / SSL`
- `SMTP username`
- `SMTP password`
- `From email`
- `From name` la tuy chon nhung nen co

Luu cau hinh xong, he thong se dung chinh bo SMTP nay de:

- gui email verification
- gui lai verification email
- gui test email tu `Admin System Ops`

## Gui test email

Sau khi luu cau hinh SMTP:

1. Nhap `Test recipient email`.
2. Bam `Send test email`.
3. Neu thanh cong, email nhan duoc se xac nhan SMTP dang hoat dong voi du lieu da luu trong DB.

Nut test se bi khoa khi cau hinh SMTP chua day du.

## Cau hinh Brevo

Neu dung Brevo SMTP, co the nhap:

- `Host`: `smtp-relay.brevo.com`
- `Port`: `587`
- `Secure`: `false`
- `Username`: email dang nhap SMTP cua Brevo
- `Password`: SMTP key cua Brevo
- `From email`: dia chi gui da duoc xac minh tren Brevo

Luu y:

- Day la `SMTP key`, khong phai HTTP API key.
- `Brevo key` duoc nhap vao truong `SMTP password` trong `Admin System Ops`.

## Checklist production

- Xac minh sender hoac domain tren nha cung cap SMTP.
- Cau hinh SPF/DKIM cho domain gui mail.
- Luu SMTP config trong `Admin System Ops`.
- Gui `test email` de xac nhan server gui duoc.
- Thu signup bang tai khoan user thuong.
- Thu login bang user chua verify de xac nhan man pending/resend.
- Thu login bang admin chua verify de xac nhan admin van vao duoc.
