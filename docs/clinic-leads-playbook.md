# Clinic leads playbook (nazarbanai.com)

One goal for the whole ecosystem: **find clinics that need nazarbanai.com**, a CRM and
lead engine that takes Instagram leads to real clinic customers.

```
daily clinic question (Quorum) -> shown to clinic owners (stories, LinkedIn, DMs)
  -> they answer -> "Run a skin clinic?" card -> nazarbanai.com -> form -> your call
```

Quorum's players are a general audience, so the game opens conversations and shows you
understand the problem. Leads come from getting the question in front of clinics.

Items in [brackets] need a true fact from you. Nothing here invents features, numbers,
customers or results; do not add any.

---

## 1. The offer (decide this first)

A form converts only when it offers something concrete. One option:

> Free Instagram lead check: we look at how your clinic handles Instagram DMs and show you
> where enquiries are going cold.

Use it only if you can really deliver it. Offer: **[YOUR OFFER]**

## 2. Clinic landing page copy (nazarbanai.com/clinics)

**Headline:** Your Instagram brings enquiries. How many become patients?

**Subhead:** Nazarban is a CRM and lead engine that takes Instagram leads to real clinic
customers. [One true sentence on how it works.]

**Three problems clinics will recognise** (no statistics):
- The 11 p.m. message that waits until morning.
- The enquiry that asked about price and never heard back.
- The patient who booked, then didn't show up.

**Form:** Clinic name, Instagram handle, WhatsApp number. Button: **[Get my free lead check]**
(use your offer). Under the form: "We'll contact you about this request only."

When the page is live, set `CLINIC_LANDING_PATH = "/clinics"` in `frontend/src/lib/nazarban.ts`
and redeploy; every in-game link then follows.

## 3. Outreach messages

Send by hand; keep it to a few dozen a day. Bulk-DM tools risk getting the account restricted.
Check current UAE rules on unsolicited marketing messages and healthcare advertising before
scaling up (not verified here). Lead with the day's question, not the product.

**Instagram DM, first message** (use the day's real answer split once you have it):
> Hi [name], we run a daily game where four AIs debate real problems skin clinics face.
> Today's: "[game-ready question]". Curious how you handle it at [clinic]?

**After they reply:**
> Thanks, that's useful. We build a CRM and lead engine that takes Instagram leads to real
> clinic customers. [YOUR OFFER], want me to do one for [clinic]?

**One nudge, 3 days later, if no reply:**
> No pressure, [name]. Did the question land? Happy to share how the rest of the crowd answered.

**WhatsApp / email:** same three messages. Never send more than one nudge.

## 4. Warm network (highest-converting channel for a new product)

Add one line to the invitation message:

- **EN:** One more thing: do you know anyone who runs a skin clinic? An introduction would help us a lot.
- **FA:** یه چیز دیگه: کسی رو می‌شناسی که کلینیک پوست داره؟ یه معرفی خیلی بهمون کمک می‌کنه.
- **AR:** وشيء آخر: هل تعرف أحدًا يدير عيادة جلدية؟ تعريفك به سيساعدنا كثيرًا.

## 5. Daily 10 minutes

1. The 07:55 Dubai push brings the day's case.
2. Post the question as an Instagram story with a poll sticker, and on LinkedIn with the
   solution-bridge line.
3. Send the day's batch of DMs from the clinic list.

Tag every link, for example
`https://nazarbanai.com/?utm_source=instagram&utm_medium=story&utm_campaign=clinic_leads`
(use `linkedin`, `dm`, `whatsapp` for the other channels). In-game surfaces are already tagged
`postgame_card`, `app_footer`, `landing_footer`.

## 6. Weekly scorecard (every Monday)

| Number | This week |
| --- | --- |
| Clinics reached | |
| Replies | |
| Form submissions | |
| Demos booked | |

After two weeks with no submissions, change the offer before changing the channel.
