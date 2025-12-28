# Data Export & Backup Guide

## Overview

The Album Club Manager includes a comprehensive data export and backup system to protect your data and enable analysis in external tools like Excel or Google Sheets.

## Access

1. Go to the admin dashboard at `/admin`
2. Click the **"Data Export"** tab
3. Choose which data to export

## Export Options

### 1. Complete Backup (JSON)
**Recommended for regular backups**

- **Format**: JSON
- **Contains**: Everything (reviews, participants, weeks, RS 500 albums)
- **File size**: Larger (complete data with all relationships)
- **Best for**: Regular backups, data restoration
- **Frequency**: Weekly recommended

**What's included**:
```json
{
  "exportDate": "2025-12-27T...",
  "version": "1.0",
  "data": {
    "participants": [...],
    "weeks": [...],
    "reviews": [...],
    "rs500Albums": [...]
  },
  "stats": {
    "totalParticipants": 20,
    "totalWeeks": 15,
    "totalReviews": 245,
    "totalRS500Albums": 500
  }
}
```

### 2. Reviews Export
**Best for analyzing participant feedback**

- **Formats**: CSV or JSON
- **Contains**: All reviews with participant info, ratings, favorite tracks, comments
- **Best for**: Excel analysis, sentiment analysis, tracking trends

**CSV columns**:
- Week Number
- Participant Name & Email
- Contemporary Album, Artist, Rating, Favorite Track, Comments
- Classic Album, Artist, Rating, Favorite Track, Comments
- Submission timestamp

### 3. Participants Export
**Best for managing your email list**

- **Formats**: CSV or JSON
- **Contains**: Name, email, total reviews, created date
- **Best for**: Email list management, participation tracking

**CSV columns**:
- Name
- Email
- Total Reviews
- Created At

### 4. Week History Export
**Best for planning and analysis**

- **Formats**: CSV or JSON
- **Contains**: All weeks with album details, deadlines, average ratings
- **Best for**: Planning future weeks, analyzing album popularity

**CSV columns**:
- Week Number, Deadline
- Contemporary: Title, Artist, Year, Spotify URL
- Classic: Title, Artist, Year, Spotify URL, RS Rank
- Review Count, Avg Contemporary Rating, Avg Classic Rating

## API Endpoints

You can also access exports programmatically:

```bash
# Complete backup
GET /api/export/full

# Reviews (CSV or JSON)
GET /api/export/reviews?format=csv
GET /api/export/reviews?format=json

# Participants (CSV or JSON)
GET /api/export/participants?format=csv
GET /api/export/participants?format=json

# Weeks (CSV or JSON)
GET /api/export/weeks?format=csv
GET /api/export/weeks?format=json
```

## Backup Best Practices

### Recommended Schedule

- **Weekly**: Download complete backup (JSON)
- **Monthly**: Download reviews CSV for analysis
- **Before major changes**: Always backup first

### Storage Recommendations

1. **Cloud Storage**:
   - Google Drive
   - Dropbox
   - iCloud Drive
   - OneDrive

2. **Local Storage**:
   - External hard drive
   - NAS (Network Attached Storage)

3. **Version Control**:
   - Keep multiple versions (don't overwrite old backups)
   - Name files with dates: `album-club-backup-2025-12-27.json`

### Testing Your Backups

Periodically verify your backups:
1. Download a backup
2. Open and inspect the file
3. Verify all expected data is present
4. Ensure the file isn't corrupted

## Data Restoration

If you need to restore data:

1. **From JSON Backup**: The complete backup contains all data with IDs and relationships intact
2. **Manual Process**: Currently requires manual SQL insertion into Supabase
3. **Future Feature**: Automated restore functionality (planned)

## File Naming Convention

All exports use this naming format:
```
album-club-{type}-{date}.{format}
```

Examples:
- `album-club-backup-2025-12-27.json`
- `album-club-reviews-2025-12-27.csv`
- `album-club-participants-2025-12-27.json`

## Security Notes

- Exported files contain **sensitive data** (emails, reviews)
- Store securely and don't share publicly
- Delete old backups from unsecured locations
- Consider encrypting backups if storing in cloud

## Troubleshooting

### Export returns empty data
- Check that you have data in your database
- Verify you're logged in as admin

### Download fails
- Check browser console for errors
- Try a different browser
- Ensure stable internet connection

### CSV formatting issues in Excel
- Use "Import Data" instead of double-clicking
- Specify UTF-8 encoding if prompted
- Check delimiter settings (comma)

## Future Enhancements

Planned features:
- ⏳ Automated scheduled backups (daily/weekly)
- ⏳ One-click restore from backup
- ⏳ Backup to cloud storage (Google Drive, Dropbox)
- ⏳ Email notification when backup completes
- ⏳ Backup history tracking

## Support

For issues with data export:
1. Check the browser console for errors
2. Verify API endpoints are accessible
3. Contact support with error messages
