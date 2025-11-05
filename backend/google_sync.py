# google_sync.py
from __future__ import print_function
import os
import pickle
import datetime
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# If modifying these scopes, delete token.pickle / token.json
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

CREDS_PATH = Path(__file__).parent / "credentials.json"   # download from GCP
TOKEN_PATH = Path(__file__).parent / "token.json"         # stored after first auth

def _get_creds():
    creds = None
    # Load existing token
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
    # If no valid creds, perform OAuth flow
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDS_PATH.exists():
                raise FileNotFoundError("credentials.json not found. Place it in the backend folder.")
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_PATH), SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open(TOKEN_PATH, "w") as token:
            token.write(creds.to_json())
    return creds

def add_to_google_calendar(title: str, remind_time_iso: str, duration_minutes: int = 30):
    """
    Create a simple calendar event at remind_time_iso (ISO 8601 string).
    Returns the created event's htmlLink.
    """
    creds = _get_creds()
    service = build('calendar', 'v3', credentials=creds)

    # parse ISO time and set end time
    start_dt = datetime.datetime.fromisoformat(remind_time_iso)
    end_dt = start_dt + datetime.timedelta(minutes=duration_minutes)

    event = {
        'summary': title,
        'start': {'dateTime': start_dt.isoformat(), 'timeZone': 'Asia/Kolkata'},
        'end': {'dateTime': end_dt.isoformat(), 'timeZone': 'Asia/Kolkata'},
        'reminders': {'useDefault': True},
    }

    created = service.events().insert(calendarId='primary', body=event).execute()
    link = created.get('htmlLink')
    print(f"✅ Google Calendar event created: {link}")
    return link
