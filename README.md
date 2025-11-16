# Course Caddy Website

Simple, professional website for Course Caddy LLC to support Apple Developer account application.

## Files Included
- `index.html` - Main homepage
- `privacy-policy.html` - Privacy policy page (required by Apple)
- `styles.css` - Stylesheet for both pages
- `README.md` - This file

## Setup Instructions for GitHub Pages

### Step 1: Create GitHub Repository
1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right and select "New repository"
3. Name it `course-caddy-website` (or any name you prefer)
4. Make it **Public**
5. Click "Create repository"

### Step 2: Upload Files
1. Click "uploading an existing file"
2. Drag and drop these 3 files:
   - `index.html`
   - `privacy-policy.html`
   - `styles.css`
3. Click "Commit changes"

### Step 3: Enable GitHub Pages
1. Go to your repository Settings
2. Scroll down to "Pages" in the left sidebar
3. Under "Source", select "Deploy from a branch"
4. Under "Branch", select `main` and `/ (root)`
5. Click "Save"
6. Wait 2-3 minutes for your site to build

### Step 4: Connect Your Domain (course-caddy.com)
1. In GitHub Pages settings, you'll see a box for "Custom domain"
2. Enter `course-caddy.com`
3. Click "Save"
4. Check "Enforce HTTPS" (after DNS propagates)

### Step 5: Update Your Domain DNS
Go to your domain registrar (where you bought course-caddy.com) and add these DNS records:

**For apex domain (course-caddy.com):**
- Type: `A`
- Name: `@`
- Value: `185.199.108.153`

Add three more A records with these IPs:
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

**For www subdomain (optional but recommended):**
- Type: `CNAME`
- Name: `www`
- Value: `your-github-username.github.io`

### Step 6: Verify
1. Wait 10-30 minutes for DNS to propagate
2. Visit `https://course-caddy.com`
3. Your site should be live!

## For Apple Developer Enrollment
Your website includes all required elements:
- ✅ Company name and address
- ✅ Business description
- ✅ Contact information
- ✅ Privacy policy
- ✅ Professional appearance

## Need Help?
If you run into issues:
1. Check GitHub Pages documentation: https://docs.github.com/en/pages
2. Verify DNS settings with: https://dnschecker.org
3. Contact support@course-caddy.com

## Future Updates
To update your website:
1. Edit the files locally
2. Go to your GitHub repository
3. Click on the file you want to update
4. Click the pencil icon to edit
5. Make changes and commit

Your site will automatically update within a few minutes.
