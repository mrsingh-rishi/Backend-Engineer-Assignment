# 🚀 Easy Deployment Guide

## Option 1: Render (Recommended - Free & Easy)

### Step 1: Prepare Repository
1. Copy the entire `production/` folder to a new GitHub repository
2. Make sure `server.js`, `package.json`, and `README.md` are in the root

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign up (free)
2. Click "New +" → "Web Service"
3. Connect your GitHub account and select your repository
4. Configure:
   - **Name**: `food-delivery-api`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (sufficient for testing)

### Step 3: Deploy
- Click "Create Web Service"
- Render will automatically deploy and give you a live URL!

## Option 2: Railway (Alternative Free Option)

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. From the `production/` directory: `railway up`

## Option 3: Vercel (Serverless)

1. Install Vercel CLI: `npm install -g vercel`
2. From the `production/` directory: `vercel --prod`

## ✅ After Deployment

1. Your API will be live at: `https://your-app.onrender.com`
2. Test with: `https://your-app.onrender.com/health`
3. Update your Postman collection with the new base URL

## 🔧 Environment Setup

No environment variables required! The app works out of the box.

## 📞 Support

If you encounter issues:
1. Check the deployment logs
2. Ensure `package.json` has correct start script
3. Verify Node.js version is 16+ in deployment settings
