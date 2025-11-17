# Deployment Guide

This guide explains how to deploy the Security App to different platforms (Local Development, Vercel, and AWS).

## Environment Variables

The app uses `VITE_API_BASE_URL` to configure the backend API URL. This allows the same codebase to work across different deployment environments.

### Required Environment Variable

```
VITE_API_BASE_URL=https://securityapp-backend.vercel.app/api
```

## Local Development

### Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your backend URL (if different from default):
   ```
   VITE_API_BASE_URL=https://securityapp-backend.vercel.app/api
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

### How It Works

- The app uses `/api` proxy which is configured in `vite.config.js`
- Vite proxies all `/api/*` requests to the backend during development
- This avoids CORS issues when developing locally

## Vercel Deployment

### Setup

1. **Option 1: Environment Variables in Vercel Dashboard**
   - Go to your project settings in Vercel
   - Navigate to "Environment Variables"
   - Add: `VITE_API_BASE_URL` = `https://securityapp-backend.vercel.app/api`

2. **Option 2: Use vercel.json**
   - The `vercel.json` file already configures `/api` proxy rewrites
   - Requests to `/api/*` are automatically forwarded to the backend
   - No environment variable needed if using the default backend

### How It Works

- `vercel.json` rewrites `/api/*` to `https://securityapp-backend.vercel.app/api/*`
- The app detects Vercel hosts (`.vercel.app`) and uses `/api` proxy
- All API calls go through the same-origin proxy to avoid CORS

## AWS Deployment

### Setup

**CRITICAL: You must set the environment variable in your AWS environment.**

1. **Set Environment Variable in AWS:**
   - For AWS Amplify:
     - Go to App Settings → Environment Variables
     - Add: `VITE_API_BASE_URL` = `https://securityapp-backend.vercel.app/api`
   
   - For AWS Elastic Beanstalk:
     - Go to Configuration → Software → Environment properties
     - Add: `VITE_API_BASE_URL` = `https://securityapp-backend.vercel.app/api`
   
   - For AWS EC2/ECS:
     - Set in your deployment script or container configuration
     - Export: `export VITE_API_BASE_URL=https://securityapp-backend.vercel.app/api`

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Deploy the `dist` folder** to your AWS hosting service

### How It Works

- The app detects AWS hosts (not localhost or Vercel)
- It uses `VITE_API_BASE_URL` from environment variables
- API calls go directly to the backend URL (requires CORS to be enabled on backend)
- **If CORS is not configured on backend**, you'll need to set up a reverse proxy on AWS

### AWS Reverse Proxy (Optional)

If your backend doesn't allow CORS from your AWS domain, configure a reverse proxy:

**For AWS CloudFront + API Gateway:**
- Create an API Gateway that proxies to your backend
- Configure CloudFront to route `/api/*` to the API Gateway

**For AWS Amplify:**
- Use Amplify Rewrites (similar to vercel.json)
- Add redirects in `amplify.yml`:
  ```yaml
  redirects:
    - source: '/api/<*>'
      target: 'https://securityapp-backend.vercel.app/api/<*>'
      status: 200
      type: PROXY
  ```

## Environment Detection Logic

The app automatically detects the environment and uses the appropriate configuration:

```javascript
// Browser environment:
- localhost / 127.0.0.1 → Uses /api (Vite proxy)
- *.vercel.app → Uses /api (Vercel rewrite)
- Other hosts (AWS, etc.) → Uses VITE_API_BASE_URL if set, else /api

// Server-side (SSR):
- Always uses VITE_API_BASE_URL or fallback URL
```

## Files Involved

- `src/utils/api.js` - Main API configuration and URL resolution
- `vite.config.js` - Development proxy configuration
- `vercel.json` - Vercel rewrite rules
- `.env` - Local environment variables (not committed to git)
- `.env.example` - Template for environment variables

## Troubleshooting

### CORS Errors

**Problem:** "Access-Control-Allow-Origin header is missing"

**Solutions:**
1. Ensure `VITE_API_BASE_URL` is set correctly for AWS
2. Configure CORS on your backend to allow your frontend domain
3. Use a reverse proxy (like Vercel rewrites or AWS CloudFront)

### API Calls Not Working

1. Check that `VITE_API_BASE_URL` is set in your deployment environment
2. Verify the backend URL is correct and accessible
3. Check browser console for errors
4. Verify the hostname detection in `src/utils/api.js`

## All Pages Configured

These pages automatically use the centralized API configuration:
- ✅ `src/pages/AdminControl.jsx`
- ✅ `src/pages/VisitHistory.jsx`
- ✅ `src/pages/SocietyControl.jsx`
- ✅ `src/components/SignIn.jsx`

No code changes needed - they all use the `api` utility from `src/utils/api.js`.

