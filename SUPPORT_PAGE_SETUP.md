# Support Page Setup Guide

## Overview
A support page has been added to course-caddy.com that allows users to submit issues, bug reports, and feature requests directly to support@course-caddy.com.

## Files Created/Modified

### New Files
- **support.html** - Complete support page with contact form

### Modified Files
- **index.html** - Added "Submit Support Request" button and footer link
- **sitemap.xml** - Updated with support page and corrected domain URLs

## How the Contact Form Works

The form uses **FormSubmit.co**, a free form backend service that handles form submissions and emails them to you.

### First-Time Setup Required

**IMPORTANT:** The first time someone submits the form, FormSubmit will send a **confirmation email** to support@course-caddy.com. You MUST click the confirmation link in that email to activate the form.

Steps:
1. Go to https://course-caddy.com/support.html
2. Fill out the form with test data
3. Submit the form
4. Check support@course-caddy.com inbox
5. Click the confirmation link in the FormSubmit email
6. Form is now active and will forward all submissions to your email

### Form Features

**User Input Fields:**
- Name (required)
- Email (required) - for follow-up responses
- Type of Request (required) - dropdown with options:
  - Bug Report
  - Feature Request / Suggestion
  - Technical Support
  - General Question
  - Other
- Device & OS (optional) - helpful for bug reports
- App Version (optional) - found in About tab
- Message (required) - detailed description

**Form Configuration:**
- Honeypot spam protection enabled
- CAPTCHA disabled for better UX
- Custom email subject: "New Course Caddy Support Request"
- Professional "box" template for emails

### What You'll Receive

Each submission will arrive at support@course-caddy.com with:
- Subject: "New Course Caddy Support Request"
- All form fields neatly formatted
- User's email for direct reply
- Timestamp of submission

## Design

The support page matches your existing site design:
- Golf course background (same as homepage)
- Green gradient header (#2c5f2d to #97bc62)
- Professional form styling with focus states
- Mobile responsive
- Clear instructions and helpful tips

## Access Points

Users can access the support page from:
1. **Homepage** - "Submit Support Request" button in Contact section
2. **Footer** - "Support" link on all pages
3. **Direct URL** - https://course-caddy.com/support.html
4. **App** - Support URL in About tab links to this page

## Alternative: Custom Backend (Future Enhancement)

If you want more control, you could replace FormSubmit with:
- Custom PHP script
- Netlify Forms (if hosting on Netlify)
- AWS Lambda + API Gateway
- SendGrid/Mailgun API

But FormSubmit.co is:
- ✅ Free
- ✅ No backend coding needed
- ✅ Works on static hosting (GitHub Pages, Netlify, etc.)
- ✅ GDPR compliant
- ✅ Reliable and maintained

## Testing

After confirming your email with FormSubmit:
1. Visit https://course-caddy.com/support.html
2. Fill out and submit the form
3. Verify email arrives at support@course-caddy.com within 1-2 minutes
4. Reply to test email to ensure user receives response

## Deployment

To deploy these changes:
```bash
cd "/Users/jeremy/Downloads/course-caddy-website"
git push origin main
```

If using GitHub Pages, the site will update automatically within a few minutes.

## Notes

- The form sends emails instantly (no delay)
- You can reply directly to the user's email from your inbox
- FormSubmit keeps no copy of the data (privacy-friendly)
- Rate limited to prevent spam abuse
- All submissions are from your own domain (course-caddy.com)
