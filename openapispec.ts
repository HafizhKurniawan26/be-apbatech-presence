export const openapiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Attendance Management System API",
    description:
      "API untuk sistem manajemen kehadiran karyawan dengan fitur presensi GPS/QR Code, pengajuan cuti, dan notifikasi real-time",
    version: "1.0.0",
    contact: {
      name: "Support Team",
      email: "support@attendance.com",
    },
    license: {
      name: "MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:8787/api/",
      description: "Production Server",
    },
    {
      url: "http://localhost:8787/api/",
      description: "Development Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token yang didapat dari endpoint login",
      },
    },
    schemas: {
      // Response Wrappers
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation successful" },
          data: { type: "object" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Error message description" },
        },
      },
      // User Schemas
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          nip: { type: "string", example: "198502102010011001" },
          name: { type: "string", example: "Budi Santoso" },
          email: {
            type: "string",
            format: "email",
            example: "budi.santoso@company.com",
          },
          role: {
            type: "string",
            enum: ["admin", "employee"],
            example: "employee",
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2024-01-15T08:00:00Z",
          },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["identifier", "password"],
        properties: {
          identifier: {
            type: "string",
            description: "Email atau NIP karyawan",
            example: "budi.santoso@company.com",
          },
          password: {
            type: "string",
            format: "password",
            minLength: 6,
            example: "password123",
          },
          fcm_token: {
            type: "string",
            description: "Firebase Cloud Messaging token untuk notifikasi push",
            example: "fcm_token_xyz123",
          },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Login successful" },
          data: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/User" },
              tokens: {
                type: "object",
                properties: {
                  access_token: {
                    type: "string",
                    example: "eyJhbGciOiJIUzI1NiIs...",
                  },
                  refresh_token: {
                    type: "string",
                    example: "eyJhbGciOiJIUzI1NiIs...",
                  },
                  token_type: { type: "string", example: "Bearer" },
                  expires_in: { type: "integer", example: 86400 },
                },
              },
            },
          },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["nip", "name", "email", "password", "role"],
        properties: {
          nip: {
            type: "string",
            minLength: 10,
            maxLength: 20,
            example: "198502102010011001",
          },
          name: {
            type: "string",
            minLength: 3,
            maxLength: 100,
            example: "Budi Santoso",
          },
          email: {
            type: "string",
            format: "email",
            example: "budi.santoso@company.com",
          },
          password: {
            type: "string",
            format: "password",
            minLength: 6,
            example: "password123",
          },
          role: {
            type: "string",
            enum: ["admin", "employee"],
            default: "employee",
            example: "employee",
          },
        },
      },
      ChangePasswordRequest: {
        type: "object",
        required: ["current_password", "new_password"],
        properties: {
          current_password: {
            type: "string",
            format: "password",
            example: "oldpassword123",
          },
          new_password: {
            type: "string",
            format: "password",
            minLength: 6,
            example: "newpassword123",
          },
        },
      },
      RefreshTokenRequest: {
        type: "object",
        required: ["refresh_token"],
        properties: {
          refresh_token: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
        },
      },
      RefreshTokenResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              access_token: {
                type: "string",
                example: "eyJhbGciOiJIUzI1NiIs...",
              },
              token_type: { type: "string", example: "Bearer" },
              expires_in: { type: "integer", example: 86400 },
            },
          },
        },
      },
      // Leave Request Schemas
      LeaveRequest: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          type: {
            type: "string",
            enum: ["cuti", "izin", "sakit"],
            example: "cuti",
          },
          startDate: { type: "string", format: "date", example: "2024-02-01" },
          endDate: { type: "string", format: "date", example: "2024-02-05" },
          status: {
            type: "string",
            enum: ["pending", "approved", "rejected"],
            example: "pending",
          },
          reason: { type: "string", example: "Liburan keluarga ke Bali" },
          attachmentUrl: {
            type: "string",
            nullable: true,
            example: "https://cdn.cloudflareR2...",
          },
          totalDays: { type: "integer", example: 5 },
          rejectionReason: { type: "string", nullable: true, example: null },
          approvedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          user: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" },
              email: { type: "string" },
            },
          },
          approver: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "integer" },
              name: { type: "string" },
            },
          },
        },
      },
      CreateLeaveRequestInput: {
        type: "object",
        required: ["type", "start_date", "end_date", "reason"],
        properties: {
          type: {
            type: "string",
            enum: ["cuti", "izin", "sakit"],
            example: "cuti",
          },
          start_date: { type: "string", format: "date", example: "2024-02-01" },
          end_date: { type: "string", format: "date", example: "2024-02-05" },
          reason: {
            type: "string",
            minLength: 10,
            example: "Liburan keluarga ke Bali selama 5 hari",
          },
          attachment: { type: "string", format: "binary" },
        },
      },
      LeaveQuota: {
        type: "object",
        properties: {
          cuti: {
            type: "object",
            properties: {
              total: {
                type: "integer",
                description: "Total kuota cuti per tahun",
                example: 12,
              },
              used: {
                type: "integer",
                description: "Jumlah hari cuti yang sudah digunakan",
                example: 3,
              },
              remaining: {
                type: "integer",
                description: "Sisa kuota cuti",
                example: 9,
              },
            },
          },
          izin: {
            type: "object",
            properties: {
              total: { type: "integer", example: 6 },
              used: { type: "integer", example: 1 },
              remaining: { type: "integer", example: 5 },
            },
          },
          sakit: {
            type: "object",
            properties: {
              total: { type: "integer", example: 14 },
              used: { type: "integer", example: 0 },
              remaining: { type: "integer", example: 14 },
            },
          },
        },
      },
      // QR Code Schemas
      QRCodeData: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description: "Token unik QR Code (32 karakter)",
            example: "aB3dE5fG7hI9jK1lMn2oP3qR4sT5uV6w",
          },
          type: {
            type: "string",
            enum: ["check_in", "check_out"],
            example: "check_in",
          },
          location: {
            type: "object",
            properties: {
              id: { type: "integer", example: 1 },
              name: { type: "string", example: "Kantor Pusat Jakarta" },
            },
          },
          generated_by: {
            type: "object",
            properties: {
              id: { type: "integer", example: 99 },
              name: { type: "string", example: "Admin Utama" },
            },
          },
          qr_code_url: {
            type: "string",
            format: "uri",
            description: "URL gambar QR Code (dari api.qrserver.com)",
            example: "https://api.qrserver.com/v1/create-qr-code/?data=...",
          },
          qr_data: {
            type: "string",
            description: "Data yang diencode dalam QR (JSON string)",
            example: '{"token":"aB3dE5f...","type":"check_in","location_id":1}',
          },
          expires_in: {
            type: "integer",
            description: "Masa berlaku dalam detik (600 detik = 10 menit)",
            example: 600,
          },
          expires_at: {
            type: "string",
            format: "date-time",
            description: "Waktu kadaluarsa",
            example: "2024-01-15T08:10:00Z",
          },
          usage_instructions: {
            type: "string",
            description: "Petunjuk penggunaan QR Code",
            example: "Scan QR code within 600 seconds for Check-in",
          },
        },
      },
      // Dashboard Schemas
      DashboardSummary: {
        type: "object",
        properties: {
          date: { type: "string", format: "date", example: "2024-01-15" },
          today_attendance: {
            type: "object",
            properties: {
              total_checked_in: {
                type: "integer",
                description: "Jumlah karyawan yang sudah check-in hari ini",
                example: 45,
              },
              ontime: {
                type: "integer",
                description: "Jumlah yang check-in tepat waktu",
                example: 38,
              },
              late: {
                type: "integer",
                description: "Jumlah yang check-in telat",
                example: 7,
              },
              checked_out: {
                type: "integer",
                description: "Jumlah yang sudah check-out",
                example: 30,
              },
              total_employees: {
                type: "integer",
                description: "Total karyawan aktif",
                example: 50,
              },
              attendance_rate: {
                type: "integer",
                description: "Persentase kehadiran hari ini",
                example: 90,
              },
            },
          },
          pending_leave_requests: {
            type: "integer",
            description: "Jumlah pengajuan cuti yang pending",
            example: 5,
          },
          active_qr_codes: {
            type: "integer",
            description: "Jumlah QR Code aktif",
            example: 3,
          },
        },
      },
      SendNotificationRequest: {
        type: "object",
        required: ["user_id", "title", "body"],
        properties: {
          user_id: {
            type: "integer",
            description: "ID user penerima notifikasi",
            example: 1,
          },
          title: {
            type: "string",
            maxLength: 100,
            example: "Pengumuman Penting",
          },
          body: {
            type: "string",
            maxLength: 500,
            example: "Besok ada rapat seluruh karyawan pukul 09:00",
          },
          data: {
            type: "object",
            additionalProperties: { type: "string" },
            description: "Data tambahan (key-value pair)",
            example: { type: "announcement", meeting_id: "123" },
          },
        },
      },
      BroadcastNotificationRequest: {
        type: "object",
        required: ["title", "body"],
        properties: {
          title: {
            type: "string",
            maxLength: 100,
            example: "Info Libur Nasional",
          },
          body: {
            type: "string",
            maxLength: 500,
            example:
              "Diumumkan bahwa tanggal 17 Agustus merupakan libur nasional",
          },
          data: {
            type: "object",
            additionalProperties: { type: "string" },
            example: { type: "holiday", date: "2024-08-17" },
          },
        },
      },
    },
    parameters: {
      LimitParam: {
        name: "limit",
        in: "query",
        schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
        description: "Jumlah data per halaman",
      },
      OffsetParam: {
        name: "offset",
        in: "query",
        schema: { type: "integer", default: 0, minimum: 0 },
        description: "Jumlah data yang dilewati",
      },
      QRTypeParam: {
        name: "type",
        in: "query",
        schema: {
          type: "string",
          enum: ["check_in", "check_out"],
          default: "check_in",
        },
        description: "Tipe QR Code (check-in atau check-out)",
      },
      QRTokenParam: {
        name: "token",
        in: "path",
        required: true,
        schema: { type: "string" },
        description: "Token QR Code (32 karakter)",
        example: "aB3dE5fG7hI9jK1lMn2oP3qR4sT5uV6w",
      },
    },
    responses: {
      UnauthorizedError: {
        description: "Authentication required",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              message: "Unauthorized: Missing or invalid token",
            },
          },
        },
      },
      ForbiddenError: {
        description: "Insufficient permissions",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              message: "Forbidden: Admin access required",
            },
          },
        },
      },
      NotFoundError: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: { success: false, message: "Resource not found" },
          },
        },
      },
      ValidationError: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: false },
                message: { type: "string", example: "Validation failed" },
                errors: { type: "object" },
              },
            },
          },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  tags: [
    {
      name: "Authentication",
      description: "Endpoint untuk login, registrasi, dan manajemen sesi",
    },
    {
      name: "User Management",
      description: "Endpoint untuk mengelola data user (Admin only)",
    },
    {
      name: "Attendance",
      description:
        "Endpoint untuk manajemen presensi karyawan (check-in/check-out)",
    },
    {
      name: "Leave Management",
      description: "Endpoint untuk pengajuan cuti, izin, dan sakit karyawan",
    },
    {
      name: "QR Code Management",
      description: "Endpoint untuk manajemen QR Code presensi (Admin only)",
    },
    {
      name: "Admin Dashboard",
      description: "Endpoint untuk dashboard dan laporan admin",
    },
    {
      name: "Admin Leave Management",
      description: "Endpoint admin untuk manajemen pengajuan cuti",
    },
    {
      name: "Admin Notifications",
      description: "Endpoint admin untuk mengirim notifikasi",
    },
  ],
  paths: {
    // Authentication Endpoints
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login user",
        description:
          "Login menggunakan email atau NIP dan password. Jika menyertakan fcm_token, token akan didaftarkan untuk notifikasi push.",
        operationId: "login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
              examples: {
                login_with_email: {
                  summary: "Login dengan email",
                  value: {
                    identifier: "budi.santoso@company.com",
                    password: "password123",
                  },
                },
                login_with_nip: {
                  summary: "Login dengan NIP",
                  value: {
                    identifier: "198502102010011001",
                    password: "password123",
                    fcm_token: "fcm_token_xyz",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
                example: {
                  success: true,
                  message: "Login successful",
                  data: {
                    user: {
                      id: 1,
                      nip: "198502102010011001",
                      name: "Budi Santoso",
                      email: "budi.santoso@company.com",
                      role: "employee",
                      created_at: "2024-01-15T08:00:00Z",
                      updated_at: "2024-01-15T08:00:00Z",
                    },
                    tokens: {
                      access_token: "eyJhbGciOiJIUzI1NiIs...",
                      refresh_token: "eyJhbGciOiJIUzI1NiIs...",
                      token_type: "Bearer",
                      expires_in: 86400,
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          500: { description: "Internal server error" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh access token",
        description: "Mendapatkan access token baru menggunakan refresh token",
        operationId: "refreshToken",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshTokenRequest" },
              example: { refresh_token: "eyJhbGciOiJIUzI1NiIs..." },
            },
          },
        },
        responses: {
          200: {
            description: "Token refreshed successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RefreshTokenResponse" },
                example: {
                  success: true,
                  data: {
                    access_token: "eyJhbGciOiJIUzI1NiIs...",
                    token_type: "Bearer",
                    expires_in: 86400,
                  },
                },
              },
            },
          },
          401: {
            description: "Invalid or expired refresh token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: { success: false, message: "Invalid refresh token" },
              },
            },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Logout user",
        description: "Menghapus FCM token dan mengakhiri sesi",
        operationId: "logout",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  fcm_token: {
                    type: "string",
                    description: "FCM token yang akan dihapus",
                  },
                },
              },
              example: { fcm_token: "fcm_token_xyz123" },
            },
          },
        },
        responses: {
          200: {
            description: "Logout successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: { type: "string", example: "Logout successful" },
                  },
                },
              },
            },
          },
          500: { $ref: "#/components/responses/UnauthorizedError" },
        },
      },
    },
    "/auth/profile": {
      get: {
        tags: ["Authentication"],
        summary: "Get user profile",
        description: "Mendapatkan data profil user yang sedang login",
        operationId: "getProfile",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Profile retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/User" },
                  },
                },
                example: {
                  success: true,
                  data: {
                    id: 1,
                    nip: "198502102010011001",
                    name: "Budi Santoso",
                    email: "budi.santoso@company.com",
                    role: "employee",
                    created_at: "2024-01-15T08:00:00Z",
                    updated_at: "2024-01-15T08:00:00Z",
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },
    "/auth/change-password": {
      post: {
        tags: ["Authentication"],
        summary: "Change password",
        description: "Mengubah password user yang sedang login",
        operationId: "changePassword",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
              example: {
                current_password: "oldpassword123",
                new_password: "newpassword123",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Password changed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Password changed successfully",
                    },
                  },
                },
              },
            },
          },
          400: {
            description: "Current password is incorrect",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
                example: {
                  success: false,
                  message: "Current password is incorrect",
                },
              },
            },
          },
          401: { $ref: "#/components/responses/UnauthorizedError" },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["User Management"],
        summary: "Register new user",
        description: "Mendaftarkan user baru (Admin only)",
        operationId: "registerUser",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
              examples: {
                register_employee: {
                  summary: "Daftarkan karyawan baru",
                  value: {
                    nip: "199005152015021002",
                    name: "Siti Aminah",
                    email: "siti.aminah@company.com",
                    password: "password123",
                    role: "employee",
                  },
                },
                register_admin: {
                  summary: "Daftarkan admin baru",
                  value: {
                    nip: "198001012005011001",
                    name: "Admin Utama",
                    email: "admin@company.com",
                    password: "admin123",
                    role: "admin",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "User registered successfully",
                    },
                    data: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          400: {
            description: "Validation error or duplicate NIP/email",
            content: {
              "application/json": {
                schema: { $ref: "#/components/responses/ValidationError" },
              },
            },
          },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/auth/seed": {
      get: {
        tags: ["Authentication"],
        summary: "Seed initial data",
        description:
          "Menjalankan seeder untuk membuat admin default dan lokasi (Development only)",
        operationId: "seedData",
        responses: {
          200: {
            description: "Seeder executed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Seeder executed" },
                  },
                },
              },
            },
          },
        },
      },
    },
    // Attendance Endpoints
    "/attendance/check-in": {
      post: {
        tags: ["Attendance"],
        summary: "Check-in dengan GPS",
        description:
          "Melakukan check-in dengan foto selfie dan verifikasi lokasi GPS.",
        operationId: "checkIn",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["location_id", "latitude", "longitude", "photo"],
                properties: {
                  location_id: {
                    type: "integer",
                    description: "ID lokasi presensi",
                    example: 1,
                  },
                  latitude: {
                    type: "number",
                    format: "float",
                    description: "Latitude posisi karyawan (WGS84)",
                    example: -6.2088,
                  },
                  longitude: {
                    type: "number",
                    format: "float",
                    description: "Longitude posisi karyawan (WGS84)",
                    example: 106.8456,
                  },
                  method: {
                    type: "string",
                    enum: ["gps", "qr_code"],
                    default: "gps",
                    description: "Metode presensi",
                    example: "gps",
                  },
                  photo: {
                    type: "string",
                    format: "binary",
                    description:
                      "Foto selfie (max 5MB, format: JPG, PNG, WEBP)",
                  },
                },
              },
              examples: {
                ontime_checkin: {
                  summary: "Check-in tepat waktu",
                  value: {
                    location_id: 1,
                    latitude: -6.2088,
                    longitude: 106.8456,
                    method: "gps",
                    photo: "[binary file]",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Check-in successful",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Check-in successful",
                  data: {
                    attendance: {
                      id: 123,
                      checkIn: "2024-01-15T08:00:00Z",
                      status: "ontime",
                      method: "gps",
                      photoUrl: "https://cdn.cloudflareR2...",
                    },
                    distance: 15.5,
                    status: "ontime",
                    location_name: "Kantor Pusat Jakarta",
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
          404: { $ref: "#/components/responses/NotFoundError" },
          500: { description: "Internal server error" },
        },
      },
    },
    "/attendance/check-out": {
      post: {
        tags: ["Attendance"],
        summary: "Check-out dengan GPS",
        description: "Melakukan check-out dengan verifikasi lokasi GPS.",
        operationId: "checkOut",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: [
                  "attendance_id",
                  "location_id",
                  "latitude",
                  "longitude",
                ],
                properties: {
                  attendance_id: {
                    type: "integer",
                    description: "ID attendance record",
                    example: 123,
                  },
                  location_id: {
                    type: "integer",
                    description: "ID lokasi check-out",
                    example: 1,
                  },
                  latitude: {
                    type: "number",
                    format: "float",
                    description: "Latitude posisi karyawan",
                    example: -6.2088,
                  },
                  longitude: {
                    type: "number",
                    format: "float",
                    description: "Longitude posisi karyawan",
                    example: 106.8456,
                  },
                  photo: {
                    type: "string",
                    format: "binary",
                    description: "Foto check-out (opsional)",
                  },
                },
              },
              example: {
                attendance_id: 123,
                location_id: 1,
                latitude: -6.2088,
                longitude: 106.8456,
                photo: "[binary file]",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Check-out successful",
            content: {
              "application/json": {
                example: {
                  success: true,
                  message: "Check-out successful",
                  data: {
                    attendance: {
                      id: 123,
                      checkOut: "2024-01-15T17:00:00Z",
                      workingHours: 8.5,
                    },
                    distance: 12.3,
                    working_hours: "8.50",
                    working_hours_formatted: "8 jam 30 menit",
                    location_name: "Kantor Pusat Jakarta",
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/schemas/ErrorResponse" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },
    "/attendance/scan-qr": {
      post: {
        tags: ["Attendance"],
        summary: "Scan QR Code dengan foto",
        description: "Melakukan check-in atau check-out dengan scan QR Code.",
        operationId: "scanQRWithPhoto",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["qr_token", "photo"],
                properties: {
                  qr_token: {
                    type: "string",
                    description: "Token dari QR Code yang discan",
                    example: "aB3dE5fG7hI9jK1lMn2oP3qR4sT5uV6w",
                  },
                  photo: {
                    type: "string",
                    format: "binary",
                    description:
                      "Foto selfie (max 5MB, format: JPG, PNG, WEBP)",
                  },
                  type: {
                    type: "string",
                    enum: ["check_in", "check_out"],
                    description:
                      "Tipe presensi (opsional, akan diambil dari QR jika tidak disediakan)",
                    example: "check_in",
                  },
                  latitude: {
                    type: "number",
                    format: "float",
                    description:
                      "Latitude posisi karyawan (opsional untuk logging)",
                    example: -6.2088,
                  },
                  longitude: {
                    type: "number",
                    format: "float",
                    description:
                      "Longitude posisi karyawan (opsional untuk logging)",
                    example: 106.8456,
                  },
                },
              },
              examples: {
                qr_checkin: {
                  summary: "QR Check-in",
                  value: {
                    qr_token: "aB3dE5fG7hI9jK1lMn2oP3qR4sT5uV6w",
                    type: "check_in",
                    photo: "[binary file]",
                    latitude: -6.2088,
                    longitude: 106.8456,
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "QR Check-in successful" },
          200: { description: "QR Check-out successful" },
          400: { $ref: "#/components/schemas/ErrorResponse" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/attendance/history": {
      get: {
        tags: ["Attendance"],
        summary: "Get attendance history",
        description: "Mendapatkan riwayat presensi karyawan per bulan",
        operationId: "getAttendanceHistory",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "month",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 12, default: 1 },
            example: 1,
          },
          {
            name: "year",
            in: "query",
            schema: {
              type: "integer",
              minimum: 2020,
              maximum: 2030,
              default: 2024,
            },
            example: 2024,
          },
          { $ref: "#/components/parameters/LimitParam" },
          { $ref: "#/components/parameters/OffsetParam" },
        ],
        responses: {
          200: { description: "History retrieved successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/attendance/today-status": {
      get: {
        tags: ["Attendance"],
        summary: "Get today's attendance status",
        description: "Mengecek apakah sudah check-in hari ini",
        operationId: "getTodayStatus",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Status retrieved successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/attendance/active": {
      get: {
        tags: ["Attendance"],
        summary: "Get active attendance",
        description: "Mendapatkan data presensi aktif (belum check-out)",
        operationId: "getActiveAttendance",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Active attendance retrieved successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    // Leave Management Endpoints
    "/leave/request": {
      post: {
        tags: ["Leave Management"],
        summary: "Create leave request",
        description: "Membuat pengajuan cuti/izin/sakit.",
        operationId: "createLeaveRequest",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/CreateLeaveRequestInput" },
              examples: {
                leave_cuti: {
                  summary: "Pengajuan cuti",
                  value: {
                    type: "cuti",
                    start_date: "2024-02-01",
                    end_date: "2024-02-05",
                    reason: "Liburan keluarga ke Bali selama 5 hari",
                    attachment: "[binary file]",
                  },
                },
                leave_sakit: {
                  summary: "Pengajuan sakit dengan surat dokter",
                  value: {
                    type: "sakit",
                    start_date: "2024-02-10",
                    end_date: "2024-02-12",
                    reason: "Demam tinggi dan harus istirahat total",
                    attachment: "[surat_dokter.pdf]",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Leave request submitted successfully" },
          400: { $ref: "#/components/schemas/ErrorResponse" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/leave/history": {
      get: {
        tags: ["Leave Management"],
        summary: "Get leave history",
        description: "Mendapatkan riwayat pengajuan cuti/izin/sakit karyawan",
        operationId: "getLeaveHistory",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["pending", "approved", "rejected"],
            },
            example: "approved",
          },
          {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["cuti", "izin", "sakit"] },
            example: "cuti",
          },
          { $ref: "#/components/parameters/LimitParam" },
          { $ref: "#/components/parameters/OffsetParam" },
        ],
        responses: {
          200: { description: "Leave history retrieved successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/leave/quota": {
      get: {
        tags: ["Leave Management"],
        summary: "Check leave quota",
        description:
          "Mendapatkan informasi sisa kuota cuti/izin/sakit untuk tahun berjalan",
        operationId: "checkLeaveQuota",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Leave quota retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        year: { type: "integer", example: 2024 },
                        quotas: { $ref: "#/components/schemas/LeaveQuota" },
                        pending_days: {
                          type: "integer",
                          description:
                            "Total hari pengajuan yang masih pending",
                          example: 3,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/leave/{id}": {
      get: {
        tags: ["Leave Management"],
        summary: "Get leave request detail",
        description: "Mendapatkan detail pengajuan cuti berdasarkan ID",
        operationId: "getLeaveDetail",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "ID pengajuan cuti",
            example: 1,
          },
        ],
        responses: {
          200: { description: "Leave detail retrieved successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
      delete: {
        tags: ["Leave Management"],
        summary: "Cancel leave request",
        description: "Membatalkan pengajuan cuti yang masih berstatus pending",
        operationId: "cancelLeaveRequest",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "ID pengajuan cuti",
            example: 1,
          },
        ],
        responses: {
          200: { description: "Leave request cancelled successfully" },
          400: { $ref: "#/components/schemas/ErrorResponse" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },
    // QR Code Management Endpoints
    "/qr/generate/{locationId}": {
      get: {
        tags: ["QR Code Management"],
        summary: "Generate QR code for specific location",
        description: "Men-generate QR Code untuk presensi di lokasi tertentu.",
        operationId: "generateQRCode",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "locationId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "ID lokasi presensi",
            example: 1,
          },
          { $ref: "#/components/parameters/QRTypeParam" },
        ],
        responses: {
          200: { description: "QR Code generated successfully" },
          400: { $ref: "#/components/schemas/ErrorResponse" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
          404: { $ref: "#/components/responses/NotFoundError" },
          500: { description: "Internal server error" },
        },
      },
    },
    "/qr/generate-all": {
      get: {
        tags: ["QR Code Management"],
        summary: "Generate QR codes for all locations",
        description: "Men-generate QR Code untuk SEMUA lokasi sekaligus.",
        operationId: "generateAllQRCodes",
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/QRTypeParam" }],
        responses: {
          200: { description: "QR Codes generated successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
          404: { description: "No locations found" },
        },
      },
    },
    "/qr/active": {
      get: {
        tags: ["QR Code Management"],
        summary: "List active QR codes",
        description:
          "Mendapatkan daftar semua QR Code yang masih aktif (belum kadaluarsa)",
        operationId: "listActiveQRCodes",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Active QR codes retrieved successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/qr/history": {
      get: {
        tags: ["QR Code Management"],
        summary: "Get QR code generation history",
        description: "Mendapatkan histori pembuatan QR Code.",
        operationId: "getQRHistory",
        security: [{ BearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/LimitParam" },
          { $ref: "#/components/parameters/OffsetParam" },
        ],
        responses: {
          200: { description: "QR history retrieved successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/qr/revoke/{token}": {
      delete: {
        tags: ["QR Code Management"],
        summary: "Revoke QR code",
        description:
          "Mencabut QR Code secara manual sebelum masa berlakunya habis.",
        operationId: "revokeQRCode",
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/QRTokenParam" }],
        responses: {
          200: { description: "QR code revoked successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
          404: { description: "QR code not found or already expired" },
        },
      },
    },
    "/qr/validate/{token}": {
      get: {
        tags: ["QR Code Management"],
        summary: "Validate QR token",
        description:
          "Memvalidasi apakah QR token masih valid (belum kadaluarsa).",
        operationId: "validateQRToken",
        security: [{ BearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/QRTokenParam" }],
        responses: {
          200: { description: "QR token is valid" },
          400: { $ref: "#/components/schemas/ErrorResponse" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          500: { description: "Internal server error" },
        },
      },
    },
    // Admin Dashboard Endpoints
    "/admin/dashboard": {
      get: {
        tags: ["Admin Dashboard"],
        summary: "Get dashboard summary",
        description: "Mendapatkan ringkasan data untuk dashboard admin",
        operationId: "getDashboard",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Dashboard data retrieved successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/admin/rekap": {
      get: {
        tags: ["Admin Dashboard"],
        summary: "Get attendance recap",
        description: "Mendapatkan rekap presensi lengkap per bulan.",
        operationId: "getAttendanceRecap",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "month",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 12, default: 1 },
            example: 1,
          },
          {
            name: "year",
            in: "query",
            schema: {
              type: "integer",
              minimum: 2020,
              maximum: 2030,
              default: 2024,
            },
            example: 2024,
          },
          {
            name: "location_id",
            in: "query",
            schema: { type: "integer" },
            description: "Filter data berdasarkan lokasi",
            example: 1,
          },
        ],
        responses: {
          200: { description: "Attendance recap retrieved successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/admin/daily-report": {
      get: {
        tags: ["Admin Dashboard"],
        summary: "Get daily report",
        description:
          "Mendapatkan laporan harian untuk export, memisahkan karyawan hadir dan tidak hadir",
        operationId: "getDailyReport",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "date",
            in: "query",
            schema: { type: "string", format: "date" },
            description: "Tanggal laporan (default: hari ini)",
            example: "2024-01-15",
          },
        ],
        responses: {
          200: { description: "Daily report retrieved successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/admin/employees": {
      get: {
        tags: ["Admin Dashboard"],
        summary: "Get employee list",
        description:
          "Mendapatkan daftar semua karyawan dengan ringkasan kehadiran",
        operationId: "getEmployees",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Pencarian berdasarkan nama, email, atau NIP",
            example: "Budi",
          },
          { $ref: "#/components/parameters/LimitParam" },
          { $ref: "#/components/parameters/OffsetParam" },
        ],
        responses: {
          200: { description: "Employee list retrieved successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/admin/employees/{employeeId}/report": {
      get: {
        tags: ["Admin Dashboard"],
        summary: "Get employee detailed report",
        description:
          "Mendapatkan laporan lengkap per karyawan termasuk riwayat presensi dan cuti",
        operationId: "getEmployeeReport",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "employeeId",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "ID karyawan",
            example: 1,
          },
          {
            name: "month",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 12, default: 1 },
            example: 1,
          },
          {
            name: "year",
            in: "query",
            schema: {
              type: "integer",
              minimum: 2020,
              maximum: 2030,
              default: 2024,
            },
            example: 2024,
          },
        ],
        responses: {
          200: { description: "Employee report retrieved successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },
    // Admin Leave Management Endpoints
    "/admin/leave-requests": {
      get: {
        tags: ["Admin Leave Management"],
        summary: "Get all leave requests",
        description: "Mendapatkan semua pengajuan cuti/izin/sakit (Admin only)",
        operationId: "getLeaveRequests",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["pending", "approved", "rejected"],
            },
            example: "pending",
          },
          {
            name: "type",
            in: "query",
            schema: { type: "string", enum: ["cuti", "izin", "sakit"] },
            example: "cuti",
          },
          { $ref: "#/components/parameters/LimitParam" },
          { $ref: "#/components/parameters/OffsetParam" },
        ],
        responses: {
          200: { description: "Leave requests retrieved successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/admin/leave-requests/{id}": {
      patch: {
        tags: ["Admin Leave Management"],
        summary: "Update leave request status",
        description: "Menyetujui atau menolak pengajuan cuti (Admin only)",
        operationId: "updateLeaveRequest",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "ID pengajuan cuti",
            example: 1,
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["approved", "rejected"],
                    description: "Status yang akan diupdate",
                    example: "approved",
                  },
                  rejection_reason: {
                    type: "string",
                    description: "Wajib diisi jika status = rejected",
                    example: "Dokumen pendukung tidak lengkap",
                  },
                },
              },
              examples: {
                approve: {
                  summary: "Menyetujui pengajuan",
                  value: { status: "approved" },
                },
                reject: {
                  summary: "Menolak pengajuan dengan alasan",
                  value: {
                    status: "rejected",
                    rejection_reason: "Dokumen pendukung tidak lengkap",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Leave request updated successfully" },
          400: { $ref: "#/components/schemas/ErrorResponse" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },
    // Admin Notifications Endpoints
    "/admin/send-notification": {
      post: {
        tags: ["Admin Notifications"],
        summary: "Send notification to specific user",
        description: "Mengirim notifikasi push ke user tertentu (Admin only)",
        operationId: "sendNotification",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SendNotificationRequest" },
              example: {
                user_id: 1,
                title: "Pengumuman Penting",
                body: "Besok ada rapat seluruh karyawan pukul 09:00",
                data: { type: "announcement", meeting_id: "123" },
              },
            },
          },
        },
        responses: {
          200: { description: "Notification sent successfully" },
          400: { $ref: "#/components/schemas/ErrorResponse" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/admin/broadcast": {
      post: {
        tags: ["Admin Notifications"],
        summary: "Broadcast notification to all employees",
        description:
          "Mengirim notifikasi broadcast ke semua karyawan melalui topic FCM (Admin only)",
        operationId: "broadcastNotification",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/BroadcastNotificationRequest",
              },
              example: {
                title: "Info Libur Nasional",
                body: "Diumumkan bahwa tanggal 17 Agustus merupakan libur nasional",
                data: { type: "holiday", date: "2024-08-17" },
              },
            },
          },
        },
        responses: {
          200: { description: "Broadcast notification sent successfully" },
          401: { $ref: "#/components/responses/UnauthorizedError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
  },
};

// Export untuk digunakan di Node.js (CommonJS)
if (typeof module !== "undefined" && module.exports) {
  module.exports = openapiSpec;
}

// Export untuk digunakan di browser (ES6)
if (typeof window !== "undefined") {
  window.openapiSpec = openapiSpec;
}
