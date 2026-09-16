const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  PageBreak,
  convertInchesToTwip,
} = require("docx");
const fs = require("fs");

// Create document
const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          size: {
            width: convertInchesToTwip(8.5),
            height: convertInchesToTwip(11),
          },
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
          },
        },
      },
      children: [
        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: "BÁO CÁO TIẾN ĐỘ DỰ ÁN",
              bold: true,
              size: 36,
              color: "1a56db",
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Ứng dụng DuLich - Nền tảng đặt phòng khách sạn",
              bold: true,
              size: 28,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [
            new TextRun({
              text: "Ngày báo cáo: 02/09/2026",
              size: 22,
              color: "6b7280",
            }),
          ],
        }),

        // Section 1: Project Overview
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
          children: [
            new TextRun({
              text: "1. TỔNG QUAN DỰ ÁN",
              bold: true,
              size: 28,
              color: "1a56db",
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Tên dự án: ",
              bold: true,
              size: 24,
            }),
            new TextRun({
              text: "DuLich - Ứng dụng đặt phòng khách sạn trực tuyến",
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Công nghệ sử dụng: ",
              bold: true,
              size: 24,
            }),
            new TextRun({
              text: "SwiftUI, Firebase (Firestore, Authentication), Cloudinary, MoMo/VNPay API",
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Nền tảng: ",
              bold: true,
              size: 24,
            }),
            new TextRun({
              text: "iOS (SwiftUI)",
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: "Mô tả: ",
              bold: true,
              size: 24,
            }),
            new TextRun({
              text: "Ứng dụng di động cho phép người dùng tìm kiếm, đặt phòng khách sạn với nhiều phương thức thanh toán (MoMo, VNPay, chuyển khoản, tiền mặt) và tính năng quản lý cho admin.",
              size: 24,
            }),
          ],
        }),

        // Section 2: Scope of Work
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
          children: [
            new TextRun({
              text: "2. PHẠM VI CÔNG VIỆC",
              bold: true,
              size: 28,
              color: "1a56db",
            }),
          ],
        }),

        // Task 1
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
          children: [
            new TextRun({
              text: "2.1. Hệ thống xác thực người dùng (Authentication)",
              bold: true,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Đăng nhập/đăng ký bằng Email và Password",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Đăng nhập bằng tài khoản Google",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Hỗ trợ đăng nhập ẩn danh (Anonymous)",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Quản lý trạng thái đăng nhập và phân quyền (User/Admin)",
              size: 22,
            }),
          ],
        }),

        // Task 2
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
          children: [
            new TextRun({
              text: "2.2. Khám phá và tìm kiếm (Explore & Search)",
              bold: true,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Trang chủ với danh sách khách sạn theo thành phố",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Tìm kiếm theo địa điểm, tên khách sạn, quận/huyện",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Hiển thị thời tiết theo thời gian thực cho 4 thành phố",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Xem chi tiết khách sạn với hình ảnh carousel",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Nhóm khách sạn theo thành phố",
              size: 22,
            }),
          ],
        }),

        // Task 3
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
          children: [
            new TextRun({
              text: "2.3. Hệ thống đặt phòng (Booking)",
              bold: true,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Tạo booking với thông tin check-in/check-out",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Xem lịch sử đặt phòng",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Hủy đặt phòng (trước 7 ngày)",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Xác nhận check-in tại khách sạn",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Quản lý trạng thái booking (Pending, Active, Checked-in, Cancelled)",
              size: 22,
            }),
          ],
        }),

        // Task 4
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
          children: [
            new TextRun({
              text: "2.4. Thanh toán (Payment)",
              bold: true,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Tích hợp thanh toán MoMo",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Tích hợp thanh toán VNPay",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Thanh toán chuyển khoản ngân hàng",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Thanh toán tiền mặt (COD)",
              size: 22,
            }),
          ],
        }),

        // Task 5
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
          children: [
            new TextRun({
              text: "2.5. Hệ thống đánh giá (Review)",
              bold: true,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Viết đánh giá cho khách sạn",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Kiểm duyệt nội dung đánh giá",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Hiển thị đánh giá từ người dùng khác",
              size: 22,
            }),
          ],
        }),

        // Task 6
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
          children: [
            new TextRun({
              text: "2.6. Quản trị hệ thống (Admin)",
              bold: true,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Dashboard quản lý cho admin",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Thêm mới khách sạn với upload ảnh lên Cloudinary",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: "Xóa khách sạn (kiểm tra booking active)",
              size: 22,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Quản lý thông tin cá nhân và cài đặt",
              size: 22,
            }),
          ],
        }),

        // Section 3: Results
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
          children: [
            new TextRun({
              text: "3. KẾT QUẢ DỰ ÁN",
              bold: true,
              size: 28,
              color: "1a56db",
            }),
          ],
        }),

        // Create results table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 40, type: WidthType.PERCENTAGE },
                  shading: { fill: "1a56db", type: ShadingType.CLEAR },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Module",
                          bold: true,
                          color: "ffffff",
                          size: 22,
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: "1a56db", type: ShadingType.CLEAR },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Tính năng",
                          bold: true,
                          color: "ffffff",
                          size: 22,
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  shading: { fill: "1a56db", type: ShadingType.CLEAR },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Trạng thái",
                          bold: true,
                          color: "ffffff",
                          size: 22,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Authentication", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Login, Register, Google Sign-in", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "Hoàn thành", size: 20, color: "16a34a", bold: true }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Explore & Search", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Browse hotels, Search, Weather", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "Hoàn thành", size: 20, color: "16a34a", bold: true }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Booking", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Create, Cancel, Check-in, History", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "Hoàn thành", size: 20, color: "16a34a", bold: true }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Payment", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "MoMo, VNPay, Bank Transfer, COD", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "Hoàn thành", size: 20, color: "16a34a", bold: true }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Review", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Write, Moderate, Display", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "Hoàn thành", size: 20, color: "16a34a", bold: true }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Admin Dashboard", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Manage Hotels, Upload Images", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "Hoàn thành", size: 20, color: "16a34a", bold: true }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Profile & Settings", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [new TextRun({ text: "Edit Profile, Settings", size: 20 })] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: "Hoàn thành", size: 20, color: "16a34a", bold: true }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),

        new Paragraph({ spacing: { after: 300 }, children: [] }),

        // Summary statistics
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 },
          children: [
            new TextRun({
              text: "3.1. Thống kê kết quả",
              bold: true,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Tổng số file Swift: ", size: 22, bold: true }),
            new TextRun({ text: "60+ files", size: 22 }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Số module chính: ", size: 22, bold: true }),
            new TextRun({ text: "7 modules (Auth, Explore, Booking, Payment, Review, Admin, Profile)", size: 22 }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Tính năng hoàn thành: ", size: 22, bold: true }),
            new TextRun({ text: "100% core features", size: 22 }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "Backend services: ", size: 22, bold: true }),
            new TextRun({ text: "Firebase Auth, Firestore, Cloudinary", size: 22 }),
          ],
        }),

        // Section 4: Next Steps
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
          children: [
            new TextRun({
              text: "4. CÁC BƯỚC TIẾP THEO",
              bold: true,
              size: 28,
              color: "1a56db",
            }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Thiết lập Firestore Security Rules cho production", size: 22 }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Tạo dữ liệu mẫu (50+ khách sạn với hình ảnh)", size: 22 }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Tích hợp production credentials cho MoMo và VNPay", size: 22 }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Hoàn thiện xử lý lỗi và loading states", size: 22 }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Thêm bộ lọc nâng cao (giá, tiện ích, rating)", size: 22 }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Tích hợp Firebase Analytics và Crashlytics", size: 22 }),
          ],
        }),
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "Chuẩn bị hồ sơ App Store và Submit", size: 22 }),
          ],
        }),

        // Conclusion
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
          children: [
            new TextRun({
              text: "5. KẾT LUẬN",
              bold: true,
              size: 28,
              color: "1a56db",
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: "Dự án DuLich đã hoàn thành các tính năng cốt lõi bao gồm hệ thống xác thực, tìm kiếm khách sạn, đặt phòng với nhiều phương thức thanh toán, và trang quản trị cho admin. Ứng dụng sẵn sàng cho việc kiểm thử và chuẩn bị phát hành trên App Store.",
              size: 22,
            }),
          ],
        }),
      ],
    },
  ],
});

// Generate and save
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(
    "/Users/macbookpro/Documents/DoAnCoSo/BaoCao_DuAn_DuLich.docx",
    buffer
  );
  console.log("Report created successfully!");
});
