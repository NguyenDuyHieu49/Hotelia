# Design Engineering Toolkit

Phiên bản 1.0.0 — bộ skill dùng lại cho nhiều project.

Sau khi cài plugin, có thể chọn plugin trong tác vụ của project và yêu cầu: “Dùng các skill phù hợp để thiết kế và triển khai project này.” Skill `project-craft` giúp chọn workflow; từng skill cũng có thể được chọn riêng.

## Thành phần

40 skill: 1 Impeccable, 13 Taste, 25 skill trong manifest chính thức của Matt Pocock, và 1 skill điều phối project-craft. Các bản thử nghiệm ngoài manifest, thư mục misc, website, test fixtures và bản sao dành cho các IDE khác không được đóng gói.

Impeccable chứa launcher, tài liệu và dữ liệu hỗ trợ; engine có thể cần tải ở lần chạy đầu. Plugin không tự cài extension trình duyệt, hook hoặc đăng ký subagent toàn cục. Google Stitch, công cụ tạo ảnh, trình duyệt và CLI quản lý issue phải có sẵn nếu workflow cần chúng. Taste v2 được upstream đánh dấu experimental; v1 được giữ để tương thích.

## Nguồn và chỉnh sửa

- Impeccable 4.3.1, Paul Bakaus — Apache-2.0.
- Taste Skill 1.0.0, Leonxlnx — MIT.
- Matt Pocock Skills 1.2.3, Matt Pocock — MIT.

Giữ giấy phép trong `licenses/`. Các thư mục Taste được đặt theo `name` của skill; các nhóm engineering/productivity được đưa về `skills/` để khám phá trực tiếp. Mỗi SKILL.md có ghi chú đóng gói về phạm vi, công cụ và cách chọn phong cách. Đường dẫn minh họa blocks của Taste dùng skill-base-dir; blocks không có sẵn trong ZIP gốc. Nội dung còn lại và các chính sách gọi skill gốc được giữ nguyên. Không chạy script nào từ các ZIP trong quá trình đóng gói.

## Danh sách skill

- `project-craft` — điều phối workflow.
- `impeccable` — impeccable-main.zip
- `brandkit` — taste-skill-main.zip
- `industrial-brutalist-ui` — taste-skill-main.zip
- `gpt-taste` — taste-skill-main.zip
- `image-to-code` — taste-skill-main.zip
- `imagegen-frontend-mobile` — taste-skill-main.zip
- `imagegen-frontend-web` — taste-skill-main.zip
- `minimalist-ui` — taste-skill-main.zip
- `full-output-enforcement` — taste-skill-main.zip
- `redesign-existing-projects` — taste-skill-main.zip
- `high-end-visual-design` — taste-skill-main.zip
- `stitch-design-taste` — taste-skill-main.zip
- `design-taste-frontend-v1` — taste-skill-main.zip
- `design-taste-frontend` — taste-skill-main.zip
- `ask-matt` — skills-main.zip
- `diagnosing-bugs` — skills-main.zip
- `grill-with-docs` — skills-main.zip
- `triage` — skills-main.zip
- `improve-codebase-architecture` — skills-main.zip
- `setup-matt-pocock-skills` — skills-main.zip
- `tdd` — skills-main.zip
- `to-spec` — skills-main.zip
- `to-tickets` — skills-main.zip
- `wayfinder` — skills-main.zip
- `implement` — skills-main.zip
- `prototype` — skills-main.zip
- `research` — skills-main.zip
- `domain-modeling` — skills-main.zip
- `codebase-design` — skills-main.zip
- `code-review` — skills-main.zip
- `resolving-merge-conflicts` — skills-main.zip
- `wizard` — skills-main.zip
- `grill-me` — skills-main.zip
- `grilling` — skills-main.zip
- `handoff` — skills-main.zip
- `teach` — skills-main.zip
- `to-questionnaire` — skills-main.zip
- `wait-what` — skills-main.zip
- `writing-for-agents` — skills-main.zip
