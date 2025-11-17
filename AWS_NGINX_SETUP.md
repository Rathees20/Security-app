# AWS Nginx Reverse Proxy Setup Guide

This guide explains how to configure nginx on your AWS server to act as a reverse proxy for API requests, similar to how Vercel handles it.

## Why Use Nginx Proxy?

- **Avoids CORS issues**: All requests appear to come from the same origin
- **Consistent with development**: Uses `/api` path just like localhost and Vercel
- **Security**: Can add rate limiting, request filtering, etc.
- **Easy maintenance**: All routing in one place

## Step-by-Step Setup

### 1. Install Nginx (if not already installed)

```bash
# For Ubuntu/Debian
sudo apt update
sudo apt install nginx -y

# For Amazon Linux 2
sudo yum install nginx -y

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Backup Current Configuration

```bash
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
# OR if using main nginx.conf:
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
```

### 3. Update Nginx Configuration

**Option A: If using sites-available (Ubuntu/Debian)**

```bash
sudo nano /etc/nginx/sites-available/default
```

**Option B: If using main config file**

```bash
sudo nano /etc/nginx/nginx.conf
```

### 4. Add This Configuration

Replace the server block with the configuration from `nginx.conf.example`, making sure to:

1. **Update the server_name** with your IP address or domain:
   ```nginx
   server_name 13.204.181.209;  # Your AWS IP or domain
   ```

2. **Update the root path** to where your React app is deployed:
   ```nginx
   root /var/www/security-app/dist;  # Your actual deployment path
   ```

3. **Verify the backend URL** matches your backend:
   ```nginx
   proxy_pass https://securityapp-backend.vercel.app/api/;
   ```

### 5. Test Nginx Configuration

```bash
sudo nginx -t
```

If you see "syntax is ok" and "test is successful", proceed to the next step.

### 6. Reload Nginx

```bash
sudo nginx -s reload
# OR
sudo systemctl reload nginx
```

### 7. Update Your App Code

Since you're using nginx as a proxy, you need to change the API detection logic to use `/api` for IP addresses as well. The code should already handle this, but let's verify:

Check that `src/utils/api.js` includes IP addresses in the `/api` proxy detection.

### 8. Rebuild and Deploy Your App

```bash
# On your local machine or CI/CD
npm run build

# Copy the dist folder to your AWS server
scp -r dist/* user@13.204.181.209:/var/www/security-app/dist/
```

### 9. Verify It Works

1. Open your browser and go to `http://13.204.181.209`
2. Open browser DevTools (F12) → Network tab
3. Try to login
4. Check that API requests go to `http://13.204.181.209/api/auth/login` (not direct backend URL)
5. Verify the response is successful

## Troubleshooting

### 502 Bad Gateway

**Problem:** Nginx can't reach the backend

**Solutions:**
1. Check if backend URL is correct: `https://securityapp-backend.vercel.app/api`
2. Test backend connectivity:
   ```bash
   curl -I https://securityapp-backend.vercel.app/api/auth/login
   ```
3. Check nginx error logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

### 405 Method Not Allowed

**Problem:** Backend doesn't accept the request method

**Solutions:**
1. Verify the rewrite rule removes `/api` correctly:
   ```nginx
   rewrite ^/api/(.*)$ /$1 break;
   ```
2. Check that `proxy_pass` includes trailing slash:
   ```nginx
   proxy_pass https://securityapp-backend.vercel.app/api/;
   ```

### CORS Errors

**Problem:** Still getting CORS errors even with proxy

**Solutions:**
1. Uncomment the CORS headers in nginx config:
   ```nginx
   add_header 'Access-Control-Allow-Origin' '*' always;
   ```
2. Make sure OPTIONS requests are handled (already in the config)
3. Check browser console for specific CORS error messages

### Static Files Not Loading

**Problem:** React app assets (JS, CSS) return 404

**Solutions:**
1. Verify `root` path is correct:
   ```nginx
   root /var/www/security-app/dist;
   ```
2. Check file permissions:
   ```bash
   sudo chown -R www-data:www-data /var/www/security-app/dist
   sudo chmod -R 755 /var/www/security-app/dist
   ```
3. Ensure the location `/` block has `try_files`:
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

### Nginx Won't Start

**Problem:** Configuration syntax error

**Solutions:**
1. Check syntax:
   ```bash
   sudo nginx -t
   ```
2. Look at error messages - they'll tell you the line number
3. Check for missing semicolons, braces, or quotes

## Testing the Proxy

Test that nginx is forwarding requests correctly:

```bash
# Test API endpoint through nginx proxy
curl -X POST http://13.204.181.209/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Should forward to: https://securityapp-backend.vercel.app/api/auth/login
```

## Security Considerations

1. **Firewall**: Ensure only necessary ports are open (80, 443)
2. **HTTPS**: Use SSL/TLS certificates (Let's Encrypt is free)
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **Security Headers**: Add security headers in nginx config

## Optional: Enable HTTPS

1. Install Certbot:
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   ```

2. Get certificate:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. Follow the prompts and certbot will automatically configure HTTPS

## Summary

After completing these steps:
- ✅ API requests use `/api` path (consistent with dev/Vercel)
- ✅ Nginx forwards `/api/*` to your backend
- ✅ No CORS issues (same-origin requests)
- ✅ All pages work: AdminControl, VisitHistory, SocietyControl, SignIn

Your app should now work exactly like it does on Vercel and localhost!

