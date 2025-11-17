# Quick Fix for AWS 405 Error

The code is working correctly now - it's using `/api` path. The issue is **nginx on your AWS server** needs to be configured to forward `/api/*` requests to your backend.

## The Problem

- ✅ Your app is correctly calling: `http://13.204.181.209/api/auth/login`
- ❌ Nginx doesn't know what to do with `/api/*` requests
- ❌ Nginx returns: `405 Not Allowed`

## Quick Fix Steps

### Step 1: Check Current Nginx Config

SSH into your AWS server and check what nginx config is currently active:

```bash
ssh user@13.204.181.209
cat /etc/nginx/sites-available/default
# OR
cat /etc/nginx/nginx.conf
```

### Step 2: Add API Proxy Configuration

Edit your nginx config file:

```bash
# For Ubuntu/Debian
sudo nano /etc/nginx/sites-available/default

# OR for Amazon Linux
sudo nano /etc/nginx/nginx.conf
```

### Step 3: Find Your Server Block

Look for a block that looks like this:

```nginx
server {
    listen 80;
    server_name 13.204.181.209;  # or your domain
    
    root /path/to/your/app/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Step 4: Add API Proxy Location Block

**Add this BEFORE the `location /` block** (nginx processes locations in order):

```nginx
server {
    listen 80;
    server_name 13.204.181.209;
    
    root /path/to/your/app/dist;  # Update this path
    index index.html;
    
    # ADD THIS - API Proxy Configuration
    location /api/ {
        # Remove /api prefix and forward to backend
        rewrite ^/api/(.*)$ /api/$1 break;
        
        # Backend URL
        proxy_pass https://securityapp-backend.vercel.app;
        
        # Required headers
        proxy_http_version 1.1;
        proxy_set_header Host securityapp-backend.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers (if needed)
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        
        # Handle preflight OPTIONS requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # Static files - keep this as is
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Step 5: Test Nginx Configuration

```bash
sudo nginx -t
```

**If you see errors**, check:
- Did you include the semicolons `;` at the end of lines?
- Did you include closing braces `}` for each block?
- Did you update `root /path/to/your/app/dist;` to your actual path?

### Step 6: Reload Nginx

```bash
sudo nginx -s reload
# OR
sudo systemctl reload nginx
```

### Step 7: Test the API

Test from your AWS server:

```bash
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

If this works, the nginx config is correct!

## Common Issues

### Issue 1: "No route to host" or "Connection refused"

**Problem:** Nginx can't reach the backend

**Solution:** Check if backend is accessible:
```bash
curl -I https://securityapp-backend.vercel.app/api/auth/login
```

### Issue 2: Still getting 405

**Problem:** Nginx config not reloaded or wrong syntax

**Solution:**
1. Check nginx error log: `sudo tail -f /var/log/nginx/error.log`
2. Verify config syntax: `sudo nginx -t`
3. Make sure you reloaded: `sudo nginx -s reload`

### Issue 3: 502 Bad Gateway

**Problem:** Backend URL wrong or backend is down

**Solution:** Verify backend URL is correct:
```nginx
proxy_pass https://securityapp-backend.vercel.app;  # Make sure this is correct
```

### Issue 4: 404 Not Found

**Problem:** The rewrite rule is removing `/api` incorrectly

**Solution:** Use this rewrite instead:
```nginx
location /api/ {
    # Don't remove /api, just forward it
    proxy_pass https://securityapp-backend.vercel.app;
    proxy_set_header Host securityapp-backend.vercel.app;
    # ... rest of config
}
```

## Minimal Working Config

Here's a minimal config that should work:

```nginx
server {
    listen 80;
    server_name 13.204.181.209;
    
    root /var/www/html/dist;  # Change to your path
    index index.html;
    
    # API Proxy
    location /api/ {
        proxy_pass https://securityapp-backend.vercel.app;
        proxy_set_header Host securityapp-backend.vercel.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Allow POST requests
        proxy_method POST;
        proxy_method GET;
        
        # Handle CORS
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
            return 204;
        }
    }
    
    # Static files
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Verify It's Working

1. **Check nginx status:**
   ```bash
   sudo systemctl status nginx
   ```

2. **Test locally on server:**
   ```bash
   curl -X POST http://localhost/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test","password":"test"}'
   ```

3. **Check nginx access logs:**
   ```bash
   sudo tail -f /var/log/nginx/access.log
   ```

4. **Check nginx error logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

After these steps, your login should work! 🎉

