# Reminders & Notifications Map

> The complete list of automatic messages. Law: every notification is a byproduct of an event already recorded — no message ever requires new data entry. During the pilot these are sent manually per this schedule (WhatsApp/SMS); in the app they fire themselves.

## Care notifications (from daily-log events)
| Event (already recorded) | Trigger | Message to parent | Channel |
|---|---|---|---|
| Child signed in | At sign-in | "[Child] has arrived safely and is settling in. Have a blessed day!" | app/SMS |
| Nap started | Teacher logs nap start | "[Child] went down for a nap at [time]." | app |
| Nap ended | Teacher logs wake time | "[Child] woke at [time] after [duration] — slept [quality]." | app |
| Health observation flagged | Manager confirms | Call first, then written note (03 illness template) | phone |
| Child signed out | At sign-out | "[Child] was picked up at [time] by [name]. See today's update at 5:30!" | app/SMS |
| Daily update ready | 5:30pm | The daily update itself (03 template) | app |

## Money notifications (from ledger & invoice register)
| Event | Trigger | Message | Channel |
|---|---|---|---|
| Invoice issued | Friday (hourly) / 1st (fixed) | Invoice + one-line summary of hours attended | app/email |
| Payment received | Same day | Receipt + thank-you | app/SMS |
| Reminder — day 3 overdue | Auto | Friendly reminder (03 ladder, stage 1) | SMS |
| Reminder — day 10 | Auto | Direct reminder + offer to talk (stage 2) | SMS + call log |
| Reminder — day 21 | Auto-scheduled | Manager call + payment plan (stage 3) | phone |
| Late pickup fee added | At sign-out past closing | "A late-pickup fee of ___ was added per our rate card — details on your next invoice." | app |

## Operational notifications (internal)
| Event | To | Message |
|---|---|---|
| Daily logs incomplete at 4:15pm | Manager | List of missing logs by teacher |
| Unbilled hours at Friday close | Admin | Ledger rows without invoice |
| Aging >21 days | Owner (weekly report) | Family, amount, ladder stage |

## Tone rule
Money messages stay warm and factual — the same voice that tells them about naps tells them about balances. Never send a fee reminder in the same message as a child update.
