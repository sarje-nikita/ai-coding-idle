# DeepAgent SaaS Setup Guide

## ✅ Completed Implementation

### Frontend
- ✅ Clerk authentication setup in main.tsx
- ✅ Landing page with login/signup
- ✅ Dashboard with workspace management
- ✅ React Router setup for authenticated/unauthenticated flows
- ✅ Environment variables configured (.env.local)

### Backend
- ✅ SQLite database models (User, Workspace)
- ✅ Workspace API endpoints (GET, POST, DELETE)
- ✅ Clerk token verification middleware
- ✅ Environment variables configured (.env)

### Features
- ✅ User authentication with Clerk
- ✅ Multiple workspaces per user
- ✅ Create, list, and delete workspaces
- ✅ URL-based workspace switching (space_id parameter)
- ✅ Persistent database storage

---

## 🚀 Installation Steps

### 1. Frontend Dependencies
Run in `/frontend` directory:
```bash
npm install @clerk/react react-router-dom
```

### 2. Backend Dependencies
Run in `/backend` directory:
```bash
pip install sqlalchemy pydantic
```
Or if using requirements.txt:
```bash
pip install -r requirements.txt
```

### 3. Set Up Clerk
1. Go to https://clerk.com and create an account
2. Create a new application
3. Copy your **Publishable Key** from the dashboard
4. Copy your **Secret Key** for server-side usage

### 4. Update Environment Variables

**Frontend (.env.local):**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_API_URL=http://localhost:8000
```

**Backend (.env):**
```env
CLERK_SECRET_KEY=sk_test_your_secret_key_here
DATABASE_URL=sqlite:///./deepagent.db
# ... other existing vars
```

### 5. Initialize Database
The database will be created automatically when the backend starts. The SQLite file will be at `./deepagent.db`.

### 6. Run the Application

**Backend:**
```bash
cd backend
source .venv/bin/activate
python main.py
```

**Frontend (in a new terminal):**
```bash
cd frontend
npm run dev
```

---

## 📊 Database Schema

### Users Table
```
- id (UUID)
- clerk_id (from Clerk)
- email
- name
- created_at
- updated_at
```

### Workspaces Table
```
- id (UUID)
- user_id (Clerk user ID)
- name
- space_id (URL-friendly ID)
- created_at
- updated_at
```

---

## 🔄 User Flow

1. **Unauthenticated Users:**
   - See landing page with features
   - Can sign up or sign in via Clerk

2. **Authenticated Users:**
   - Redirected to `/workspaces` dashboard
   - Can create new workspaces
   - Can open existing workspaces
   - Each workspace opens at `/?space_id=workspace-123`

3. **Workspace Usage:**
   - Once in a workspace, the full agent chat is available
   - All agent operations are tied to that workspace

---

## 🔐 Authentication Details

- **Frontend:** Uses Clerk's React hooks (`useUser()`, `useAuth()`)
- **Backend:** Verifies JWT tokens from Clerk
- **Token Verification:** Extracts user ID from JWT claims
- **Authorization:** All workspace endpoints require valid Clerk token

---

## 📝 API Endpoints

### Workspaces
- `GET /workspaces` - List all workspaces for user
- `POST /workspaces` - Create new workspace
- `GET /workspaces/{id}` - Get specific workspace
- `DELETE /workspaces/{id}` - Delete workspace

All endpoints require `Authorization: Bearer <token>` header

---

## 🐛 Troubleshooting

### "VITE_CLERK_PUBLISHABLE_KEY is undefined"
- Check that `.env.local` exists in frontend directory
- Ensure key is set correctly
- Restart dev server after adding env vars

### "Invalid token" errors
- Verify Clerk secret key is set in backend .env
- Check token format in Authorization header
- Ensure token hasn't expired

### SQLite errors
- Check database permissions
- Ensure `DATABASE_URL` is correct
- Database file will be created automatically in project root

---

## 🎯 Next Steps

1. Configure Clerk with your domain
2. Customize sign-in/sign-up flows in Clerk Dashboard
3. Add additional user profile fields if needed
4. Deploy to production with proper environment variables
5. Update CORS origins for production domain

---

Generated: 2026-05-17
