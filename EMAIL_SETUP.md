# Email Setup Guide

## Quick Setup (5 minutes)

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up with your email
3. Verify your email address

### 2. Get API Key

1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it "Album Club"
4. Copy the API key (starts with `re_`)

### 3. Add to Environment Variables

Add these to your `.env.local` file:

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL="Album Club <noreply@yourdomain.com>"
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

**Note**: Replace `yourdomain.com` with your actual domain.

### 4. Verify Your Domain (Optional but Recommended)

**For Production:**
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records Resend provides to your domain registrar
5. Wait for verification (usually 5-15 minutes)

**For Testing:**
- You can send emails from `onboarding@resend.dev` without domain verification
- These will go to spam, but work for testing

### 5. Update Your From Email

Once domain is verified, update `.env.local`:

```bash
RESEND_FROM_EMAIL="Mike from Album Club <mike@yourdomain.com>"
```

## How to Use

### Send Week Email

1. Go to Admin Dashboard → Week Management tab
2. Fill out the week details (albums, deadline, etc.)
3. Click **Save Week**
4. Click **Preview Email** to see what participants will receive
5. Click **📧 Send Email** to send to all participants

### What Participants Receive

Each participant gets a personalized email with:
- Subject: `Album Club – Week X`
- Previous week's results (if available)
- This week's album details with Spotify links
- **Personalized review link** with their email pre-filled
- Response deadline

### Example Email

```
Subject: Album Club – Week 5

Hi John,

=== Week 4 Results ===

🔊 Contemporary: 8.5/10 (12 reviews)
   Favorite tracks:
   • Nikes – Sarah
   • Pink + White – Mike
   • Solo – Alex

💿 Classic: 9.2/10 (11 reviews)
   Favorite tracks:
   • What's Going On – John
   • Mercy Mercy Me – Lisa
   • Inner City Blues – Tom

---

Here are the picks for this week:

🔊 Contemporary: Blonde – Frank Ocean (2016)
Listen: https://open.spotify.com/album/...

💿 Classic (RS 500): What's Going On – Marvin Gaye (1971) [Rank #1]
Listen: https://open.spotify.com/album/...

Please rate each album on a 1.0–10.0 scale and share any quick thoughts.

Submit your review here:
https://yourdomain.com/submit?email=john@example.com

Responses by: Friday, January 10

- Mike
```

## Pricing

**Resend Pricing:**
- Free: 3,000 emails/month, 100 emails/day
- Pro: $20/month for 50,000 emails/month

For a typical album club with 20 participants:
- 1 week = 20 emails
- 52 weeks = 1,040 emails/year
- **Free tier is more than enough!**

## Troubleshooting

### Emails Going to Spam

**Solution**: Verify your domain in Resend
- Without verification, emails from `onboarding@resend.dev` often go to spam
- With verification, deliverability is excellent

### Error: "RESEND_API_KEY is not defined"

**Solution**: Make sure you:
1. Added `RESEND_API_KEY` to `.env.local`
2. Restarted your development server (`npm run dev`)

### Error: "No participants found"

**Solution**:
1. Go to Participants tab
2. Add participants or import from CSV

### Testing Before Sending to Everyone

**Option 1**: Test with yourself first
1. Create a test participant with your email
2. Send the week email
3. Check that it looks good
4. Delete the test participant
5. Add real participants and send again

**Option 2**: Use a different week number for testing
1. Save week as "Week 999" for testing
2. Send test emails
3. Once confirmed, use the real week number

## Support

- Resend Docs: https://resend.com/docs
- Resend Support: support@resend.com
- Check Resend dashboard for delivery stats and logs
