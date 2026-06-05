# 🔐 Environment Variables Quick Reference

## Render Backend Environment Variables

```bash
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:password@ep-xxxxx.us-east-1.neon.tech/dbname
JWT_SECRET=your-random-secure-key-here
JWT_EXPIRE=7d
CORS_ORIGIN=https://your-netlify-app.netlify.app
JUDGE0_API_BASE_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your-rapidapi-key-here
JUDGE0_HOST=judge0-ce.p.rapidapi.com
```

## Netlify Frontend Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://mentor-session-backend.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://mentor-session-backend.onrender.com
NODE_VERSION=18.17.0
```

---

## 🔧 How to Generate Values

### JWT_SECRET (Backend)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and paste in Render environment variables.

### DATABASE_URL (Backend)

For detailed Neon database setup and connection string configuration, see:

`docs/NEON_DATABASE_SETUP.md`

Format:

`postgresql://[user]:[password]@[host]/[dbname]`

### JUDGE0_API_KEY (Backend)
1. Go to https://rapidapi.com
2. Search "Judge0"
3. Click Subscribe (free tier)
4. Copy "X-RapidAPI-Key" from API keys section

### CORS_ORIGIN (Backend)
This is your Netlify frontend URL:
- After deploying on Netlify, you'll get: `https://xxxx.netlify.app`
- Use that exact URL (with `https://`, no trailing slash)
- Add to Render environment variables

---

## ✅ Deployment URLs

Once deployed, you'll have:

**Backend (Render)**:
```
https://mentor-session-backend.onrender.com
```

**Frontend (Netlify)**:
```
https://your-app-name.netlify.app
```

**Test Backend**:
```bash
curl https://mentor-session-backend.onrender.com/api/health
# Should return: {"status":"ok"}
```

**Test Login**:
```bash
curl -X POST https://mentor-session-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john_mentor@example.com","password":"password123"}'
```

---

## 📝 Setup Checklist

### Before Deployment
- [ ] Git repository pushed to GitHub
- [ ] All files committed (no uncommitted changes)
- [ ] .env files are NOT in git (check .gitignore)

### Create Accounts
- [ ] Neon account (https://neon.tech)
- [ ] Render account (https://render.com)
- [ ] Netlify account (https://netlify.com)
- [ ] RapidAPI account (https://rapidapi.com)

### Get Values
- [ ] DATABASE_URL from Neon
- [ ] JWT_SECRET generated
- [ ] JUDGE0_API_KEY from RapidAPI

### Deploy Backend
- [ ] Push render.yaml to GitHub
- [ ] Deploy on Render
- [ ] Set all 9 environment variables
- [ ] Test health endpoint
- [ ] Copy backend URL

### Deploy Frontend
- [ ] Push netlify.toml to GitHub
- [ ] Deploy on Netlify
- [ ] Set NEXT_PUBLIC_API_URL to backend URL
- [ ] Wait for build to complete
- [ ] Copy frontend URL

### Final Step
- [ ] Update CORS_ORIGIN on Render with frontend URL
- [ ] Test login and video functionality
- [ ] Check browser console for errors

---

## 🚀 One-Line Setup Summary

1. **Create Neon DB** → Get `DATABASE_URL`
2. **Generate JWT** → `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. **Get Judge0 Key** → From RapidAPI
4. **Deploy on Render** → Use render.yaml, set 9 env vars
5. **Deploy on Netlify** → Use netlify.toml, set 3 env vars
6. **Update CORS** → Add Netlify URL to Render
7. **Test Everything** → Open frontend, login, test video

---

## 📞 Quick Support

**Render Won't Deploy?**
- Check logs: Dashboard → Select service → Logs
- Ensure package.json is in root directory
- Verify NODE_VERSION is 18+

**Frontend Won't Connect?**
- Check CORS_ORIGIN matches Netlify URL exactly
- Verify NEXT_PUBLIC_API_URL is correct
- Check browser console (F12) for errors

**Database Connection Failed?**
- Verify DATABASE_URL is correct
- Check IP allowlist on Neon (set to 0.0.0.0/0)
- Test locally first: `npm run migrate:seed`

**Video Not Working?**
- Both must be HTTPS (automatic on Render/Netlify)
- Check Debug panel: 🔧 Debug button in video
- Run: `window.videoDebug.report()` in console

