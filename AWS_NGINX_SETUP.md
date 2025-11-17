# AWS Nginx Reverse Proxy Setup

This guide will help you set up an nginx reverse proxy on your AWS server to handle `/api` requests, avoiding CORS issues.

## Problem

When deploying to AWS, the app calls the backend directly, which causes CORS errors if the backend doesn't allow requests from your AWS domain/IP.

## Solution

Configure nginx to proxy `/api` requests to the backend (similar to how Vercel handles it). This makes all requests appear to come from the same origin, eliminating CORS issues.

## Prerequisites

- AWS EC2 instance with nginx installed
- Root/sudo access to the server
- Your React app built and deployed

## Steps

### 1. Install Nginx (if not already installed)

```bash
sudo apt update
sudo apt install nginx -y
```

### 2. Build Your React App

On your local machine or CI/CD:
```bash
npm run build
```

### 3. Upload Build Files to AWS

Upload the `dist` folder to your AWS server (e.g., `/var/www/security-app/dist`):

```bash
# Example using scp
scp -r dist/* user@13.204.181.209:/var/www/security-app/dist/
```

### 4. Configure Nginx

1. **Create nginx configuration file:**

   ```bash
   sudo nano /etc/nginx/sites-available/security-app
   ```

2. **Copy the configuration from `nginx.conf.example`** (adjust paths and domain as needed)

3. **Enable the site:**

   ```bash
   sudo ln -s /etc/nginx/sites-available/security-app /etc/nginx/sites-enabled/
   ```

4. **Remove default site (optional):**

   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```

5. **Test nginx configuration:**

   ```bash
   sudo nginx -t
   ```

6. **Reload nginx:**

   ```bash
   sudo systemctl reload nginx
   ```

### 5. Update Firewall Rules

Ensure ports 80 (HTTP) and 443 (HTTPS) are open:

```bash
# For AWS Security Group
# Add inbound rules:
# - Type: HTTP, Port: 80, Source: 0.0.0.0/0
# - Type: HTTPS, Port: 443, Source: 0.0.0.0/0
```

Or using ufw (if installed):
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

### 6. Update API Configuration

**IMPORTANT:** Update `src/utils/api.js` to use `/api` for AWS as well, since nginx will now proxy it.

Update the code to check for IP addresses and use `/api`:

```javascript
// For IP addresses, also use /api (since nginx will proxy it)
if (isIPAddress) {
  return '/api';  // nginx will proxy this to the backend
}
```

Actually, wait - let me check the current code. If you set up the nginx proxy, you should use `/api` for AWS too.

## Alternative: Quick Fix Without Nginx

If you can't set up nginx immediately, you can:

1. **Enable CORS on your backend** to allow requests from `http://13.204.181.209`

2. **Or use a different approach** - Update the code to detect if we're on AWS and use a different strategy

## Verification

After setup, test:

1. Visit `http://13.204.181.209` - should see your app
2. Check browser console - API calls should go to `/api/auth/login`
3. Check nginx logs: `sudo tail -f /var/log/nginx/access.log`
4. Try logging in - should work without CORS errors

## Troubleshooting

### Nginx not starting
```bash
sudo systemctl status nginx
sudo journalctl -xe
```

### Permission denied errors
```bash
sudo chown -R www-data:www-data /var/www/security-app
sudo chmod -R 755 /var/www/security-app
```

### 502 Bad Gateway
- Check backend URL is correct in nginx config
- Check backend is accessible: `curl https://securityapp-backend.vercel.app/api/auth/login`

### Still getting CORS errors
- Verify nginx proxy is working: `curl http://13.204.181.209/api/auth/login`
- Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`

