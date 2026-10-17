---
name: Manual payment photos
description: Manual-payment proof must be a photo, and gallery selection must survive background refreshes.
---

Manual-payment proof is a photo, not a PDF or another document. Offer a photo picker and validate the uploaded content as a photo as well.

**Why:** The user explicitly requested photos rather than files and reported that returning from photo selection repeatedly refreshed the payment page.

**How to apply:** Keep the current form, photo and entered information mounted while refreshing deposit settings in the background. Opening the mobile gallery can trigger visibility/focus refreshes; those events must not replace a populated form with a loading screen. Continue updating payment settings without resetting the user's input.
