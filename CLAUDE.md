@AGENTS.md
@PROJECT_LOG.md

## 🚀 กฎเหล็ก: Auto Deploy Production ทุกครั้ง (Mandatory Rule)
- ทุกครั้งที่แก้ไขโค้ด เพิ่มฟีเจอร์ หรือแก้บั๊กเสร็จสิ้น และตรวจสอบ (`npx tsc --noEmit` / tests) ผ่านแล้ว **ต้องทำการ `git add`, `git commit`, และ `git push origin main` เพื่อ Auto Deploy ขึ้น Production (Vercel) ทันทีโดยอัตโนมัติ** ห้ามรอให้ผู้ใช้ต้องทวงถามว่าเอาขึ้น Prod หรือยัง

