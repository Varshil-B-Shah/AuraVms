# Document Approval System

A full-stack document approval workflow system built with Next.js, Express.js, and TypeScript. This application allows writers to submit documents for review and managers to approve or reject submissions via a web dashboard or email links.

## 🚀 Features

### Writer Features
- **Document Upload**: Support for `.txt`, `.md`, and `.docx` files (max 10MB)
- **Document Parsing**: Automatic extraction of title, content, and image references
- **Embedded Images**: Support for DOCX files with embedded images (converted to base64)
- **Submission Dashboard**: View all submissions with status filters (Pending, Approved, Rejected)
- **Real-time Status**: Track submission status changes
- **Delete Submissions**: Remove unwanted submissions

### Manager Features
- **Approval Dashboard**: Review all pending submissions
- **Email Notifications**: Receive approval requests via email with one-click approve/reject links
- **Secure Email Links**: Token-based authentication for email actions
- **Web Interface**: Approve/reject submissions through the dashboard
- **Content Preview**: View submission details with content truncation
- **Image Display**: Preview image references and embedded images

### Technical Features
- **JWT Authentication**: Secure role-based access control (Writer/Manager)
- **RESTful API**: Clean API design with proper HTTP status codes
- **Email Service**: SMTP integration with HTML/text email templates
- **File Storage**: JSON-based persistent storage
- **Comprehensive Tests**: 81 test cases covering all modules
- **TypeScript**: Full type safety across frontend and backend
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS
- **Error Handling**: Graceful error handling and user feedback

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **SMTP Server**: For email notifications (Gmail, SendGrid, etc.)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd "Internship Assignment"
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env.local` file in the backend directory:
```env
PORT=3001
BASE_URL=http://localhost:3001

JWT_SECRET=your-super-secret-jwt-key-change-in-production
EMAIL_SECRET=your-email-token-secret-key

WRITER_EMAIL=writer@example.com
WRITER_PASSWORD=writer123
MANAGER_EMAIL_AUTH=manager@example.com
MANAGER_PASSWORD=manager123

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

FROM_EMAIL=your-email@gmail.com
MANAGER_EMAIL=manager@example.com

NODE_ENV=development
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Create a `.env.local` file in the frontend directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Server will start at `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Application will be available at `http://localhost:3000`

### Production Mode

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

**Test Coverage:**
- ✅ 81 tests passing
- Parser Module: Document parsing and validation
- Storage Module: CRUD operations and persistence
- Workflow Module: Business logic and state transitions
- Email Service: Email sending and HTML safety

## 📡 API Endpoints

### Authentication
- `POST /api/login` - User login (Writer/Manager)
- `POST /api/logout` - User logout
- `GET /api/me` - Get current user info

### Document Management (Writer)
- `POST /api/upload` - Upload and parse document
- `POST /api/submit` - Submit document for approval
- `GET /api/submissions` - Get all submissions (filtered by user)
- `GET /api/submissions/:id` - Get specific submission
- `DELETE /api/submissions/:id` - Delete submission

### Approval Management (Manager)
- `GET /api/submissions/pending` - Get pending submissions
- `GET /api/approve?post_id=<id>` - Approve submission
- `GET /api/reject?post_id=<id>` - Reject submission

### Email Actions (No Auth Required)
- `GET /api/email/approve?token=<token>` - Approve via email link
- `GET /api/email/reject?token=<token>` - Reject via email link

### Health Check
- `GET /api/health` - Server health status

## 👥 Default Users

### Writer Account
- **Email**: `writer@example.com`
- **Password**: `writer123`

### Manager Account
- **Email**: `manager@example.com`
- **Password**: `manager123`

## 📁 Project Structure

```
Internship Assignment/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── parser/        # Document parsing logic
│   │   │   ├── storage/       # JSON file storage
│   │   │   ├── workflow/      # Business logic
│   │   │   └── emailer/       # Email service
│   │   ├── types/             # TypeScript type definitions
│   │   └── index.ts           # Express server
│   ├── tests/                 # Jest test suites
│   ├── data/                  # JSON storage (auto-generated)
│   ├── uploads/               # Temporary file uploads
│   └── package.json
├── frontend/
│   ├── app/                   # Next.js 16 app directory
│   │   ├── (auth)/           # Authentication routes
│   │   ├── writer/           # Writer dashboard
│   │   ├── manager/          # Manager dashboard
│   │   └── api/              # API route handlers
│   ├── components/           # Reusable React components
│   ├── lib/                  # Utility functions
│   └── package.json
├── test-files/               # Sample documents for testing
├── Postman_Collection.json   # API testing collection
└── README.md
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Token Blacklisting**: Logout invalidates tokens
- **Role-Based Access Control**: Separate Writer/Manager permissions
- **HMAC Token Signatures**: Secure email action links
- **HTML Sanitization**: XSS prevention in email templates
- **Cookie Security**: HttpOnly, Secure, SameSite flags
- **Input Validation**: File type and size restrictions
- **Password Protection**: Environment-based credentials

## 🎨 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js 5
- **Language**: TypeScript
- **Authentication**: JWT (jsonwebtoken)
- **Email**: Nodemailer
- **File Upload**: Multer
- **Document Parsing**: Mammoth (DOCX)
- **Testing**: Jest, Supertest

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Components**: Radix UI, Shadcn/ui
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **State Management**: React Context
- **Notifications**: Sonner

## 📧 Email Configuration

### Gmail Setup
1. Enable 2-Factor Authentication in your Google Account
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App Passwords
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password
3. Use this password in `SMTP_PASS` environment variable

### Other SMTP Providers
- **SendGrid**: Use API key in `SMTP_PASS`
- **Mailgun**: Configure SMTP credentials
- **AWS SES**: Use SMTP credentials from AWS Console

## 🐛 Troubleshooting

### Backend Issues

**Port Already in Use:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill
```

**Email Not Sending:**
- Verify SMTP credentials in `.env.local`
- Check Gmail App Password is correct
- Ensure `FROM_EMAIL` and `MANAGER_EMAIL` are set
- Check firewall/antivirus blocking SMTP port 587

**Tests Failing:**
```bash
cd backend
rm -rf node_modules
npm install
npm test
```

### Frontend Issues

**API Connection Failed:**
- Verify backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure CORS is properly configured

**Build Errors:**
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

## 📝 API Usage Examples

### Login
```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"writer@example.com","password":"writer123"}'
```

### Upload Document
```bash
curl -X POST http://localhost:3001/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.txt"
```

### Submit for Approval
```bash
curl -X POST http://localhost:3001/api/submit \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Article Title","content":"Article content..."}'
```

## 🚧 Future Enhancements

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] File storage service (AWS S3, Cloudinary)
- [ ] Real-time notifications (WebSockets)
- [ ] Rich text editor for submissions
- [ ] Multiple manager approval workflow
- [ ] Submission comments and feedback
- [ ] Document versioning
- [ ] Advanced search and filtering
- [ ] Analytics dashboard
- [ ] Email templates customization

## 📄 License

This project is created for internship assignment purposes.

## 👤 Author

Developed as part of an internship assignment to demonstrate full-stack development skills with modern web technologies.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Shadcn/ui for beautiful UI components
- The TypeScript community for excellent tooling
