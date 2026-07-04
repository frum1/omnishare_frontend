# OmniShare API Schema

Complete API documentation for the OmniShare file sharing service.

## Overview

- **Base URL**: `http://localhost:8000` (or your PUBLIC_BASE_URL)
- **Content-Type**: `application/json` (unless specified otherwise)
- **Auth**: JWT Bearer token in `Authorization: Bearer <token>` header

## Authentication

All endpoints except `/health`, `/f/{file_id}`, and `/auth/login` require authentication.

### Obtaining a Token

**Endpoint**: `POST /auth/login`

**Content-Type**: `application/x-www-form-urlencoded`

**Request Body**:
```
username=<username>
password=<password>
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

**Status Codes**:
- `200`: Login successful
- `401`: Incorrect username or password

---

## Data Types

### User
```json
{
  "id": "string (uuid hex)",
  "username": "string",
  "is_admin": "boolean",
  "must_change_password": "boolean",
  "created_at": "ISO 8601 datetime"
}
```

### File (FileOut)
```json
{
  "id": "string (uuid hex)",
  "original_filename": "string",
  "content_type": "string (MIME type)",
  "size_bytes": "integer",
  "caption": "string | null",
  "created_at": "ISO 8601 datetime",
  "expires_at": "ISO 8601 datetime | null",
  "max_downloads": "integer | null",
  "download_count": "integer",
  "public_url": "string (full URL)",
  "local_url": "string (full URL)"
}
```

### Settings
```json
{
  "public_base_url": "string",
  "local_base_url": "string",
  "local_port": "integer",
  "max_file_size_mb": "integer",
  "cleanup_interval_minutes": "integer"
}
```

---

## Endpoints

### Authentication

#### Change Password
**Endpoint**: `POST /auth/change-password`

**Auth**: Required (current user must have `must_change_password=true` to use this, but can use other endpoints via the API)

**Request Body**:
```json
{
  "new_password": "string (non-empty)"
}
```

**Response**: `204 No Content`

**Status Codes**:
- `204`: Password changed successfully
- `400`: new_password is empty
- `401`: Unauthorized

---

### Files (User)

All file endpoints require authentication. Users can only see/modify their own files unless they are admins.

#### Upload File
**Endpoint**: `POST /api/files`

**Auth**: Required

**Content-Type**: `multipart/form-data`

**Request Body**:
- `file` (required): File to upload
- `ttl_seconds` (optional, integer): Time-to-live in seconds. `0` or omitted = infinite. Negative values rejected.
- `max_downloads` (optional, integer): Maximum number of downloads before auto-delete. `0` or omitted = infinite. Negative values rejected.
- `caption` (optional, string): Human-readable description of the file

**Response** (201 Created):
```json
{
  "id": "abc123...",
  "original_filename": "document.pdf",
  "content_type": "application/pdf",
  "size_bytes": 1024000,
  "caption": "Annual report",
  "created_at": "2026-07-04T12:00:00",
  "expires_at": "2026-07-11T12:00:00",
  "max_downloads": 5,
  "download_count": 0,
  "public_url": "https://example.com/f/abc123...",
  "local_url": "http://192.168.1.10:8000/f/abc123..."
}
```

**Status Codes**:
- `201`: File uploaded successfully
- `401`: Unauthorized
- `413`: File exceeds maximum size
- `400`: Invalid ttl_seconds or max_downloads

#### List Files
**Endpoint**: `GET /api/files`

**Auth**: Required

**Query Parameters**: None

**Response** (200 OK):

**If user is not admin**:
```json
[
  { /* FileOut */ },
  { /* FileOut */ }
]
```

**If user is admin**:
```json
{
  "user_id_1": [
    { /* FileOut */ },
    { /* FileOut */ }
  ],
  "user_id_2": [
    { /* FileOut */ }
  ]
}
```

**Status Codes**:
- `200`: List retrieved successfully
- `401`: Unauthorized

#### Update File Caption
**Endpoint**: `PATCH /api/files/{file_id}`

**Auth**: Required (owner or admin)

**Request Body**:
```json
{
  "caption": "string | null"
}
```

**Response** (200 OK):
```json
{
  /* FileOut */
}
```

**Status Codes**:
- `200`: Caption updated successfully
- `401`: Unauthorized
- `403`: Not the file owner (and not admin)
- `404`: File not found

#### Delete File
**Endpoint**: `DELETE /api/files/{file_id}`

**Auth**: Required (owner or admin)

**Response**: `204 No Content`

**Status Codes**:
- `204`: File deleted successfully
- `401`: Unauthorized
- `403`: Not the file owner (and not admin)
- `404`: File not found

---

### Download File

#### Download
**Endpoint**: `GET /f/{file_id}`

**Auth**: Not required (public endpoint)

**Response**: File binary data with appropriate `Content-Type` and `Content-Disposition: attachment` headers

**Behavior**:
- Increments `download_count` on successful download
- Auto-deletes the file if `max_downloads` limit is reached
- Returns `410 Gone` if the file has expired (by TTL or download limit)

**Status Codes**:
- `200`: File downloaded successfully
- `404`: File not found
- `410`: File has expired

---

### Users (Admin Only)

All user management endpoints require admin authentication.

#### Create User
**Endpoint**: `POST /admin/users`

**Auth**: Required (admin only)

**Request Body**:
```json
{
  "username": "string",
  "password": "string",
  "is_admin": "boolean (default: true)"
}
```

**Response** (201 Created):
```json
{
  /* UserOut */
}
```

**Status Codes**:
- `201`: User created successfully
- `401`: Unauthorized
- `403`: Not an admin
- `409`: User already exists

#### List Users
**Endpoint**: `GET /admin/users`

**Auth**: Required (admin only)

**Response** (200 OK):
```json
[
  { /* UserOut */ },
  { /* UserOut */ }
]
```

**Status Codes**:
- `200`: List retrieved successfully
- `401`: Unauthorized
- `403`: Not an admin

#### Reset User Password
**Endpoint**: `POST /admin/users/{user_id}/reset-password`

**Auth**: Required (admin only)

**Request Body**: Empty

**Response** (200 OK):
```json
{
  "username": "john",
  "temporary_password": "aBc1234XyZ9"
}
```

The user must change this temporary password on next login. They will be required to use the `/auth/change-password` endpoint.

**Status Codes**:
- `200`: Password reset successfully
- `401`: Unauthorized
- `403`: Not an admin
- `404`: User not found

#### Delete User
**Endpoint**: `DELETE /admin/users/{user_id}`

**Auth**: Required (admin only)

**Request Body**: Empty

**Response**: `204 No Content`

**Behavior**:
- Deletes the user and all their uploaded files
- Cannot delete your own account

**Status Codes**:
- `204`: User deleted successfully
- `401`: Unauthorized
- `403`: Not an admin (or trying to delete self)
- `404`: User not found

---

### Settings (Admin Only)

All settings endpoints require admin authentication.

#### Get Current Settings
**Endpoint**: `GET /admin/settings`

**Auth**: Required (admin only)

**Response** (200 OK):
```json
{
  "public_base_url": "https://example.com",
  "local_base_url": "http://192.168.1.10:8000",
  "local_port": 8000,
  "max_file_size_mb": 1024,
  "cleanup_interval_minutes": 30
}
```

**Status Codes**:
- `200`: Settings retrieved successfully
- `401`: Unauthorized
- `403`: Not an admin

#### Update Settings
**Endpoint**: `POST /admin/settings`

**Auth**: Required (admin only)

**Request Body** (all fields optional, only provided fields are updated):
```json
{
  "public_base_url": "https://new-domain.com",
  "local_base_url": "http://192.168.1.100:8000",
  "local_port": 9000,
  "max_file_size_mb": 2048,
  "cleanup_interval_minutes": 60
}
```

**Response** (200 OK):
```json
{
  /* Updated NetworkSettingsOut */
}
```

**Validation**:
- `public_base_url`: Cannot be empty
- `local_port`: Must be between 1 and 65535
- `max_file_size_mb`: Must be positive
- `cleanup_interval_minutes`: Must be at least 1

**Status Codes**:
- `200`: Settings updated successfully
- `400`: Validation error
- `401`: Unauthorized
- `403`: Not an admin

**Note**: Settings are persisted to the `.env` file and take effect immediately (except port, which requires restart).

---

### Health Check

#### Health
**Endpoint**: `GET /health`

**Auth**: Not required

**Response** (200 OK):
```json
{
  "status": "ok"
}
```

---

## Error Responses

All errors return a JSON object with a `detail` field:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (authenticated but insufficient permissions)
- `404`: Not Found
- `409`: Conflict (e.g., user already exists)
- `410`: Gone (expired file)
- `413`: Payload Too Large (file exceeds max size)

---

## Notes

### JWT Token Expiry

Access tokens expire after `ACCESS_TOKEN_EXPIRE_MINUTES` (default 1440 = 24 hours). Upon expiry, the user must log in again via `/auth/login`.

### URL Generation

`public_url` and `local_url` are generated based on the file ID and current settings. The `public_url` uses `PUBLIC_BASE_URL`, while `local_url` auto-detects the server's LAN IP.

### Admin Access

Admin users can:
- View all files (grouped by owner)
- Manage other users (create, list, reset password, delete)
- Update system settings

Regular users can:
- Upload and manage their own files
- View only their own files
- Change their own password if marked as `must_change_password`

### File Expiration

Files can expire in two ways:
1. **TTL**: If `expires_at` has passed
2. **Download limit**: If `download_count` >= `max_downloads`

When a public link for an expired file is accessed, it returns `410 Gone` and the file is deleted from the server.

### Streaming Uploads

Large file uploads are streamed in chunks (configurable via `UPLOAD_CHUNK_SIZE_KB`). The server will reject uploads exceeding `MAX_FILE_SIZE_MB` mid-stream without waiting for the full file.
